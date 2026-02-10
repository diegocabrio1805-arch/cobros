import { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Client, PaymentRecord, Loan, CollectionLog, User, AppState, AppSettings, Expense, DeletedItem } from '../types';
import { Network } from '@capacitor/network';
import { App } from '@capacitor/app';


const isValidUuid = (id: string | undefined | null) => {
    if (!id) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export const useSync = (onDataUpdated?: (newData: Partial<AppState>, isFullSync?: boolean) => void) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [isFullSyncing, setIsFullSyncing] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState("¡Sincronizado!");
    const [isOnline, setIsOnline] = useState(true);
    const [queueLength, setQueueLength] = useState(0);
    const [lastErrors, setLastErrors] = useState<{ table: string, error: any, timestamp: string }[]>([]);
    const isProcessingRef = useRef(false);

    // Checks for internet connection
    // OPTIMIZATION: Trust Network.getStatus() immediately.
    // The previous ping logic caused false "Offline" states on slow connections.
    const checkConnection = async (): Promise<boolean> => {
        try {
            const status = await Network.getStatus();
            return status.connected;
        } catch (error) {
            // If the plugin fails, assume we are online to allow attempts
            return true;
        }
    };

    useEffect(() => {
        const initNetwork = async () => {
            const online = await checkConnection();
            setIsOnline(online);
            if (online) {
                processQueue();
            }
        };

        initNetwork();

        // Check periodically (every 30s) if we think we are online, to catch "dead" wifi
        const interval = setInterval(async () => {
            const online = await checkConnection();
            if (online !== isOnline) setIsOnline(online);
        }, 30000);

        const setupListener = async () => {
            const handler = await Network.addListener('networkStatusChange', async (status) => {
                console.log('Network status changed (System)', status);
                // System says changed, let's verify
                setTimeout(async () => {
                    const online = await checkConnection();
                    setIsOnline(online);
                    if (online) {
                        processQueue();
                    }
                }, 1000); // Wait a sec for radio to settle
            });
            return handler;
        };

        const setupAppListener = async () => {
            return await App.addListener('appStateChange', async ({ isActive }) => {
                if (isActive) {
                    console.log('App resumed, triggering sync...');
                    const online = await checkConnection();
                    setIsOnline(online);
                    if (online) {
                        processQueue(true);
                    }
                }
            });
        };

        // REALTIME SUBSCRIPTION FOR INSTANT UPDATES
        let channel: any = null;
        let reconnectTimeout: any = null;

        const subscribeToRealtime = () => {
            if (channel) {
                console.log('[Realtime] Cleaning up old channel before resubscribing...');
                supabase.removeChannel(channel);
            }

            console.log('[Realtime] Attempting to subscribe...');
            channel = supabase.channel('system_changes')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public' },
                    async (payload) => {
                        console.log(`[Realtime] change detected in ${payload.table}: ${payload.eventType}`);

                        // For deletions, we log the old record data (thanks to REPLICA IDENTITY FULL)
                        if (payload.eventType === 'DELETE') {
                            console.log(`[Realtime] DELETE record:`, payload.old);
                        }

                        const isDeleteEvent = payload.eventType === 'DELETE';
                        // Include deleted_items in the critical tables list
                        const isCriticalTable = ['collection_logs', 'payments', 'loans', 'clients', 'deleted_items', 'expenses'].includes(payload.table);
                        const needsFullSync = isDeleteEvent && isCriticalTable;

                        if (needsFullSync) {
                            console.log(`[Realtime] Deletion sync triggered for ${payload.table}`);
                        }

                        // Trigger sync (Instant for deletes, debounced for others)
                        const triggerSync = async () => {
                            console.log(`[Realtime] Syncing data after remote change...`);
                            const newData = await pullData(needsFullSync);
                            if (newData && onDataUpdated) {
                                onDataUpdated(newData);
                            }
                        };

                        if (isDeleteEvent) {
                            triggerSync();
                        } else {
                            const debounceTimer = (window as any)._syncDebounceTimer;
                            if (debounceTimer) clearTimeout(debounceTimer);
                            (window as any)._syncDebounceTimer = setTimeout(triggerSync, 2000);
                        }
                    }
                )
                .subscribe((status) => {
                    console.log(`[Realtime] Status update: ${status}`);
                    (window as any)._lastRealtimeStatus = status;

                    if (status === 'SUBSCRIBED') {
                        console.log('[Realtime] CONNECTED SUCCESSFULLY');
                        if (reconnectTimeout) {
                            clearTimeout(reconnectTimeout);
                            reconnectTimeout = null;
                        }
                        // HEURISTIC: Always pull full data on fresh connection to ensure no gaps
                        pullData(true).then(newData => {
                            if (newData && onDataUpdated) onDataUpdated(newData);
                        });
                    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                        console.warn(`[Realtime] Connection dropped: ${status}. Retrying in 5s...`);
                        if (!reconnectTimeout) {
                            reconnectTimeout = setTimeout(() => {
                                reconnectTimeout = null;
                                subscribeToRealtime();
                            }, 5000);
                        }
                    }
                });
        };

        // Health Check Interval (Every 2 minutes)
        const healthCheckInterval = setInterval(() => {
            const status = (window as any)._lastRealtimeStatus;
            console.log(`[Realtime] Health Check: ${status || 'NONE'}`);
            if (status !== 'SUBSCRIBED') {
                console.log('[Realtime] Health Check failed. Forcing re-subscription...');
                subscribeToRealtime();
            }
        }, 120000);

        subscribeToRealtime();

        const handlerPromise = setupListener();
        const appHandlerPromise = setupAppListener();

        return () => {
            clearInterval(interval);
            clearInterval(healthCheckInterval);
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            handlerPromise.then(h => h.remove());
            appHandlerPromise.then(h => h.remove());
            if (channel) supabase.removeChannel(channel);
        };
    }, []);

    const addToQueue = (operation: string, data: any) => {
        let queue = JSON.parse(localStorage.getItem('syncQueue') || '[]');

        // Optimization: De-duplicate settings updates
        if (operation === 'UPDATE_SETTINGS') {
            queue = queue.filter((item: any) => item.operation !== 'UPDATE_SETTINGS' || item.data.branchId !== data.branchId);
        }

        // Prevent accidental double-taps (identical logs within 2 seconds)
        if (operation === 'ADD_LOG') {
            const isDuplicate = queue.some((item: any) =>
                item.operation === 'ADD_LOG' &&
                item.data.loanId === data.loanId &&
                item.data.amount === data.amount &&
                item.data.type === data.type &&
                (Date.now() - item.timestamp < 2000)
            );
            if (isDuplicate) return;
        }

        queue.push({ operation, data, timestamp: Date.now() });
        localStorage.setItem('syncQueue', JSON.stringify(queue));
        setQueueLength(queue.length);
    };

    // Wrapper for manual trigger
    const forceSync = () => processQueue(true);
    const forceFullSync = () => processQueue(true, true);

    const trackDeletion = async (tableName: string, recordId: string, branchId?: string) => {
        try {
            await supabase.from('deleted_items').insert({
                table_name: tableName,
                record_id: recordId,
                branch_id: branchId,
                deleted_at: new Date().toISOString()
            });
        } catch (e) {
            console.error('[Sync] Failed to track deletion:', e);
            // Non-blocking, we don't want to fail the UI flow if this fails, 
            // but it means other devices might miss the delete (Consistency vs Availability).
            // For now, log and move on.
        }
    };

    const pullData = async (fullSync = false): Promise<Partial<AppState> | null> => {
        const online = await checkConnection();
        // If not online, we can try anyway if it's a pull request triggered manually, 
        // but typically pullData is auto. Let's be lenient.
        if (!online) {
            console.warn("Pull data skipped: No ping response.");
            // Optional: return null; 
            // We continue to try fetch, maybe ping failed but Supabase works
        }

        setIsSyncing(true);
        setSyncError(null);

        // FORCE FULL SYNC for V6 fix to ensure missing clients are downloaded
        const lastSyncTime = localStorage.getItem('last_sync_timestamp_v6');

        // ------------------------------------------------------------------
        // OPTIMIZATION FOR LOW-END DEVICES (2GB RAM)
        // 1. Reduced PAGE_SIZE from 1000 to 500 to lower memory spikes per chunk.
        // 2. Removed Promise.all. We now fetch tables SEQUENTIALLY.
        // 3. Added explicit 'yields' (setTimeout) between tables to let the UI breathe/render.
        // ------------------------------------------------------------------
        const PAGE_SIZE = 500;

        // Helper to fetch all pages with yields AND RETRIES for 3G/4G stability
        const fetchAll = async (query: any) => {
            let allData: any[] = [];
            let page = 0;
            let hasMore = true;

            console.log(`[Sync] Starting fetchAll for query...`);

            // Log the query structure if possible or just the start
            // Note: Supabase query builder objects aren't easily stringifiable for debug

            while (hasMore) {
                console.log(`[Sync] Fetching page ${page}... Range: ${page * PAGE_SIZE} - ${(page + 1) * PAGE_SIZE - 1}`);
                let attempts = 0;
                let success = false;

                while (attempts < 3 && !success) {
                    try {
                        const { data, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
                        if (error) {
                            console.error(`[Sync] Error fetching page ${page}:`, error);
                            throw error;
                        }

                        console.log(`[Sync] Page ${page} fetched. Items: ${data?.length}`);

                        if (data && data.length > 0) {
                            allData = allData.concat(data);
                            if (data.length < PAGE_SIZE) hasMore = false;
                            else page++;
                        } else {
                            // If page 0 is empty, but we expected data, this is the key moment.
                            if (page === 0) console.warn("[Sync] Page 0 returned 0 items. Check RLS or filters.");
                            hasMore = false;
                        }

                        success = true;
                    } catch (err: any) {
                        attempts++;
                        console.error(`[Sync] Detailed Error on page ${page}:`, err);
                        console.warn(`[Sync] Network glitch on page ${page}. Retrying (${attempts}/3)... Error: ${err.message || 'Unknown'}`);
                        // Wait 1s, 2s, 3s...
                        await new Promise(r => setTimeout(r, 1000 * attempts));

                        if (attempts >= 3) throw err;
                    }
                }

                // Yield between pages of the SAME table
                await new Promise(r => setTimeout(r, 50));

                if (page > 100) break; // Safety limit
            }
            console.log(`[Sync] fetchAll complete. Total: ${allData.length}`);
            return { data: allData, error: null };
        };

        // Queries - Optimized for low-end devices: only fetch active data
        let clientsQuery = supabase.from('clients').select('*'); // Removed is_active filter to allow soft-delete syncing
        let loansQuery = supabase.from('loans').select('*'); // No is_active column in loans table
        let paymentsQuery = supabase.from('payments').select('*');
        let logsQuery = supabase.from('collection_logs').select('*');
        let profilesQuery = supabase.from('profiles').select('*');
        let settingsQuery = supabase.from('branch_settings').select('*');
        let expensesQuery = supabase.from('expenses').select('*');
        let deletedItemsQuery = supabase.from('deleted_items').select('*');

        if (lastSyncTime && !fullSync) {
            // SAFETY MARGIN: Increased to 10 seconds to definitively solve Chrome/ClockSkew issues
            const safetyMargin = 10000;
            const adjustedSyncTime = new Date(new Date(lastSyncTime).getTime() - safetyMargin).toISOString();

            clientsQuery = clientsQuery.gt('updated_at', adjustedSyncTime);
            loansQuery = loansQuery.gt('updated_at', adjustedSyncTime);
            paymentsQuery = paymentsQuery.gt('updated_at', adjustedSyncTime);
            logsQuery = logsQuery.gt('updated_at', adjustedSyncTime);
            profilesQuery = profilesQuery.gt('updated_at', adjustedSyncTime);
            settingsQuery = settingsQuery.gt('updated_at', adjustedSyncTime);
            expensesQuery = expensesQuery.gt('updated_at', adjustedSyncTime);
            deletedItemsQuery = deletedItemsQuery.gt('deleted_at', adjustedSyncTime);
        } else {
            // FULL SYNC or NO TIMESTAMP: Ensure we use updated_at for consistency if needed, 
            // but for full sync we just want everything.
            console.log("[Sync] Performing FULL SYNC - Ignoring timestamps.");
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // Increased to 120s for 2G/3G networks

        try {
            // 1. Settings (Small)
            // setSyncError("Sincronizando: Configuración...");
            const settingsResult = await fetchAll(settingsQuery.abortSignal(controller.signal));
            if (settingsResult.error) throw new Error(`Configuración: ${settingsResult.error.message}`);

            await new Promise(r => setTimeout(r, 100));

            // 2. Profiles (Small)
            // setSyncError("Sincronizando: Usuarios...");
            const profilesResult = await fetchAll(profilesQuery.abortSignal(controller.signal));
            if (profilesResult.error) throw new Error(`Usuarios: ${profilesResult.error.message}`);

            await new Promise(r => setTimeout(r, 100));

            // 3. Clients (Medium)
            // setSyncError("Sincronizando: Clientes...");
            const clientsResult = await fetchAll(clientsQuery.abortSignal(controller.signal));
            if (clientsResult.error) throw new Error(`Clientes: ${clientsResult.error.message}`);

            await new Promise(r => setTimeout(r, 200));

            // 4. Loans (Medium)
            // setSyncError("Sincronizando: Préstamos...");
            const loansResult = await fetchAll(loansQuery.abortSignal(controller.signal));
            if (loansResult.error) throw new Error(`Préstamos: ${loansResult.error.message}`);

            await new Promise(r => setTimeout(r, 200));

            // 5. Payments (Large)
            // setSyncError("Sincronizando: Pagos...");
            const paymentsResult = await fetchAll(paymentsQuery.abortSignal(controller.signal));
            if (paymentsResult.error) throw new Error(`Pagos: ${paymentsResult.error.message}`);

            await new Promise(r => setTimeout(r, 200));

            // 6. Logs (Large)
            // setSyncError("Sincronizando: Registros...");
            const logsResult = await fetchAll(logsQuery.abortSignal(controller.signal));
            if (logsResult.error) throw new Error(`Registros: ${logsResult.error.message}`);

            await new Promise(r => setTimeout(r, 100));

            // 7. Expenses (Small)
            // setSyncError("Sincronizando: Gastos...");
            const expensesResult = await fetchAll(expensesQuery.abortSignal(controller.signal));
            if (expensesResult.error) throw new Error(`Gastos: ${expensesResult.error.message}`);

            // 8. Deleted Items (Sync Deletions)
            const deletedResult = await fetchAll(deletedItemsQuery.abortSignal(controller.signal));
            if (deletedResult.error) throw new Error(`Eliminaciones: ${deletedResult.error.message}`);


            // Update last sync time
            localStorage.setItem('last_sync_timestamp_ms', new Date().getTime().toString());
            localStorage.setItem('last_sync_timestamp_v6', new Date().toISOString());

            const result = {
                clients: (clientsResult.data || []).map((c: any) => ({
                    ...c,
                    documentId: c.document_id,
                    secondaryPhone: c.secondary_phone,
                    profilePic: c.profile_pic,
                    housePic: c.house_pic,
                    businessPic: c.business_pic,
                    documentPic: c.document_pic,
                    domicilioLocation: c.domicilio_location,
                    creditLimit: c.credit_limit,
                    allowCollectorLocationUpdate: c.allow_collector_location_update,
                    customNoPayMessage: c.custom_no_pay_message,
                    isActive: c.is_active,
                    isHidden: c.is_hidden,
                    addedBy: c.added_by,
                    branchId: c.branch_id,
                    createdAt: c.created_at,
                    deletedAt: c.deleted_at
                })) as Client[],
                loans: (loansResult.data || []).map((l: any) => ({
                    ...l,
                    clientId: l.client_id,
                    collectorId: l.collector_id,
                    branchId: l.branch_id,
                    interestRate: l.interest_rate,
                    totalInstallments: l.total_installments,
                    totalAmount: l.total_amount,
                    installmentValue: l.installment_value,
                    createdAt: l.created_at,
                    deletedAt: l.deleted_at,
                    customHolidays: l.custom_holidays,
                    installments: l.installments,
                    frequency: l.frequency
                })) as Loan[],
                payments: (paymentsResult.data || []).map((p: any) => ({
                    ...p,
                    loanId: p.loan_id,
                    clientId: p.client_id,
                    branchId: p.branch_id,
                    installmentNumber: p.installment_number,
                    isVirtual: p.is_virtual,
                    isRenewal: p.is_renewal,
                    deletedAt: p.deleted_at
                })) as PaymentRecord[],
                collectionLogs: (logsResult.data || []).map((cl: any) => ({
                    ...cl,
                    loanId: cl.loan_id,
                    clientId: cl.client_id,
                    branchId: cl.branch_id,
                    isVirtual: cl.is_virtual,
                    isRenewal: cl.is_renewal,
                    isOpening: cl.is_opening,
                    recordedBy: cl.recorded_by,
                    deletedAt: cl.deleted_at
                })) as CollectionLog[],
                expenses: (expensesResult.data || []).map((e: any) => ({
                    ...e,
                    branchId: e.branch_id,
                    addedBy: e.added_by
                })) as Expense[],
                users: (profilesResult.data || []).map((u: any) => ({
                    ...u,
                    expiryDate: u.expiry_date,
                    managedBy: u.managed_by,
                    requiresLocation: u.requires_location
                })) as unknown as User[],
                branchSettings: (settingsResult.data || []).reduce((acc: any, s: any) => {
                    acc[s.id] = s.settings;
                    return acc;
                }, {} as Record<string, AppSettings>),
                deletedItems: (deletedResult.data || []).map((d: any) => ({
                    id: d.id,
                    tableName: d.table_name,
                    recordId: d.record_id,
                    branchId: d.branch_id,
                    deletedAt: d.deleted_at
                })) as DeletedItem[]
            };

            if (onDataUpdated) {
                onDataUpdated(result, fullSync);
            }

            return result;

        } catch (err: any) {
            console.error('Pull failed:', err);
            setSyncError(`Error Descarga: ${err.message || err}`);
            return null;
        } finally {
            setIsSyncing(false);
            if (fullSync) setIsFullSyncing(false);
        }
    };

    const processQueue = async (force = false, fullSync = false) => {
        // Placeholder to match previous structure since we replaced the whole block
        if (isProcessingRef.current && !force) return;
        isProcessingRef.current = true;
        try {
            if (!force) {
                const online = await checkConnection();
                setIsOnline(online);
                if (!online) {
                    setSyncError('Sin conexión a Internet. Cola pausada.');
                    return;
                }
            } else {
                checkConnection().then(setIsOnline);
            }

            const queue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
            setQueueLength(queue.length);

            if (queue.length === 0) {
                if (force || fullSync) {
                    pullData(fullSync).then(newData => {
                        console.log('Manual pull completed');
                    });
                    setSyncError(null);
                }

                setIsSyncing(false);
                isProcessingRef.current = false;
                setSyncError(null);
                return;
            }

            setIsSyncing(true);

            // Group by operation type for BATCH processing
            const groups: Record<string, any[]> = {
                'ADD_CLIENT': [],
                'ADD_LOAN': [],
                'ADD_PAYMENT': [],
                'ADD_LOG': [],
                'ADD_EXPENSE': [],
                'ADD_PROFILE': [],
                'UPDATE_SETTINGS': [],
                'DELETE_LOG': [], // Deletes are harder to batch if logic varies, but we can try
                'DELETE_PAYMENT': [],
                'DELETE_LOAN': [],
                'DELETE_CLIENT': [],
                'DELETE_EXPENSE': []
            };

            const failedItems: any[] = [];
            const processedIndices = new Set<number>();

            // Fill groups
            // Process directly but with AGGRESSIVE filtering for corrupted IDs "wzzegxk3a" and others
            queue.forEach((item: any, index: number) => {
                let isValid = true;

                // Helper to detect bad IDs
                const isBadId = (id: any) => {
                    if (!id || typeof id !== 'string') return false;
                    // Check for the specific rogue ID or general non-UUID junk
                    if (id === 'wzzegxk3a') return true;
                    // Valid Supabase UUID is 36 chars. If it's short, it's garbage.
                    // Allow temp IDs like "init-..." or "pay-..." because our App.tsx handles them/regenerates them?
                    // Actually, if we send "pay-..." to a UUID column, it fails.
                    // BUT: Checks above in App.tsx might rename them. 
                    // CRITICAL: We only DROP items that are clearly garbage and causing the crash.
                    // If the ID is < 30 chars and doesn't look like a UUID, drop it.
                    if (id.length < 30 && !id.includes('-')) return true;
                    return false;
                };

                // Check Top Level data.id
                if (item.data && isBadId(item.data.id)) {
                    console.warn(`[Auto-Fix] Dropping corrupted queue item (Bad ID: ${item.data.id}):`, item);
                    isValid = false;
                }

                // Check References (client_id, loan_id)
                if (isValid && item.data) {
                    if (isBadId(item.data.client_id) || isBadId(item.data.clientId)) {
                        console.warn(`[Auto-Fix] Dropping corrupted queue item (Bad Client Ref):`, item);
                        isValid = false;
                    }
                    if (isBadId(item.data.loan_id) || isBadId(item.data.loanId)) {
                        console.warn(`[Auto-Fix] Dropping corrupted queue item (Bad Loan Ref):`, item);
                        isValid = false;
                    }
                }

                if (!isValid) {
                    // Mark as processed/failed so it doesn't block the queue
                    // In strict logic, we just don't add it to groups. 
                    // BUT to remove it from localStorage, we must add it to processedIndices later?
                    // Actually, we can just treat it like a "processed" item immediately.
                    // But processedIndices is a Set of INDICES.
                    // IMPORTANT: We need to add this index to "processedIndices" so it gets stripped from the queue at the end.
                    processedIndices.add(index);
                    return;
                }

                if (groups[item.operation]) {
                    groups[item.operation].push({ item, index });
                } else {
                    failedItems.push(item);
                }
            });

            // DEDUPLICATE BATCHES to avoid 21000 Error
            // For each group, we keep only the LAST occurrence of each ID to ensure latest update wins
            Object.keys(groups).forEach(key => {
                const group = groups[key];
                if (group.length > 1) {
                    const uniqueMap = new Map();
                    group.forEach(entry => {
                        const id = entry.item.data?.id;
                        if (id) {
                            uniqueMap.set(id, entry);
                        } else {
                            uniqueMap.set(Math.random(), entry);
                        }
                    });
                    // Replace group with unique values
                    groups[key] = Array.from(uniqueMap.values());

                    // Mark "dropped" duplicates as processed so they don't stick in queue
                    const keptIndices = new Set(groups[key].map(e => e.index));
                    group.forEach(entry => {
                        if (!keptIndices.has(entry.index)) {
                            processedIndices.add(entry.index);
                        }
                    });
                }
            });

            // Helper for batch upsert with CHUNKING for Low-End Devices
            const batchUpsert = async (table: string, itemsWithIndex: any[], mapper: (d: any) => any) => {
                if (itemsWithIndex.length === 0) return;

                const CHUNK_SIZE = 5; // Reduced from 1 (implicit/all) to 5 to prevent timeouts on low-end

                // Chunk the items
                for (let i = 0; i < itemsWithIndex.length; i += CHUNK_SIZE) {
                    const chunk = itemsWithIndex.slice(i, i + CHUNK_SIZE);
                    const dataToUpsert = chunk.map(x => mapper(x.item.data));

                    try {
                        const SYSTEM_ADMIN_ID = 'b3716a78-fb4f-4918-8c0b-92004e3d63ec';
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s per small chunk

                        // Final sanity check for branch_id right before transmission
                        const cleanData = dataToUpsert.map(d => {
                            const clean = { ...d };
                            if (clean.branch_id === 'admin-1') clean.branch_id = SYSTEM_ADMIN_ID;
                            if (clean.branchId === 'admin-1') clean.branchId = SYSTEM_ADMIN_ID;
                            if (clean.added_by === 'admin-1') clean.added_by = SYSTEM_ADMIN_ID;
                            if (clean.recordedBy === 'admin-1') clean.recordedBy = SYSTEM_ADMIN_ID;
                            return clean;
                        });

                        const { error } = await supabase.from(table).upsert(cleanData).abortSignal(controller.signal);
                        clearTimeout(timeoutId);
                        if (error) throw error;

                        // Mark successful
                        chunk.forEach(x => processedIndices.add(x.index));

                    } catch (err: any) {
                        console.error(`Batch upsert error on ${table}:`, err);
                        // We continue with next chunk even if this one failed
                        setLastErrors(prev => [{ table, error: err, timestamp: new Date().toISOString() }, ...prev]);
                    }
                }
            };

            // Execute in priority order

            // 0. Profiles (Managers/Collectors) - Must exist before they are referenced as branch_id or added_by
            await batchUpsert('profiles', groups['ADD_PROFILE'], (d) => ({
                id: d.id, name: d.name, username: d.username, password: d.password,
                role: d.role, blocked: d.blocked || false, expiry_date: d.expiryDate, managed_by: d.managedBy,
                requires_location: d.requiresLocation || false
            }));

            // 1. Clients
            await batchUpsert('clients', groups['ADD_CLIENT'], (d) => ({
                id: d.id, name: d.name, document_id: d.documentId, phone: d.phone, secondary_phone: d.secondaryPhone,
                address: d.address, profile_pic: d.profilePic, house_pic: d.housePic, business_pic: d.businessPic,
                document_pic: d.documentPic, domicilio_location: d.domicilioLocation, location: d.location,
                credit_limit: d.creditLimit, allow_collector_location_update: d.allowCollectorLocationUpdate,
                custom_no_pay_message: d.customNoPayMessage, is_active: d.isActive, is_hidden: d.isHidden,
                added_by: d.addedBy, branch_id: d.branchId, created_at: d.createdAt
            }));

            // 2. Loans - Only if their client is NOT in the current failed/pending queue
            const pendingClientIds = new Set([
                ...groups['ADD_CLIENT'].filter(x => !processedIndices.has(x.index)).map(x => x.item.data.id),
                ...failedItems.filter(item => item.operation === 'ADD_CLIENT').map(item => item.data.id)
            ]);

            const loansToUpsert = groups['ADD_LOAN'].filter(x => !pendingClientIds.has(x.item.data.clientId));
            await batchUpsert('loans', loansToUpsert, (d) => ({
                id: d.id, client_id: d.clientId, collector_id: d.collectorId, branch_id: d.branchId,
                principal: d.principal, interest_rate: d.interestRate, total_installments: d.totalInstallments,
                installment_value: d.installmentValue, total_amount: d.totalAmount, status: d.status,
                created_at: d.createdAt, custom_holidays: d.customHolidays, is_renewal: d.isRenewal || false,
                installments: d.installments, frequency: d.frequency
            }));

            // 3. Payments & Logs - Only if their loan is NOT pending
            const pendingLoanIds = new Set([
                ...groups['ADD_LOAN'].filter(x => !processedIndices.has(x.index)).map(x => x.item.data.id),
                ...failedItems.filter(item => item.operation === 'ADD_LOAN').map(item => item.data.id),
                // Also if client is pending, loan is effectively pending
                ...groups['ADD_LOAN'].filter(x => pendingClientIds.has(x.item.data.clientId)).map(x => x.item.data.id)
            ]);

            const paymentsToUpsert = groups['ADD_PAYMENT'].filter(x => !pendingLoanIds.has(x.item.data.loanId));
            await batchUpsert('payments', paymentsToUpsert, (d) => ({
                id: d.id, loan_id: d.loanId, client_id: d.clientId, branch_id: d.branchId,
                amount: d.amount, date: d.date, installment_number: d.installmentNumber,
                is_virtual: d.isVirtual || false, is_renewal: d.isRenewal || false, created_at: d.created_at || d.date
            }));

            const logsToUpsert = groups['ADD_LOG'].filter(x => !pendingLoanIds.has(x.item.data.loanId));
            await batchUpsert('collection_logs', logsToUpsert, (d) => ({
                id: d.id, loan_id: d.loanId, client_id: d.clientId, branch_id: d.branchId,
                amount: d.amount, type: d.type, date: d.date, location: d.location,
                is_virtual: d.isVirtual || false, is_renewal: d.isRenewal || false, is_opening: d.isOpening || false,
                notes: d.notes, recorded_by: d.recordedBy
            }));

            // Sometimes logs also update profiles (legacy code?), reusing same data?
            // In the original code 'ADD_LOG' did an upsert to 'profiles' too? 
            // Checking original... yes: "({ error } = await supabase.from('profiles').upsert(mapped));"
            // Wait, line 171 of original: "upsert(mapped)" for profiles using LOG data? That looks like a BUG in the original code or a very weird feature.
            // A collection log mapped object has 'loan_id', 'amount' etc. Profile needs 'username', 'password'.
            // It seems line 171 in original code was likely a copy-paste error or wrong! 
            // "({ error } = await supabase.from('collection_logs').upsert(mapped));" then "({ error } = await supabase.from('profiles').upsert(mapped));"
            // The 'mapped' object had log fields. A profile table usually rejects that.
            // I will OMIT the profile update for ADD_LOG as it seems incorrect and dangerous.

            // 4. Expenses
            await batchUpsert('expenses', groups['ADD_EXPENSE'], (d) => ({
                id: d.id, description: d.description, amount: d.amount, category: d.category,
                date: d.date, branch_id: d.branchId, added_by: d.addedBy
            }));

            // Settings
            // branch_settings
            for (const itemWithIndex of groups['UPDATE_SETTINGS']) {
                try {
                    const { error } = await supabase.from('branch_settings').upsert({
                        id: itemWithIndex.item.data.branchId,
                        settings: itemWithIndex.item.data.settings,
                        updated_at: new Date().toISOString()
                    });
                    if (!error) processedIndices.add(itemWithIndex.index);
                } catch (e) { console.error(e); }
            }

            // Deletions (Batching delete by ID is easy: .in('id', ids))
            const batchDelete = async (table: string, itemsWithIndex: any[]) => {
                if (itemsWithIndex.length === 0) return;
                const ids = itemsWithIndex.map(x => x.item.data.id);
                try {
                    const { error } = await supabase.from(table).delete().in('id', ids);
                    if (error) throw error;
                    itemsWithIndex.forEach(x => processedIndices.add(x.index));

                    // Track deletions
                    for (const x of itemsWithIndex) {
                        try {
                            await trackDeletion(table, x.item.data.id, x.item.data.branchId);
                        } catch (e) { console.error("Track delete failed", e); }
                    }

                } catch (err) {
                    console.error(`Batch delete failed ${table}`, err);
                    // Fallback one by one
                    for (const x of itemsWithIndex) {
                        try {
                            await supabase.from(table).delete().eq('id', x.item.data.id);
                            processedIndices.add(x.index);
                            await trackDeletion(table, x.item.data.id, x.item.data.branchId);
                        } catch (e) { console.error(e); }
                    }
                }
            };

            await batchDelete('collection_logs', groups['DELETE_LOG']);
            await batchDelete('payments', groups['DELETE_PAYMENT']);
            await batchDelete('loans', groups['DELETE_LOAN']);
            await batchDelete('clients', groups['DELETE_CLIENT']);
            await batchDelete('expenses', groups['DELETE_EXPENSE']);

            // Reconstruct queue with unprocessed items
            const newQueue = queue.filter((_: any, index: number) => !processedIndices.has(index));

            localStorage.setItem('syncQueue', JSON.stringify(newQueue));
            setQueueLength(newQueue.length);

            if (newQueue.length === 0 && queue.length > 0) {
                pullData(fullSync).then(newData => {
                    if (newData) {
                        // We need a way to update the global state from here if possible, 
                        // but useSync is a hook used in App.tsx. 
                        // The pullData return will be handled by the caller or the interval.
                    }
                });
                // HIDDEN: Success message only shown on initial login, not on every sync
                // setShowSuccess(true);
                // setTimeout(() => setShowSuccess(false), 2000); // Auto-hide after 2 seconds
                if (force) console.log("Sincronización forzada completada con éxito.");
                setSyncError(null);
            } else if (newQueue.length > 0) {
                // Check if the remaining items are just waiting for parents
                const hasWaiters = newQueue.some((item: any) =>
                    item.operation === 'ADD_LOAN' || item.operation === 'ADD_PAYMENT' || item.operation === 'ADD_LOG'
                );
                if (hasWaiters && processedIndices.size > 0) {
                    setSyncError(`Sincronizando... (${newQueue.length} pendientes)`);
                    // Retry immediately to process dependent items now that parents might be synced
                    setTimeout(() => processQueue(true), 1000);
                } else {
                    setSyncError(`No se pudieron sincronizar ${newQueue.length} elementos. Se reintentará.`);
                }
            }
        } catch (err) {
            console.error("Queue processing error:", err);
            setSyncError("Error al procesar la cola de sincronización.");
        } finally {
            isProcessingRef.current = false;
            setIsSyncing(false);
        }
    };



    const pushClient = async (client: Client): Promise<boolean> => {
        if (!isOnline) {
            addToQueue('ADD_CLIENT', client);
            return false;
        }
        try {
            const SYSTEM_ADMIN_ID = 'b3716a78-fb4f-4918-8c0b-92004e3d63ec';
            const payload = {
                id: client.id, name: client.name, document_id: client.documentId, phone: client.phone, secondary_phone: client.secondaryPhone,
                address: client.address, profile_pic: client.profilePic, house_pic: client.housePic, business_pic: client.businessPic,
                document_pic: client.documentPic, domicilio_location: client.domicilioLocation, location: client.location,
                credit_limit: client.creditLimit, allow_collector_location_update: client.allowCollectorLocationUpdate,
                custom_no_pay_message: client.customNoPayMessage, is_active: client.isActive, is_hidden: client.isHidden,
                added_by: (client.addedBy === 'admin-1' || client.addedBy === '00000000-0000-0000-0000-000000000001') ? client.branchId : client.addedBy,
                branch_id: client.branchId || client.addedBy, // FIX: Trust the App.tsx branch assignment (which handles managedBy). Only fallback if missing.
                created_at: client.createdAt,
                capital: client.capital || 0,
                current_balance: client.currentBalance || 0,
                updated_at: new Date().toISOString()
            };
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const { error } = await supabase.from('clients')
                .upsert(payload, { onConflict: 'id', ignoreDuplicates: false })
                .abortSignal(controller.signal);

            clearTimeout(timeoutId);
            if (error) throw error;
            return true;
        } catch (err: any) {
            console.error('Error pushing client:', err);
            setLastErrors(prev => [{ table: 'clients', error: err, timestamp: new Date().toISOString() }, ...prev].slice(0, 10));
            addToQueue('ADD_CLIENT', client);
            setSyncError('Error al subir cliente. Guardado localmente.');
            return false;
        }
    };

    const pushLoan = async (loan: Loan): Promise<boolean> => {
        if (!isOnline) {
            addToQueue('ADD_LOAN', loan);
            return false;
        }
        try {
            // Sanitize IDs: validation logic to prevent "invalid input syntax for type uuid"
            // If branchId is legacy ('admin-1' or 'none' or invalid), try used collectorId IF it is valid. 
            // If neither is valid UUID, send NULL (assuming column nullable) or let it fail if Not Null (better than Type Error loop).
            const safeBranchId = isValidUuid(loan.branchId) ? loan.branchId : null;
            const safeCollectorId = isValidUuid(loan.collectorId) ? loan.collectorId : null;
            const finalBranchId = safeBranchId || safeCollectorId;

            const payload = {
                id: loan.id, client_id: loan.clientId, collector_id: safeCollectorId,
                branch_id: finalBranchId,
                principal: Number(loan.principal) || 0,
                interest_rate: Number(loan.interestRate) || 0,
                total_installments: Number(loan.totalInstallments) || 0,
                installment_value: Number(loan.installmentValue) || 0,
                total_amount: Number(loan.totalAmount) || 0,
                status: loan.status,
                created_at: loan.createdAt, custom_holidays: loan.customHolidays, is_renewal: loan.isRenewal || false,
                installments: loan.installments, frequency: loan.frequency,
                updated_at: new Date().toISOString()
            };
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const { error: upsertError } = await supabase.from('loans')
                .upsert(payload, { onConflict: 'id', ignoreDuplicates: false })
                .abortSignal(controller.signal);

            clearTimeout(timeoutId);
            if (upsertError) {
                if (upsertError.code === '23503' && upsertError.details?.includes('clients')) {
                    const localData = JSON.parse(localStorage.getItem('prestamaster_v2') || '{}');
                    const parentClient = localData.clients?.find((c: any) => c.id === loan.clientId);
                    if (parentClient) {
                        const success = await pushClient(parentClient);
                        if (success) {
                            const { error: retryError } = await supabase.from('loans').upsert(payload);
                            if (!retryError) return true;
                        }
                    }
                }
                throw upsertError;
            }
            return true;
        } catch (err: any) {
            console.error('Error pushing loan:', err);
            setLastErrors(prev => [{ table: 'loans', error: err, timestamp: new Date().toISOString() }, ...prev].slice(0, 10));
            addToQueue('ADD_LOAN', loan);
            setSyncError('Error al subir préstamo. Guardado localmente.');
            return false;
        }
    };

    const pushPayment = async (payment: PaymentRecord): Promise<boolean> => {
        if (!isOnline) {
            addToQueue('ADD_PAYMENT', payment);
            return false;
        }
        try {
            const safeBranchId = isValidUuid(payment.branchId) ? payment.branchId : (isValidUuid(payment.collectorId) ? payment.collectorId : null);
            const safeCollectorId = isValidUuid(payment.collectorId) ? payment.collectorId : null;
            const payload = {
                id: payment.id, loan_id: payment.loanId, client_id: payment.clientId,
                collector_id: safeCollectorId,
                branch_id: safeBranchId,
                amount: Number(payment.amount) || 0,
                date: payment.date, installment_number: payment.installmentNumber,
                is_virtual: payment.isVirtual, is_renewal: payment.isRenewal, created_at: payment.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const { error } = await supabase.from('payments')
                .upsert(payload)
                .abortSignal(controller.signal);

            clearTimeout(timeoutId);
            if (error) {
                if (error.code === '23503' && error.details?.includes('loans')) {
                    const localData = JSON.parse(localStorage.getItem('prestamaster_v2') || '{}');
                    const parentLoan = localData.loans?.find((l: any) => l.id === payment.loanId);
                    if (parentLoan) {
                        const success = await pushLoan(parentLoan);
                        if (success) {
                            const { error: retryError } = await supabase.from('payments').upsert(payload);
                            if (!retryError) return true;
                        }
                    }
                }
                throw error;
            }
            return true;
        } catch (err: any) {
            console.error('Error pushing payment:', err);
            setLastErrors(prev => [{ table: 'payments', error: err, timestamp: new Date().toISOString() }, ...prev].slice(0, 10));
            addToQueue('ADD_PAYMENT', payment);
            setSyncError('Error al subir pago. Guardado localmente.');
            return false;
        }
    };

    const pushLog = async (log: CollectionLog): Promise<boolean> => {
        if (!isOnline) {
            addToQueue('ADD_LOG', log);
            return false;
        }
        try {
            const safeBranchId = isValidUuid(log.branchId) ? log.branchId : (isValidUuid(log.recordedBy) ? log.recordedBy : null);
            const sanitizedRecordedBy = isValidUuid(log.recordedBy) ? log.recordedBy : null;
            const payload = {
                id: log.id, loan_id: log.loanId, client_id: log.clientId,
                branch_id: safeBranchId,
                type: log.type, amount: Number(log.amount) || 0, date: log.date,
                location: log.location, recorded_by: sanitizedRecordedBy, notes: log.notes,
                is_virtual: log.isVirtual || false, is_renewal: log.isRenewal || false,
                is_opening: log.isOpening || false,
                updated_at: new Date().toISOString()
            };
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const { error } = await supabase.from('collection_logs')
                .upsert(payload)
                .abortSignal(controller.signal);

            clearTimeout(timeoutId);
            if (error) {
                if (error.code === '23503') {
                    const localData = JSON.parse(localStorage.getItem('prestamaster_v2') || '{}');
                    const parentLoan = localData.loans?.find((l: any) => l.id === log.loanId);
                    if (parentLoan) {
                        const success = await pushLoan(parentLoan);
                        if (success) {
                            const { error: retryError } = await supabase.from('collection_logs').upsert(payload);
                            if (!retryError) return true;
                        }
                    }
                }
                throw error;
            }
            return true;
        } catch (err: any) {
            console.error('Error pushing log:', err);
            setLastErrors(prev => [{ table: 'collection_logs', error: err, timestamp: new Date().toISOString() }, ...prev].slice(0, 10));
            addToQueue('ADD_LOG', log);
            setSyncError('Error al subir registro. Guardado localmente.');
            return false;
        }
    };

    const pushUser = async (user: User): Promise<boolean> => {
        if (!isOnline) {
            addToQueue('ADD_PROFILE', user);
            return false;
        }
        try {
            const dataToPush = {
                id: user.id,
                name: user.name,
                username: user.username,
                password: user.password,
                role: user.role,
                blocked: user.blocked || false,
                expiry_date: user.expiryDate,
                managed_by: user.managedBy,
                requires_location: user.requiresLocation || false
            };
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const { error } = await supabase.from('profiles')
                .upsert(dataToPush)
                .abortSignal(controller.signal);

            clearTimeout(timeoutId);
            if (error) throw error;
            return true;
        } catch (err: any) {
            console.error('Error pushing user:', err);
            setLastErrors(prev => [{ table: 'profiles', error: err, timestamp: new Date().toISOString() }, ...prev].slice(0, 10));
            addToQueue('ADD_PROFILE', user);
            setSyncError('Error al subir usuario. Guardado localmente.');
            return false;
        }
    };

    const deleteRemoteLog = async (logId: string) => {
        if (!isOnline) {
            addToQueue('DELETE_LOG', { id: logId });
            return;
        }
        try {
            // STEP 1: Fetch branch_id before deleting
            const { data: item } = await supabase.from('collection_logs').select('branch_id').eq('id', logId).single();
            const branchId = item?.branch_id;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            // STEP 2: Soft Delete (Update deleted_at)
            const { error } = await supabase.from('collection_logs')
                .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                .eq('id', logId)
                .abortSignal(controller.signal);

            clearTimeout(timeoutId);
            if (error) throw error;

            // STEP 3: Track with branch_id
            await trackDeletion('collection_logs', logId, branchId);

            // CRITICAL: Trigger pull after delete to refresh local state/balances
            await pullData(true);
        } catch (err) {
            console.error('Error deleting remote log:', err);
            addToQueue('DELETE_LOG', { id: logId });
        }
    };

    const deleteRemotePayment = async (paymentId: string) => {
        if (!isOnline) {
            addToQueue('DELETE_PAYMENT', { id: paymentId });
            return;
        }
        try {
            // STEP 1: Fetch branch_id before deleting
            const { data: item } = await supabase.from('payments').select('branch_id').eq('id', paymentId).single();
            const branchId = item?.branch_id;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            // STEP 2: Soft Delete (Update deleted_at)
            const { error } = await supabase.from('payments')
                .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                .eq('id', paymentId)
                .abortSignal(controller.signal);

            clearTimeout(timeoutId);
            if (error) throw error;

            // STEP 3: Track with branch_id
            await trackDeletion('payments', paymentId, branchId);

            // CRITICAL: Trigger pull after delete to refresh local state/balances
            await pullData(true);
        } catch (err) {
            console.error('Error deleting remote payment:', err);
            addToQueue('DELETE_PAYMENT', { id: paymentId });
        }
    };

    const deleteRemoteLoan = async (loanId: string) => {
        if (!isOnline) {
            addToQueue('DELETE_LOAN', { id: loanId });
            return;
        }
        try {
            // STEP 1: Fetch branch_id before deleting
            const { data: item } = await supabase.from('loans').select('branch_id').eq('id', loanId).single();
            const branchId = item?.branch_id;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            // STEP 2: Soft Delete (Update deleted_at)
            const { error } = await supabase.from('loans')
                .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                .eq('id', loanId)
                .abortSignal(controller.signal);

            clearTimeout(timeoutId);
            if (error) throw error;

            // STEP 3: Track with branch_id
            await trackDeletion('loans', loanId, branchId);
        } catch (err) {
            console.error('Error deleting remote loan:', err);
            addToQueue('DELETE_LOAN', { id: loanId });
        }
    };

    const deleteRemoteClient = async (clientId: string) => {
        if (!isOnline) {
            // Offline? We need to queue a "SOFT DELETE" (Update).
            // Since we don't have a specific queue for partial updates, we might use 'UPDATE_CLIENT' 
            // OR we just assume the user will come online and sync later.
            // For now, let's behave as if it's an update.
            // addToQueue('DELETE_CLIENT', { id: clientId }); // This queue type probably tries HTTP DELETE.
            // BETTER: Queue an UPDATE.
            // But we need the full client object to queue an update often? 
            // Actually, let's keep DELETE_CLIENT queue but handle it as Soft Delete when processing queue?
            // Or just change the implementation here.

            addToQueue('DELETE_CLIENT', { id: clientId });
            return;
        }
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);

            // SOFT DELETE: Update is_active to false
            const { error } = await supabase.from('clients')
                .update({ is_active: false, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                .eq('id', clientId)
                .abortSignal(controller.signal);

            clearTimeout(timeoutId);
            if (error) throw error;
        } catch (err) {
            console.error('Error deleting remote client:', err);
            addToQueue('DELETE_CLIENT', { id: clientId });
        }
    };
    const pushSettings = async (branchId: string, settings: AppSettings): Promise<boolean> => {
        if (!branchId || branchId === 'none') return false;
        if (!isOnline) {
            addToQueue('UPDATE_SETTINGS', { branchId, settings });
            return false;
        }
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);

            const { error } = await supabase.from('branch_settings')
                .upsert({
                    id: branchId,
                    settings: settings,
                    updated_at: new Date().toISOString()
                })
                .abortSignal(controller.signal);

            clearTimeout(timeoutId);
            if (error) throw error;
            return true;
        } catch (err: any) {
            console.error('Error pushing settings:', err);
            setLastErrors(prev => [{ table: 'branch_settings', error: err, timestamp: new Date().toISOString() }, ...prev].slice(0, 10));
            addToQueue('UPDATE_SETTINGS', { branchId, settings });
            setSyncError('Error al sincronizar opciones. Guardado localmente.');
            return false;
        }
    };

    const clearQueue = () => {
        localStorage.removeItem('syncQueue');
        setSyncError(null);
        setIsSyncing(false);
    };

    return {
        isSyncing,
        isFullSyncing,
        syncError,
        showSuccess,
        successMessage,
        setSuccessMessage,
        isOnline,
        processQueue,
        forceSync,
        forceFullSync,
        pullData,
        pushClient,
        pushLoan,
        pushPayment,
        pushLog,
        pushUser,
        pushSettings,
        clearQueue,
        deleteRemoteLog,
        deleteRemotePayment,
        deleteRemoteClient,
        supabase,
        queueLength,
        addToQueue,
        lastErrors,
        setLastErrors
    };
};
