
import { supabase } from './supabase';
import { AppState, User, Client, Loan, CollectionLog, PaymentRecord, CollectionLogType, LoanStatus, PaymentStatus } from '../types';

/**
 * Mappers to convert between App Types (CamelCase) and DB Keys (SnakeCase)
 */

const mapUserToProfile = (u: User) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    password: u.password, // Storing password for legacy/local fallback
    role: u.role,
    blocked: u.blocked || false,
    managed_by: u.managedBy || null,
    expiry_date: u.expiryDate || null
});

const mapProfileToUser = (p: any): User => ({
    id: p.id,
    name: p.name,
    username: p.username,
    password: p.password || '',
    role: p.role,
    blocked: p.blocked,
    managedBy: p.managed_by,
    expiryDate: p.expiry_date
});

const mapClientToDB = (c: Client) => ({
    id: c.id,
    name: c.name,
    document_id: c.documentId,
    phone: c.phone,
    address: c.address,
    branch_id: c.branchId,
    added_by: c.addedBy,
    location: c.location,
    is_active: c.isActive,
    created_at: new Date().toISOString() // Assuming created_at is needed or auto-generated
});

const mapDBToClient = (c: any): Client => ({
    id: c.id,
    name: c.name,
    documentId: c.document_id,
    phone: c.phone || '',
    address: c.address || '',
    branchId: c.branch_id,
    addedBy: c.added_by,
    location: c.location,
    isActive: c.is_active,
    creditLimit: 0, // Default or fetch if exists
    // ... other fields if necessary
    profilePic: '',
    housePic: '',
    businessPic: '',
    documentPic: ''
});

// Simplified Mapper for Core Sync
// Note: For full fidelity, we might need to store the entire JSON object or map every field.
// Given constraints, we'll map the critical fields.

export const syncService = {
    /**
     * Pushes all local state data to Supabase (Upsert).
     * This ensures that data created locally (Web) is sent to the server.
     */
    async pushToSupabase(state: AppState, entities?: ('users' | 'clients' | 'loans' | 'logs' | 'payments')[]) {
        console.log("Starting Push to Supabase...", entities ? `Syncing only: ${entities.join(', ')}` : "Full Sync");

        const shouldSync = (entity: string) => !entities || entities.includes(entity as any);

        // 1. Users / Profiles
        if (shouldSync('users') && state.users.length > 0) {
            const { error: userError } = await supabase
                .from('profiles')
                .upsert(state.users.map(mapUserToProfile));
            if (userError) console.error("Error syncing users:", userError);
            else console.log("Users synced.");
        }

        // 2. Clients
        if (shouldSync('clients') && state.clients.length > 0) {
            // Map deeply
            const dbClients = state.clients.map(c => ({
                id: c.id,
                name: c.name,
                document_id: c.documentId,
                phone: c.phone,
                address: c.address,
                branch_id: c.branchId,
                added_by: c.addedBy,
                location: c.location,
                is_active: c.isActive,
                // Store extra fields in a raw_data jsonb column if possible, or omit for now
                raw_data: {
                    secondaryPhone: c.secondaryPhone,
                    creditLimit: c.creditLimit,
                    domicilioLocation: c.domicilioLocation,
                    allowCollectorLocationUpdate: c.allowCollectorLocationUpdate,
                    customNoPayMessage: c.customNoPayMessage,
                    pics: {
                        profile: c.profilePic,
                        house: c.housePic,
                        business: c.businessPic,
                        document: c.documentPic
                    }
                }
            }));
            const { error: clientError } = await supabase.from('clients').upsert(dbClients);
            if (clientError) { console.error("Error syncing clients:", clientError); throw new Error("Error Clientes: " + clientError.message); }
            else console.log("Clients synced.");
        }

        // 3. Loans
        if (shouldSync('loans') && state.loans.length > 0) {
            const dbLoans = state.loans.map(l => ({
                id: l.id,
                client_id: l.clientId,
                branch_id: l.branchId,
                principal: l.principal,
                total_amount: l.totalAmount,
                status: l.status,
                installments: l.installments, // JSONB
                created_at: l.createdAt,
                // Map other fields
                is_renewal: l.isRenewal,
                custom_holidays: l.customHolidays,
                frequency: l.frequency,
                interest_rate: l.interestRate,
                total_installments: l.totalInstallments,
                installment_value: l.installmentValue,
                collector_id: l.collectorId,
                // raw_data for safety
            }));
            const { error: loanError } = await supabase.from('loans').upsert(dbLoans);
            if (loanError) { console.error("Error syncing loans:", loanError); throw new Error("Error Prestamos: " + loanError.message); }
            else console.log("Loans synced.");
        }

        // 4. Collection Logs
        if (shouldSync('logs') && state.collectionLogs.length > 0) {
            const dbLogs = state.collectionLogs.map(l => ({
                id: l.id,
                loan_id: l.loanId,
                client_id: l.clientId,
                branch_id: l.branchId,
                type: l.type,
                amount: l.amount || 0, // Ensure numeric for DB
                date: l.date,
                location: l.location ? l.location : { lat: 0, lng: 0 },
                recorded_by: l.recordedBy,
                notes: l.notes || '',
                is_virtual: l.isVirtual || false,
                is_renewal: l.isRenewal || false,
                is_opening: l.isOpening || false
            }));
            const { error: logError } = await supabase.from('collection_logs').upsert(dbLogs);
            if (logError) {
                console.error("Error syncing logs:", logError);
                // Don't throw immediately, try to continue syncing other entities or log specific error
                // throw new Error("Error Pagos/Logs: " + logError.message); 
            } else {
                console.log("Logs synced.");
            }
        }

        // 5. Payments
        if (shouldSync('payments') && state.payments.length > 0) {
            const dbPayments = state.payments.map(p => ({
                id: p.id,
                loan_id: p.loanId,
                client_id: p.clientId,
                branch_id: p.branchId,
                amount: p.amount,
                date: p.date,
                installment_number: p.installmentNumber,
                location: p.location,
                is_virtual: p.isVirtual,
                is_renewal: p.isRenewal
            }));
            const { error: payError } = await supabase.from('payments').upsert(dbPayments);
            if (payError) console.error("Error syncing payments:", payError);
            else console.log("Payments synced.");
        }
    },

    /**
     * Fetches all data from Supabase and merges/replaces local state.
     */
    async pullFromSupabase(entities?: ('users' | 'clients' | 'loans' | 'logs' | 'payments')[], currentUser?: User | null): Promise<Partial<AppState>> {
        console.log("Starting Pull from Supabase...", entities ? `Fetching: ${entities.join(', ')}` : "Full Fetch", currentUser ? `for Role: ${currentUser.role}` : "No user context");
        const newState: Partial<AppState> = {};

        const shouldFetch = (entity: string) => !entities || entities.includes(entity as any);

        // Helper to get branch ID for filtering
        const getBranchForFilter = () => {
            if (!currentUser) return null;
            if (currentUser.role === 'Gerente') return currentUser.id;
            if (currentUser.role === 'Cobrador') return currentUser.managedBy;
            return null;
        };

        const branchFilter = getBranchForFilter();
        // Collector specific logic: Only fetch their own added clients and related data
        const isCollector = currentUser?.role === 'Cobrador';

        // 1. Users (Profiles)
        // Optimization: Admins get all. Managers/Collectors get only relevant users (themselves + children or siblings in branch)
        // For simplicity and to ensure login works for everyone, we might fetch all profiles lightly, or filter if the table is huge.
        // Currently, App depends on having users to map relationships. Let's keep fetching all users for now to avoid breaking relationships, 
        // as the user table is usually small efficiently. Ideally, filter by branch.
        if (shouldFetch('users')) {
            let query = supabase.from('profiles').select('*');

            // If strictly needed optimization for huge userbases:
            // if (branchFilter) query = query.or(`id.eq.${currentUser!.id},managed_by.eq.${branchFilter},id.eq.${branchFilter}`);

            const { data: usersData } = await query;
            if (usersData) {
                newState.users = usersData.map(mapProfileToUser);
            }
        }

        // 2. Clients
        let fetchedClientIds: string[] = [];
        if (shouldFetch('clients')) {
            let query = supabase.from('clients').select('*');

            if (currentUser?.role === 'Gerente') {
                query = query.eq('branch_id', currentUser.id);
            } else if (isCollector) {
                // Collectors only see clients they added
                query = query.eq('added_by', currentUser.id);
            }
            // Admin sees all

            const { data: clientData, error } = await query;

            if (error) {
                console.error("Error fetching clients:", error);
            } else if (clientData) {
                newState.clients = clientData.map((c: any) => ({
                    ...mapDBToClient(c),
                    // Restore extra fields from raw_data
                    secondaryPhone: c.raw_data?.secondaryPhone,
                    creditLimit: c.raw_data?.creditLimit || 1000000,
                    domicilioLocation: c.raw_data?.domicilioLocation,
                    allowCollectorLocationUpdate: c.raw_data?.allowCollectorLocationUpdate,
                    customNoPayMessage: c.raw_data?.customNoPayMessage,
                    profilePic: c.raw_data?.pics?.profile || '',
                    housePic: c.raw_data?.pics?.house || '',
                    businessPic: c.raw_data?.pics?.business || '',
                    documentPic: c.raw_data?.pics?.document || '',
                }));
                fetchedClientIds = newState.clients.map(c => c.id);
            }
        }

        // Helper for dependent queries (Loans, Logs, Payments)
        // If we are a collector, we MUST filter by the clients we just fetched to maintain consistency 
        // with the "only see what I own" logic, OR filter by branch if we want to be less strict but still optimized.
        // App.tsx logic for Collectors: "loans = loans.filter(l => myClientIds.has(l.clientId))"
        // So we should enforce filtering by client_ids for Collectors.

        const applyDeepFilter = (query: any, column: string = 'client_id') => {
            if (currentUser?.role === 'Gerente') {
                return query.eq('branch_id', currentUser.id);
            }
            if (isCollector) {
                // Performance safeguard: If client list is empty, return empty result instantly?
                // Or if list is huge, batching might be needed. Supabase handles 'in' reasonably well for typical route sizes.
                if (fetchedClientIds.length === 0) {
                    // Force empty result by impossible condition if no clients found
                    return query.eq('id', 'impossible-id');
                }
                return query.in(column, fetchedClientIds);
            }
            return query; // Admin
        };

        // 3. Loans
        if (shouldFetch('loans')) {
            let query = supabase.from('loans').select('*');
            query = applyDeepFilter(query, 'client_id');

            const { data: loanData, error } = await query;
            if (error) console.error("Error fetching loans:", error);
            else if (loanData) {
                newState.loans = loanData.map((l: any) => ({
                    id: l.id,
                    clientId: l.client_id,
                    branchId: l.branch_id,
                    principal: l.principal,
                    totalAmount: l.total_amount,
                    status: l.status,
                    installments: l.installments,
                    createdAt: l.created_at,
                    isRenewal: l.is_renewal,
                    customHolidays: l.custom_holidays || [],
                    frequency: l.frequency,
                    interestRate: l.interest_rate,
                    totalInstallments: l.total_installments,
                    installmentValue: l.installment_value,
                    collectorId: l.collector_id
                }));
            }
        }

        // 4. Logs
        if (shouldFetch('logs')) {
            let query = supabase.from('collection_logs').select('*');
            query = applyDeepFilter(query, 'client_id');

            const { data: logData, error } = await query;
            if (error) console.error("Error fetching logs:", error);
            else if (logData) {
                newState.collectionLogs = logData.map((l: any) => ({
                    id: l.id,
                    loanId: l.loan_id,
                    clientId: l.client_id,
                    branchId: l.branch_id,
                    type: l.type,
                    amount: l.amount,
                    date: l.date,
                    location: l.location,
                    recordedBy: l.recorded_by,
                    notes: l.notes,
                    isVirtual: l.is_virtual,
                    isRenewal: l.is_renewal,
                    isOpening: l.is_opening
                }));
            }
        }

        // 5. Payments
        if (shouldFetch('payments')) {
            let query = supabase.from('payments').select('*');
            query = applyDeepFilter(query, 'client_id');

            const { data: payData, error } = await query;
            if (error) console.error("Error fetching payments:", error);
            else if (payData) {
                newState.payments = payData.map((p: any) => ({
                    id: p.id,
                    loanId: p.loan_id,
                    clientId: p.client_id,
                    branchId: p.branch_id,
                    amount: p.amount,
                    date: p.date,
                    installmentNumber: p.installment_number,
                    location: p.location,
                    isVirtual: p.is_virtual,
                    isRenewal: p.is_renewal
                }));
            }
        }

        return newState;
    },

    /**
     * Subscribe to Realtime changes from Supabase.
     * Triggers callback when any watched table changes.
     */
    subscribeToChanges(onChange: () => void) {
        console.log("Setting up Realtime Subscriptions...");

        const channel = supabase.channel('db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
                console.log("Change detected in PROFILES");
                onChange();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
                console.log("Change detected in CLIENTS");
                onChange();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, () => {
                console.log("Change detected in LOANS");
                onChange();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'collection_logs' }, () => {
                console.log("Change detected in LOGS");
                onChange();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
                console.log("Change detected in PAYMENTS");
                onChange();
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log("Successfully subscribed to Realtime changes.");
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    },

    async deleteClientFull(clientId: string) {
        console.log("Deleting Client and all associated data for:", clientId);
        // Supabase should handle cascade delete if configured in FKs, but being explicit is safer here if FKs aren't strict.
        await supabase.from('payments').delete().eq('client_id', clientId);
        await supabase.from('collection_logs').delete().eq('client_id', clientId);
        await supabase.from('loans').delete().eq('client_id', clientId);
        const { error } = await supabase.from('clients').delete().eq('id', clientId);

        if (error) console.error("Error deleting client:", error);
        else console.log("Client deleted successfully.");
    },

    async deleteUser(userId: string) {
        console.log("Hard Deleting User:", userId);
        const { error } = await supabase.from('profiles').delete().eq('id', userId);
        if (error) console.error("Error deleting user:", error);
        else console.log("User deleted successfully.");
    }
};
