import { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Client, PaymentRecord, Loan, CollectionLog, User, AppState, AppSettings, Expense, DeletedItem } from '../types';
import { StorageService } from '../utils/localforageStorage';
import { Network } from '@capacitor/network';
import { App } from '@capacitor/app';


const isValidUuid = (id: string | undefined | null) => {
    if (!id) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || (id.length > 20 && id.includes('-'));
};

export const useSync = (onDataUpdated?: (newData: Partial<AppState>, isFullSync?: boolean) => void) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [isFullSyncing, setIsFullSyncing] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState("-íSincronizado!");
    const [isOnline, setIsOnline] = useState(true);
    const [queueLength, setQueueLength] = useState(0);
    const [lastErrors, setLastErrors] = useState<{ table: string, error: any, timestamp: string }[]>([]);
    const isProcessingRef = useRef(false);

    // Checks for internet connection
    const checkConnection = async (): Promise<boolean> => {
        try {
            const status = await Network.getStatus();
            if (status.connected === false) return false;

            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                return false;
            }

            return true;
        } catch (error) {
            return typeof navigator !== 'undefined' ? navigator.onLine : true;
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

        // Check periodically (every 5s instead of 10s) for aggressive sync
        const interval = setInterval(async () => {
            const online = await checkConnection();
            if (online !== isOnline) setIsOnline(online);
            if (online) {
                const queueStr = localStorage.getItem('syncQueue');
                if (queueStr && JSON.parse(queueStr || '[]').length > 0) {
                    processQueue();
                }
            }
        }, 5000);

        const handleNativeOnline = async () => {
            console.log('Network online (Window Event)');
            setIsOnline(true);
            setTimeout(() => processQueue(), 200);
        };
        const handleNativeOffline = () => {
            console.log('Network offline (Window Event)');
            setIsOnline(false);
        };
        
        if (typeof window !== 'undefined') {
            window.addEventListener('online', handleNativeOnline);
            window.addEventListener('offline', handleNativeOffline);
        }

        const setupListener = async () => {
            const handler = await Network.addListener('networkStatusChange', async (status) => {
                console.log('Network status changed (System)', status);
                setTimeout(async () => {
                    const online = await checkConnection();
                    setIsOnline(online);
                    if (online) {
                        processQueue();
                    }
                }, 200);
            });
            return handler;
        };

        const setupAppListener = async () => {
            return await App.addListener('appStateChange', async ({ isActive }) => {
                if (isActive) {
                    const online = await checkConnection();
                    setIsOnline(online);

                    if (online) {
                        const queueStr = localStorage.getItem('syncQueue');
                        const hasPending = queueStr && JSON.parse(queueStr || '[]').length > 0;

                        const lastSyncTime = localStorage.getItem('last_sync_timestamp_ms');
                        const timeSinceLastSync = lastSyncTime ? Date.now() - parseInt(lastSyncTime) : 9999999;

                        // SAFETY CATCH: If Android put the app to sleep while syncing, 
                        // the previous operation was killed by the OS. We must manually 
                        // reset the lock so the queue can process again.
                        isProcessingRef.current = false;
                        setIsSyncing(false);

                        if (hasPending) {
                            console.log('App resumed: Uploading pending items...');
                            processQueue(false);
                        } else if (timeSinceLastSync > 120000) {
                            console.log('App resumed: Syncing (Stale data > 2min)');
                            processQueue(true);
                        }
                    }
                }
            });
        };

        // REALTIME SUBSCRIPTION FOR INSTANT UPDATES
        let channel: any = null;
        let reconnectTimeout: any = null;

        const subscribeToRealtime = () => {
            if (channel) {
                supabase.removeChannel(channel);
            }

            channel = supabase.channel('system_changes')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public' },
                    async (payload) => {
                        const isDeleteEvent = payload.eventType === 'DELETE';
                        const isCriticalTable = ['collection_logs', 'payments', 'loans', 'clients', 'deleted_items', 'expenses'].includes(payload.table);

                        const triggerSync = async () => {
                            try {
                                const newData = await pullData(false);
                                if (newData && onDataUpdated) {
                                    onDataUpdated(newData, false);
                                }
                            } catch (error) {
                                console.error("[Realtime] Sync trigger failed:", error);
                            }
                        };

                        if (isDeleteEvent && isCriticalTable) {
                            triggerSync();
                        } else {
                            const debounceTimer = (window as any)._syncDebounceTimer;
                            if (debounceTimer) clearTimeout(debounceTimer);
                            (window as any)._syncDebounceTimer = setTimeout(triggerSync, 1000);
                        }
                    }
                )
                .subscribe((status) => {
                    (window as any)._lastRealtimeStatus = status;

                    if (status === 'SUBSCRIBED') {
                        if (reconnectTimeout) {
                            clearTimeout(reconnectTimeout);
                            reconnectTimeout = null;
                        }

                        if ((window as any)._rtHeartbeat) clearInterval((window as any)._rtHeartbeat);
                        (window as any)._rtHeartbeat = setInterval(() => {
                            if (channel && channel.state === 'joined') {
                                channel.send({ type: 'broadcast', event: 'heartbeat', payload: { t: Date.now() } });
                            }
                        }, 45000);

                        const lastSyncTime = localStorage.getItem('last_sync_timestamp_ms');
                        const shouldPull = !lastSyncTime || (Date.now() - parseInt(lastSyncTime)) > 120000;
                        if (shouldPull) {
                            pullData(false).then(newData => {
                                if (newData && onDataUpdated) onDataUpdated(newData);
                            });
                        }
                    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                        if ((window as any)._rtHeartbeat) clearInterval((window as any)._rtHeartbeat);
                        if (!reconnectTimeout) {
                            reconnectTimeout = setTimeout(() => {
                                reconnectTimeout = null;
                                subscribeToRealtime();
                            }, 5000);
                        }
                    }
                });
        };

        const healthCheckInterval = setInterval(() => {
            const status = (window as any)._lastRealtimeStatus;
            if (status !== 'SUBSCRIBED') {
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
            Promise.resolve(handlerPromise).then(h => h?.remove?.()).catch(() => {});
            Promise.resolve(appHandlerPromise).then(h => h?.remove?.()).catch(() => {});
            if (channel) supabase.removeChannel(channel);
        };
    }, []);

    const addToQueue = (operation: string, data: any) => {
        let queue = JSON.parse(localStorage.getItem('syncQueue') || '[]');

        if (operation === 'UPDATE_SETTINGS') {
            queue = queue.filter((item: any) => item.operation !== 'UPDATE_SETTINGS' || item.data.branchId !== data.branchId);
        }

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

        const _id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
        queue.push({ _id, operation, data, timestamp: Date.now(), retryCount: 0 });
        localStorage.setItem('syncQueue', JSON.stringify(queue));
        setQueueLength(queue.length);

        // Instant sync trigger
        processQueue();
    };

    const addToQueueBulk = (items: { operation: string, data: any }[]) => {
        if (items.length === 0) return;
        let queue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
        
        const now = Date.now();
        const newItems = items.map(item => ({
            _id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10) + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
            operation: item.operation,
            data: item.data,
            timestamp: now,
            retryCount: 0
        }));

        queue = [...queue, ...newItems];
        localStorage.setItem('syncQueue', JSON.stringify(queue));
        setQueueLength(queue.length);

        // Do not trigger processQueue automatically here, let the caller decide when to trigger
    };

    const forceSync = () => processQueue(true);
    const forceFullSync = () => processQueue(true, true);

    const pullData = async (fullSync = false): Promise<Partial<AppState> | null> => {
        setIsSyncing(true);
        setSyncError(null);
        let syncTimeoutId: any;
        try {
            const online = await checkConnection();
            if (!online) return null;

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setSyncError('Sesión caducada.');
                return null;
            }

            const lastSyncTime = localStorage.getItem('last_sync_timestamp_v8');
            const PAGE_SIZE = 500;

            const fetchAll = async (query: any) => {
                let allData: any[] = [];
                let page = 0;
                let hasMore = true;

                while (hasMore) {
                    let attempts = 0;
                    let success = false;

                    while (attempts < 3 && !success) {
                        try {
                            const { data, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
                            if (error) throw error;

                            if (data && data.length > 0) {
                                allData = allData.concat(data);
                                if (data.length < PAGE_SIZE) hasMore = false;
                                else page++;
                            } else {
                                hasMore = false;
                            }
                            success = true;
                        } catch (err: any) {
                            attempts++;
                            await new Promise(r => setTimeout(r, 1000 * attempts));
                            if (attempts >= 3) throw err;
                        }
                    }
                    await new Promise(r => setTimeout(r, 50));
                    if (page > 100) break;
                }
                return { data: allData, error: null };
            };

            let clientsQuery = supabase.from('clients').select('id, document_id, name, phone, secondary_phone, address, added_by, branch_id, location, domicilio_location, credit_limit, allow_collector_location_update, custom_no_pay_message, is_active, is_hidden, created_at, updated_at, deleted_at, capital, current_balance, raw_data');
            let loansQuery = supabase.from('loans').select('*');
            let paymentsQuery = supabase.from('payments').select('*');
            let logsQuery = supabase.from('collection_logs').select('*');
            let profilesQuery = supabase.from('profiles').select('*');
            let settingsQuery = supabase.from('branch_settings').select('*');
            let expensesQuery = supabase.from('expenses').select('*');
            let deletedItemsQuery = supabase.from('deleted_items').select('*');

            let adjustedSyncTime: string | null = null;
            if (lastSyncTime && !fullSync) {
                const safetyMargin = 120000;
                const parsedDate = new Date(lastSyncTime);
                if (!isNaN(parsedDate.getTime())) {
                    adjustedSyncTime = new Date(parsedDate.getTime() - safetyMargin).toISOString();
                } else {
                    fullSync = true;
                }
            }

            if (adjustedSyncTime && !fullSync) {
                clientsQuery = clientsQuery.gt('updated_at', adjustedSyncTime);
                loansQuery = loansQuery.gt('updated_at', adjustedSyncTime);
                paymentsQuery = paymentsQuery.gt('updated_at', adjustedSyncTime);
                logsQuery = logsQuery.gt('updated_at', adjustedSyncTime);
                // NOTA: profiles (cobradores/gerentes) siempre se traen completos
                // porque son pocos registros y es crítico no perder ningún usuario
                settingsQuery = settingsQuery.gt('updated_at', adjustedSyncTime);
                expensesQuery = expensesQuery.gt('updated_at', adjustedSyncTime);
                deletedItemsQuery = deletedItemsQuery.gt('deleted_at', adjustedSyncTime);
            }

            const controller = new AbortController();
            syncTimeoutId = setTimeout(() => controller.abort(new Error("Timeout syncing data")), 120000);

            const settingsResult = await fetchAll(settingsQuery.abortSignal(controller.signal));
            const profilesResult = await fetchAll(profilesQuery.abortSignal(controller.signal));
            const clientsResult = await fetchAll(clientsQuery.abortSignal(controller.signal));
            const loansResult = await fetchAll(loansQuery.abortSignal(controller.signal));
            const paymentsResult = await fetchAll(paymentsQuery.abortSignal(controller.signal));
            const logsResult = await fetchAll(logsQuery.abortSignal(controller.signal));
            const expensesResult = await fetchAll(expensesQuery.abortSignal(controller.signal));
            const deletedResult = await fetchAll(deletedItemsQuery.abortSignal(controller.signal));

            if (syncTimeoutId) clearTimeout(syncTimeoutId);

            localStorage.setItem('last_sync_timestamp_ms', new Date().getTime().toString());
            localStorage.setItem('last_sync_timestamp_v8', new Date().toISOString());

            const result = {
                clients: (clientsResult.data || []).map((c: any) => ({
                    ...c, documentId: c.document_id, secondaryPhone: c.secondary_phone,
                    profilePic: c.profile_pic, housePic: c.house_pic, businessPic: c.business_pic,
                    documentPic: c.document_pic, domicilioLocation: c.domicilio_location,
                    creditLimit: c.credit_limit, allowCollectorLocationUpdate: c.allow_collector_location_update,
                    customNoPayMessage: c.custom_no_pay_message, isActive: c.is_active, isHidden: c.is_hidden,
                    addedBy: c.added_by, branchId: c.branch_id, createdAt: c.created_at, deletedAt: c.deleted_at,
                    ...(c.raw_data || {})
                })) as Client[],
                loans: (loansResult.data || []).map((l: any) => ({
                    ...l, clientId: l.client_id, collectorId: l.collector_id, branchId: l.branch_id,
                    interestRate: l.interest_rate, totalInstallments: l.total_installments,
                    totalAmount: l.total_amount, installmentValue: l.installment_value,
                    totalPaid: l.total_paid || 0, balance: l.balance || 0,
                    createdAt: l.created_at, deletedAt: l.deleted_at, installments: l.installments,
                    isRenewal: l.is_renewal || false, frequency: l.frequency,
                    ...(l.raw_data || {})
                })) as Loan[],
                payments: (paymentsResult.data || []).map((p: any) => ({
                    ...p, loanId: p.loan_id, clientId: p.client_id, branchId: p.branch_id,
                    installmentNumber: p.installment_number, isVirtual: p.is_virtual,
                    isRenewal: p.is_renewal, deletedAt: p.deleted_at
                })) as PaymentRecord[],
                collectionLogs: (logsResult.data || []).map((cl: any) => ({
                    ...cl, loanId: cl.loan_id, clientId: cl.client_id, branchId: cl.branch_id,
                    isVirtual: cl.is_virtual, isRenewal: cl.is_renewal, isOpening: cl.is_opening,
                    recordedBy: cl.recorded_by, collectorId: cl.collector_id, deletedAt: cl.deleted_at
                })) as CollectionLog[],
                expenses: (expensesResult.data || []).map((e: any) => ({ ...e, branchId: e.branch_id, addedBy: e.added_by })) as Expense[],
                users: (profilesResult.data || []).map((u: any) => ({ ...u, expiryDate: u.expiry_date, managedBy: u.managed_by, requiresLocation: u.requires_location })) as unknown as User[],
                branchSettings: (settingsResult.data || []).reduce((acc: any, s: any) => {
                    acc[s.id] = s.settings;
                    return acc;
                }, {} as Record<string, AppSettings>),
                deletedItems: (deletedResult.data || []).map((d: any) => ({ id: d.id, tableName: d.table_name, recordId: d.record_id, branchId: d.branch_id, deletedAt: d.deleted_at })) as DeletedItem[]
            };

            if (onDataUpdated) onDataUpdated(result, fullSync);
            return result;
        } catch (err: any) {
            setSyncError(`Error Descarga: ${err.message || 'Error'}`);
            return null;
        } finally {
            if (syncTimeoutId) clearTimeout(syncTimeoutId);
            setIsSyncing(false);
            if (fullSync) setIsFullSyncing(false);
        }
    };

    const fetchClientPhotos = async (clientId: string): Promise<Partial<Client> | null> => {
        try {
            const { data, error } = await supabase.from('clients').select('profile_pic, house_pic, business_pic, document_pic').eq('id', clientId).single();
            if (error) throw error;
            return { profilePic: data.profile_pic, housePic: data.house_pic, businessPic: data.business_pic, documentPic: data.document_pic };
        } catch (err) { return null; }
    };

    const processQueue = async (force = false, fullSync = false, skipPull = false) => {
        if (isProcessingRef.current && !force) return;
        isProcessingRef.current = true;
        try {
            const online = await checkConnection();
            setIsOnline(online);
            if (!online) {
                setSyncError('Sin conexión. Reintentando pronto...');
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setSyncError('Sesión requerida.');
                return;
            }

            const queue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
            setQueueLength(queue.length);

            if (queue.length === 0) {
                if (force || fullSync) pullData(fullSync);
                setIsSyncing(false);
                isProcessingRef.current = false;
                return;
            }

            setIsSyncing(true);
            const processedIds = new Set<string>();

            // AGRUPAR OPERACIONES POR TABLA Y TIPO PARA ENVÍO EN LOTE
            const batches: Record<string, { items: any[], table: string, isDelete: boolean, mapper: (d: any) => any }> = {
                'ADD_PROFILE': { items: [], table: 'profiles', isDelete: false, mapper: (d) => ({
                    id: d.id, name: d.name, username: d.username, password: d.password,
                    role: d.role, blocked: d.blocked, expiry_date: d.expiryDate || null,
                    managed_by: d.managedBy || null, profile_pic: d.profilePic,
                    home_pic: d.homePic, home_location: d.homeLocation,
                    requires_location: d.requiresLocation, deleted_at: d.deletedAt || null,
                    updated_at: new Date().toISOString()
                })},
                'ADD_CLIENT': { items: [], table: 'clients', isDelete: false, mapper: (d) => {
                    const { id, documentId, name, phone, secondaryPhone, address, addedBy, branchId, location, domicilioLocation, creditLimit, allowCollectorLocationUpdate, customNoPayMessage, isActive, isHidden, createdAt, updatedAt, deletedAt, capital, currentBalance, profilePic, housePic, businessPic, documentPic, raw_data, ...other } = d;
                    return {
                        id, name, document_id: documentId, phone, secondary_phone: secondaryPhone, address,
                        profile_pic: profilePic, house_pic: housePic, business_pic: businessPic, document_pic: documentPic,
                        domicilio_location: domicilioLocation, location, credit_limit: creditLimit,
                        allow_collector_location_update: allowCollectorLocationUpdate, added_by: addedBy, branch_id: branchId,
                        is_active: isActive !== undefined ? isActive : true, is_hidden: isHidden || false,
                        deleted_at: deletedAt || null, created_at: createdAt, updated_at: new Date().toISOString(),
                        capital, current_balance: currentBalance, raw_data: { ...raw_data, ...other }
                    };
                }},
                'ADD_LOAN': { items: [], table: 'loans', isDelete: false, mapper: (d) => {
                    const { id, clientId, collectorId, branchId, principal, interestRate, totalInstallments, installmentValue, totalAmount, status, createdAt, installments, frequency, isRenewal, customHolidays, deletedAt, updatedAt, totalPaid, balance, raw_data, ...other } = d;
                    return {
                        id, client_id: clientId, collector_id: collectorId, branch_id: branchId,
                        principal, interest_rate: interestRate, total_installments: totalInstallments,
                        installment_value: installmentValue, total_amount: totalAmount, status,
                        created_at: createdAt, installments, frequency, is_renewal: isRenewal || false,
                        custom_holidays: customHolidays || [], deleted_at: deletedAt || null,
                        updated_at: new Date().toISOString(), total_paid: totalPaid, balance: balance,
                        raw_data: { ...raw_data, ...other }
                    };
                }},
                'ADD_PAYMENT': { items: [], table: 'payments', isDelete: false, mapper: (d) => ({
                    id: d.id, loan_id: d.loanId, client_id: d.clientId, collector_id: d.collectorId,
                    branch_id: d.branchId, amount: d.amount, date: d.date,
                    installment_number: d.installmentNumber, location: d.location,
                    is_virtual: d.isVirtual || false, is_renewal: d.isRenewal || false,
                    deleted_at: d.deletedAt || null, updated_at: new Date().toISOString()
                })},
                'ADD_LOG': { items: [], table: 'collection_logs', isDelete: false, mapper: (d) => ({
                    id: d.id, loan_id: d.loanId, client_id: d.clientId, branch_id: d.branchId,
                    recorded_by: d.recordedBy, collector_id: d.collectorId, amount: d.amount, type: d.type, date: d.date,
                    location: d.location, notes: d.notes, is_virtual: d.isVirtual || false,
                    is_renewal: d.isRenewal || false, is_opening: d.isOpening || false,
                    deleted_at: d.deletedAt || null, updated_at: new Date().toISOString()
                })},
                'ADD_EXPENSE': { items: [], table: 'expenses', isDelete: false, mapper: (d) => ({
                    id: d.id, description: d.description, amount: d.amount, category: d.category,
                    date: d.date, branch_id: d.branchId, added_by: d.addedBy,
                    deleted_at: d.deletedAt || null, updated_at: new Date().toISOString()
                })},
                'UPDATE_SETTINGS': { items: [], table: 'branch_settings', isDelete: false, mapper: (d) => ({ id: d.branchId, settings: d.settings, updated_at: new Date().toISOString() }) },
                'DELETE_LOG': { items: [], table: 'collection_logs', isDelete: true, mapper: (d) => d },
                'DELETE_PAYMENT': { items: [], table: 'payments', isDelete: true, mapper: (d) => d },
                'DELETE_LOAN': { items: [], table: 'loans', isDelete: true, mapper: (d) => d },
                'DELETE_CLIENT': { items: [], table: 'clients', isDelete: true, mapper: (d) => d },
                'DELETE_EXPENSE': { items: [], table: 'expenses', isDelete: true, mapper: (d) => d },
            };

            // Clasificar la cola
            for (const item of queue) {
                if (batches[item.operation]) {
                    batches[item.operation].items.push(item);
                }
            }

            // FUNCIÓN HELPER PARA PROCESAR EN PARALELO (MAX N CONCURRENTES)
            const processInChunks = async (items: any[], chunkSize: number, processFn: (chunk: any[]) => Promise<void>) => {
                for (let i = 0; i < items.length; i += chunkSize) {
                    const chunk = items.slice(i, i + chunkSize);
                    await processFn(chunk);
                }
            };

            // PROCESAR POR LOTES
            for (const opKey of Object.keys(batches)) {
                const batch = batches[opKey];
                if (batch.items.length === 0) continue;

                const { table, isDelete, mapper } = batch;

                if (isDelete) {
                    // Procesar Deletes
                    for (const item of batch.items) {
                        try {
                            const { data: { session: currentSession } } = await supabase.auth.getSession();
                            if (currentSession) {
                                const bId = (currentSession.user as any).user_metadata?.branchId || currentSession.user.id;
                                await supabase.from('deleted_items').insert({
                                    table_name: table, record_id: item.data.id, branch_id: bId,
                                    deleted_at: new Date().toISOString()
                                });
                            }
                            const { error } = await supabase.from(table).delete().eq('id', item.data.id);
                            if (error) throw error;
                            processedIds.add(item._id);
                            setQueueLength(prev => Math.max(0, prev - 1));
                        } catch (err) {
                            console.error(`Error de sincronización (DELETE ${table}):`, err);
                            item.retryCount = (item.retryCount || 0) + 1;
                            if (item.retryCount > 3) {
                                processedIds.add(item._id);
                                const failedItems = JSON.parse(localStorage.getItem('failedSyncItems') || '[]');
                                failedItems.push({ ...item, lastError: String(err), fatal: true });
                                localStorage.setItem('failedSyncItems', JSON.stringify(failedItems.slice(-20)));
                            }
                        }
                    }
                } else {
                    // Procesar Upserts Masivos en bloques para evitar error 21000 de Supabase (Trigger limitation on single row insertions or large payload size)
                    // Configurable chunk size. Using smaller chunk (e.g. 10) prevents heavy DB locks and solves 21000 error typically caused by row-level triggers.
                    await processInChunks(batch.items, 10, async (chunkItems) => {
                        try {
                            const payload = chunkItems.map(i => mapper(i.data));
                            const { error } = await supabase.from(table).upsert(payload);
                            if (error) {
                                // Fallback a 1 por 1 si el chunk de 10 falla
                                throw error;
                            } else {
                                chunkItems.forEach(i => {
                                    processedIds.add(i._id);
                                    setQueueLength(prev => Math.max(0, prev - 1));
                                });
                            }
                        } catch (chunkErr) {
                            // FAST-FALLBACK: Si falla el bulk, metemos 1 a 1 para salvar lo posible.
                            console.warn(`Error en Bulk Upsert (${table}). Reintentando 1 a 1... Detalle:`, chunkErr);
                            for (const item of chunkItems) {
                                try {
                                    const { error } = await supabase.from(table).upsert(mapper(item.data));
                                    if (error) throw error;
                                    processedIds.add(item._id);
                                    setQueueLength(prev => Math.max(0, prev - 1));
                                } catch (singleErr) {
                                    console.error(`Error de sincronización individual en ${table}:`, singleErr);
                                    item.retryCount = (item.retryCount || 0) + 1;
                                    if (item.retryCount > 3) {
                                        processedIds.add(item._id); // Skip after 3 failures
                                        const failedItems = JSON.parse(localStorage.getItem('failedSyncItems') || '[]');
                                        failedItems.push({ ...item, lastError: String(singleErr), fatal: true });
                                        localStorage.setItem('failedSyncItems', JSON.stringify(failedItems.slice(-20)));
                                    }
                                }
                            }
                        }
                    });
                }
            }

            const freshQueue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
            const remainingQueue = freshQueue.filter((q: any) => !processedIds.has(q._id));
            localStorage.setItem('syncQueue', JSON.stringify(remainingQueue));
            setQueueLength(remainingQueue.length);

            if (remainingQueue.length > 0) {
                setSyncError(`Pendientes: ${remainingQueue.length}. Reintentando automáticamente...`);
                setTimeout(() => processQueue(true, fullSync, skipPull), 3000);
            } else {
                setSyncError(null);
                if (!skipPull) pullData(fullSync);
            }
        } catch (err) { 
            setSyncError("Error sincronización."); 
        } finally {
            isProcessingRef.current = false;
            setIsSyncing(false);
        }
    };

    const pushClient = async (client: Client): Promise<boolean> => { addToQueue('ADD_CLIENT', client); return true; };
    const pushLoan = async (loan: Loan): Promise<boolean> => { addToQueue('ADD_LOAN', loan); return true; };
    const pushPayment = async (payment: PaymentRecord): Promise<boolean> => { addToQueue('ADD_PAYMENT', payment); return true; };
    const pushLog = async (log: CollectionLog): Promise<boolean> => { addToQueue('ADD_LOG', log); return true; };
    const pushUser = async (user: User): Promise<boolean> => { addToQueue('ADD_PROFILE', user); return true; };

    const pushSettings = async (branchId: string, settings: AppSettings): Promise<boolean> => {
        addToQueue('UPDATE_SETTINGS', { branchId, settings });
        return true;
    };

    const pushBulk = async (clients: Client[], loans: Loan[], payments: PaymentRecord[], logs: CollectionLog[]): Promise<boolean> => {
        const items = [
            ...clients.map(c => ({ operation: 'ADD_CLIENT', data: c })),
            ...loans.map(l => ({ operation: 'ADD_LOAN', data: l })),
            ...payments.map(p => ({ operation: 'ADD_PAYMENT', data: p })),
            ...logs.map(l => ({ operation: 'ADD_LOG', data: l }))
        ];
        addToQueueBulk(items);
        return true;
    };

    const deleteRemoteLog = async (logId: string) => addToQueue('DELETE_LOG', { id: logId });
    const deleteRemotePayment = async (paymentId: string) => addToQueue('DELETE_PAYMENT', { id: paymentId });
    const deleteRemoteLoan = async (loanId: string) => addToQueue('DELETE_LOAN', { id: loanId });
    const deleteRemoteClient = async (clientId: string) => addToQueue('DELETE_CLIENT', { id: clientId });
    const clearQueue = () => { localStorage.removeItem('syncQueue'); setSyncError(null); setIsSyncing(false); };

    return {
        isSyncing, isFullSyncing, syncError, showSuccess, successMessage, setSuccessMessage, isOnline,
        processQueue, forceSync, forceFullSync, pullData, pushClient, pushLoan, pushPayment, pushLog,
        pushUser, pushSettings, pushBulk, clearQueue, deleteRemoteLoan, deleteRemoteLog, deleteRemotePayment,
        deleteRemoteClient, fetchClientPhotos, supabase, queueLength, addToQueue, addToQueueBulk, lastErrors, setLastErrors
    };
};
