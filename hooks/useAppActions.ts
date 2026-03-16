import { AppState, User, Role, AppSettings, Client, Loan, CollectionLog, CollectionLogType, LoanStatus, PaymentStatus, PaymentRecord, CommissionBracket, Expense } from '../types';
import { supabase } from '../utils/supabaseClient';
import { Preferences } from '@capacitor/preferences';
import { calculateTotalPaidFromLogs, formatCurrency } from '../utils/helpers';
import { connectToPrinter } from '../services/bluetoothPrinterService';
import { getBranchId } from '../utils/settingsHierarchy';

export const useAppActions = (
  state: AppState,
  setState: React.Dispatch<React.SetStateAction<AppState>>,
  setActiveTab: (tab: string) => void,
  sync: any // From useAppSyncEngine
) => {
  const { pullData, handleRealtimeData, pushUser, pushSettings, handleForceSync, pushClient, pushLoan, deleteRemoteLoan, pushLog, pushPayment, pushBulk, deleteRemoteLog, deleteRemotePayment, deleteRemoteClient, addToQueue, addToQueueBulk } = sync;

  const handleLogin = (user: User) => {
    const normalizedRole = (user.role as string).toLowerCase() === 'admin' ? Role.ADMIN : user.role;
    const normalizedUser = { ...user, role: normalizedRole };
    setState(prev => ({ ...prev, currentUser: normalizedUser }));
    setActiveTab(normalizedRole === Role.COLLECTOR ? 'route' : 'dashboard');
    localStorage.removeItem('last_sync_timestamp');
    localStorage.removeItem('last_sync_timestamp_v6');
    
    setTimeout(() => {
      pullData(false).then((newData: any) => {
        if (newData) handleRealtimeData(newData);
      });
    }, 500);

    connectToPrinter(undefined).catch(() => { });
  };

  const handleLogout = async () => {
    setState((prev: AppState) => ({ ...prev, currentUser: null }));
    if (navigator.onLine) await supabase.auth.signOut();
    await Preferences.remove({ key: 'NATIVE_CURRENT_USER' });
  };

  const addUser = async (user: User) => {
    const newUser = { ...user, managedBy: user.managedBy || (state.currentUser?.role === Role.MANAGER || state.currentUser?.role === Role.ADMIN ? state.currentUser.id : undefined) };

    if (newUser.role === Role.MANAGER) {
      const defaultSettings: AppSettings = {
        language: state.settings.language,
        country: state.settings.country,
        numberFormat: state.settings.numberFormat,
        companyName: 'A COMPLETAR',
        companyAlias: 'A COMPLETAR',
        contactPhone: 'A COMPLETAR',
        companyIdentifier: 'A COMPLETAR',
        shareLabel: 'A COMPLETAR',
        shareValue: 'A COMPLETAR',
        receiptPrintMargin: 2
      };

      setState(prev => ({
        ...prev,
        branchSettings: { ...(prev.branchSettings || {}), [newUser.id]: defaultSettings }
      }));
      await pushSettings(newUser.id, defaultSettings);
    }

    await pushUser(newUser);
    setState(prev => ({ ...prev, users: [...prev.users, newUser] }));
    await handleForceSync(false);
  };

  const updateUser = async (updatedUser: User) => {
    const userWithStamp = { ...updatedUser, updated_at: new Date().toISOString() };
    setState(prev => ({ ...prev, users: prev.users.map(u => u.id === userWithStamp.id ? userWithStamp : u), currentUser: state.currentUser?.id === userWithStamp.id ? userWithStamp : state.currentUser }));
    pushUser(userWithStamp);

    if (navigator.onLine) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const oldUser = state.users.find(u => u.id === updatedUser.id);
          const usernameChanged = oldUser && oldUser.username !== updatedUser.username;
          const passwordChanged = oldUser && oldUser.password !== updatedUser.password;

          if (usernameChanged || passwordChanged) {
            const payload: any = { userId: updatedUser.id };
            if (usernameChanged) payload.newUsername = updatedUser.username;
            if (passwordChanged) payload.newPassword = updatedUser.password;

            await supabase.functions.invoke('update-auth-user', { body: payload });
          }
        }
      } catch (authSyncErr) {
        console.error('[updateUser] Auth sync error:', authSyncErr);
      }
    }

    handleForceSync(false);
  };

  const deleteUser = async (userId: string) => {
    const deletedTimestamp = new Date().toISOString();
    const usersToDelete = state.users.filter(u => u.id === userId || u.managedBy === userId);
    usersToDelete.forEach(u => {
      pushUser({ ...u, deletedAt: deletedTimestamp, updated_at: deletedTimestamp } as any);
    });

    setState(prev => ({ ...prev, users: prev.users.filter(u => u.id !== userId && u.managedBy !== userId) }));
    await handleForceSync(false);
  };

  const internalGetBranchId = (user: User | null): string => {
    if (!user) return 'none';
    if (user.role === Role.ADMIN || user.role === Role.MANAGER) return user.id;
    return user.managedBy || 'none';
  };

  const updateSettings = async (newSettings: AppSettings) => {
    const branchId = internalGetBranchId(state.currentUser);
    setState(prev => ({ ...prev, settings: newSettings, branchSettings: { ...(prev.branchSettings || {}), [branchId]: newSettings } }));
    pushSettings(branchId, newSettings);
    handleForceSync(false);
  };

  const addClient = async (client: Client, loan?: Loan) => {
    const branchId = internalGetBranchId(state.currentUser);
    const newClient = { ...client, branchId, isActive: true, createdAt: new Date().toISOString(), updated_at: new Date().toISOString() };
    setState(prev => ({ ...prev, clients: [...prev.clients, newClient] }));
    pushClient(newClient);
    if (loan) addLoan(loan);
    handleForceSync(false);
  };

  const addLoan = async (loan: Loan) => {
    const branchId = internalGetBranchId(state.currentUser);
    const newLoan = { ...loan, branchId, updated_at: new Date().toISOString() };
    setState(prev => ({ ...prev, loans: [newLoan, ...prev.loans] }));
    pushLoan(newLoan);
    handleForceSync(false);
  };

  const updateClient = async (updatedClient: Client) => {
    const clientWithStamp = { ...updatedClient, updated_at: new Date().toISOString() };
    setState(prev => ({ ...prev, clients: prev.clients.map(c => c.id === clientWithStamp.id ? clientWithStamp : c) }));
    pushClient(clientWithStamp);
    handleForceSync(false);
  };

  const deleteClient = async (clientId: string) => {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;
    const updatedClient = { ...client, deletedAt: new Date().toISOString() };
    await updateClient(updatedClient);
    handleForceSync(false);
  };

  const updateLoan = async (updatedLoan: Loan) => {
    const loanWithStamp = { ...updatedLoan, updated_at: new Date().toISOString() };
    setState(prev => ({ ...prev, loans: prev.loans.map(l => l.id === loanWithStamp.id ? loanWithStamp : l) }));
    pushLoan(loanWithStamp);
    handleForceSync(false);
  };

  const recalculateAllLoansBalances = async () => {
    try {
      const updatedLoans = state.loans.map(loan => {
        const totalPaid = calculateTotalPaidFromLogs(loan, state.collectionLogs);
        const balance = Math.max(0, loan.totalAmount - totalPaid);
        const isPaid = balance <= 0;
        const status = isPaid ? LoanStatus.PAID : loan.status;

        return {
          ...loan,
          totalPaid,
          balance,
          status,
          updatedAt: new Date().toISOString()
        };
      });

      setState(prev => ({ ...prev, loans: updatedLoans }));
      alert('Todos los saldos han sido recalculados y sincronizados correctamente.');
    } catch (error) {
      console.error('Error en recalculación global:', error);
      alert('No se pudo completar la recalculación global.');
    }
  };

  const recalculateLoanStatus = async (loanId: string, providedLogs?: CollectionLog[]) => {
    const loan = state.loans.find(l => l.id === loanId);
    if (!loan) return null;

    const useLogs = providedLogs || state.collectionLogs;
    const totalPaid = calculateTotalPaidFromLogs(loan, useLogs);
    const balance = Math.max(0, loan.totalAmount - totalPaid);

    const isPaid = balance <= 0.01;
    let newStatus = loan.status;
    if (isPaid) {
      newStatus = LoanStatus.PAID;
    } else if (loan.status === LoanStatus.PAID) {
      newStatus = LoanStatus.ACTIVE;
    }

    const updatedLoan = {
      ...loan,
      totalPaid,
      balance,
      status: newStatus,
      updatedAt: new Date().toISOString()
    };

    const updatedLoans = state.loans.map(l => l.id === loanId ? updatedLoan : l);
    setState(prev => ({ ...prev, loans: updatedLoans }));

    if (newStatus !== loan.status) {
      await pushLoan(updatedLoan);
    }
    return updatedLoan;
  };

  const deleteLoan = async (loanId: string) => {
    const loan = state.loans.find(l => l.id === loanId);
    if (!loan) return;
    setState(prev => ({ ...prev, loans: prev.loans.filter(l => l.id !== loanId) }));
    deleteRemoteLoan(loanId);
    handleForceSync(false);
  };

  const addCollectionAttempt = async (log: CollectionLog, skipSync: boolean = false) => {
    const branchId = internalGetBranchId(state.currentUser);
    const newLog = { ...log, branchId, recordedBy: state.currentUser?.id, updated_at: new Date().toISOString() };

    pushLog(newLog);

    let updatedLoans = [...state.loans];
    let updatedPayments = [...state.payments];
    const newPaymentsForSync: PaymentRecord[] = [];
    const loansToSync: Loan[] = [];

    if (newLog.type === CollectionLogType.OPENING) {
      setState(prev => ({ ...prev, collectionLogs: [newLog, ...prev.collectionLogs] }));
      if (!skipSync) handleForceSync(true);
      return;
    }

    if (newLog.type === CollectionLogType.PAYMENT && newLog.amount) {
      let totalToApply = Math.round(newLog.amount * 100) / 100;
      updatedLoans = updatedLoans.map(loan => {
        if (loan.id === newLog.loanId) {
          const newInstallments = (loan.installments || []).map(i => ({ ...i }));

          for (let i = 0; i < newInstallments.length && totalToApply > 0.01; i++) {
            const inst = newInstallments[i];
            if (inst.status === PaymentStatus.PAID) continue;

            const remainingInInst = Math.round((inst.amount - (inst.paidAmount || 0)) * 100) / 100;
            const appliedToInst = Math.min(totalToApply, remainingInInst);
            inst.paidAmount = Math.round(((inst.paidAmount || 0) + appliedToInst) * 100) / 100;
            totalToApply = Math.round((totalToApply - appliedToInst) * 100) / 100;
            inst.status = inst.paidAmount >= inst.amount - 0.01 ? PaymentStatus.PAID : PaymentStatus.PARTIAL;

            const pRec: PaymentRecord = {
              id: `pay-${newLog.id}-${inst.number}`,
              loanId: newLog.loanId,
              clientId: newLog.clientId,
              collectorId: state.currentUser?.id,
              branchId: loan.branchId || branchId,
              amount: appliedToInst,
              date: newLog.date,
              installmentNumber: inst.number,
              isVirtual: newLog.isVirtual || false,
              isRenewal: newLog.isRenewal || false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            newPaymentsForSync.push(pRec);
            updatedPayments.push(pRec);
          }

          const allPaid = newInstallments.length > 0 && newInstallments.every(inst => inst.status === PaymentStatus.PAID);
          const updatedLoan = { ...loan, installments: newInstallments, status: allPaid ? LoanStatus.PAID : LoanStatus.ACTIVE, updated_at: new Date().toISOString() };
          loansToSync.push(updatedLoan);
          return updatedLoan;
        }
        return loan;
      });
    }

    setState(prev => ({ ...prev, loans: updatedLoans, payments: updatedPayments, collectionLogs: [newLog, ...prev.collectionLogs] }));

    if (newPaymentsForSync.length > 0 || loansToSync.length > 0) {
      for (const p of newPaymentsForSync) pushPayment(p);
      for (const l of loansToSync) pushLoan(l);
      pushLog(newLog);
    }

    if (!skipSync) handleForceSync(true);
  };

  const deleteCollectionLog = async (logId: string) => {
    if (state.currentUser?.role === Role.COLLECTOR) {
      alert("ERROR: No tienes permisos para eliminar registros.");
      return;
    }

    const logToDelete = state.collectionLogs.find(l => l.id === logId);
    if (!logToDelete) return;

    if (!confirm(`¿ESTÁ SEGURO DE ELIMINAR EL REGISTRO DE ${logToDelete.type === CollectionLogType.PAYMENT ? 'PAGO' : 'GESTIÓN'} POR ${formatCurrency(logToDelete.amount || 0, state.settings)}?`)) {
      return;
    }

    try {
      const updatedLogs = state.collectionLogs.filter(l => l.id !== logId);
      const updatedPayments = state.payments.filter(p => !p.id.startsWith(`pay-${logId}-`));

      setState(prev => ({ ...prev, collectionLogs: updatedLogs, payments: updatedPayments }));

      if (logToDelete.loanId) {
        await recalculateLoanStatus(logToDelete.loanId, updatedLogs);
      }

      deleteRemoteLog(logId);
      const related = state.payments.filter(p => p.id.startsWith(`pay-${logId}-`));
      for (const p of related) deleteRemotePayment(p.id);

    } catch (err: any) {
      console.error("Critical error deleting log:", err);
      alert("Error al eliminar el registro.");
    }
  };

  const updateCollectionLog = async (logId: string, newAmount: number) => {
    try {
      const logToUpdate = state.collectionLogs.find(l => l.id === logId);
      if (!logToUpdate) return;

      const updatedLogs = state.collectionLogs.map(l =>
        l.id === logId ? { ...l, amount: newAmount, updated_at: new Date().toISOString() } : l
      );

      setState(prev => ({ ...prev, collectionLogs: updatedLogs }));

      if (logToUpdate.loanId) {
        await recalculateLoanStatus(logToUpdate.loanId, updatedLogs);
      }

      supabase.from('collection_logs').update({ amount: newAmount, updated_at: new Date().toISOString() }).eq('id', logId);

      if (logToUpdate.type === CollectionLogType.PAYMENT) {
        const updatedPayments = state.payments.map(p =>
          p.id.startsWith(`pay-${logId}-`) ? { ...p, amount: newAmount, updated_at: new Date().toISOString() } : p
        );
        setState(prev => ({ ...prev, payments: updatedPayments }));
        supabase.from('payments').update({ amount: newAmount, updated_at: new Date().toISOString() }).eq('logId', logId);
      }
    } catch (error: any) {
      console.error('Error updating collection log:', error);
      alert('Error al actualizar el cobro');
    }
  };

  const addBulkData = async (clients: Client[], loans: Loan[], logs: CollectionLog[]) => {
    const branchId = internalGetBranchId(state.currentUser);
    const timestamp = new Date().toISOString();

    // Helper para generar IDs únicos robustos
    const generateId = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    };

    const newClients = clients.map(c => ({ ...c, branchId: c.branchId || branchId, createdAt: c.createdAt || timestamp, updated_at: timestamp }));
    const newLoans = loans.map(l => ({ ...l, branchId: l.branchId || branchId, updated_at: timestamp }));
    const newLogs = logs.map(l => ({ ...l, branchId: l.branchId || branchId, recordedBy: state.currentUser?.id, updated_at: timestamp }));

    const allNewPayments: PaymentRecord[] = [];
    const updatedLoansWithPayments = newLoans.map(loan => {
      const loanLogs = newLogs.filter(log => log.loanId === loan.id && log.type === CollectionLogType.PAYMENT);
      let totalToApply = loanLogs.reduce((sum, log) => sum + (log.amount || 0), 0);
      
      const newInstallments = (loan.installments || []).map(i => ({ ...i }));
      
      if (totalToApply > 0) {
        for (let i = 0; i < newInstallments.length && totalToApply > 0.01; i++) {
          const inst = newInstallments[i];
          if (inst.status === PaymentStatus.PAID) continue;

          const remainingInInst = Math.round((inst.amount - (inst.paidAmount || 0)) * 100) / 100;
          const appliedToInst = Math.min(totalToApply, remainingInInst);
          inst.paidAmount = Math.round(((inst.paidAmount || 0) + appliedToInst) * 100) / 100;
          totalToApply = Math.round((totalToApply - appliedToInst) * 100) / 100;
          inst.status = inst.paidAmount >= inst.amount - 0.01 ? PaymentStatus.PAID : PaymentStatus.PARTIAL;

          allNewPayments.push({
            id: `pay-bulk-${generateId()}`, // FIXED: ID único real
            loanId: loan.id,
            clientId: loan.clientId,
            collectorId: loan.collectorId,
            branchId: loan.branchId || branchId,
            amount: appliedToInst,
            date: loan.createdAt,
            installmentNumber: inst.number,
            isVirtual: false,
            isRenewal: false,
            created_at: timestamp,
            updated_at: timestamp
          });
        }
      }

      const allPaid = newInstallments.length > 0 && newInstallments.every(inst => inst.status === PaymentStatus.PAID);
      const totalPaidSoFar = newInstallments.reduce((sum, inst) => sum + (inst.paidAmount || 0), 0);
      const currentBalance = Math.round((loan.totalAmount - totalPaidSoFar) * 100) / 100;

      return { 
        ...loan, 
        installments: newInstallments, 
        status: allPaid ? LoanStatus.PAID : LoanStatus.ACTIVE,
        totalPaid: totalPaidSoFar,
        balance: currentBalance,
        updatedAt: timestamp
      };
    });

    // 1. Actualizar estado UI de un golpe
    setState(prev => ({
        ...prev,
        clients: [...prev.clients, ...newClients],
        loans: [...prev.loans, ...updatedLoansWithPayments],
        payments: [...prev.payments, ...allNewPayments],
        collectionLogs: [...prev.collectionLogs, ...newLogs]
    }));

    // 2. Persistir en cola de sincronización (BULK para evitar O(N^2))
    pushBulk(newClients, updatedLoansWithPayments, allNewPayments, newLogs);

    // 3. Disparar sincronización forzada después de un breve delay
    setTimeout(() => {
        handleForceSync(false, "Importación masiva enviada a la nube");
    }, 500);

    return {
        clientsCount: newClients.length,
        loansCount: updatedLoansWithPayments.length,
        logsCount: newLogs.length,
        paymentsCount: allNewPayments.length
    };
  };

  const updateCollectionLogNotes = (logId: string, notes: string) => {
    setState(prev => ({
      ...prev,
      collectionLogs: prev.collectionLogs.map(l => l.id === logId ? { ...l, notes } : l)
    }));
  };

  const addExpense = (expense: Expense) => {
    const branchId = internalGetBranchId(state.currentUser);
    const newExpense = { ...expense, branchId, addedBy: state.currentUser?.id };
    setState(prev => ({ ...prev, expenses: [newExpense, ...prev.expenses] }));
    addToQueue('ADD_EXPENSE', newExpense);
    handleForceSync(true);
  };

  const removeExpense = async (id: string) => {
    setState(prev => ({ ...prev, expenses: prev.expenses.filter(x => x.id !== id) }));
    await handleForceSync(false);
  };

  const updateInitialCapital = async (amount: number) => {
    setState(prev => ({ ...prev, initialCapital: amount }));
    await handleForceSync(false);
  };

  const updateCommissionBrackets = async (brackets: CommissionBracket[]) => {
    setState(prev => ({ ...prev, commissionBrackets: brackets }));
    await handleForceSync(false);
  };

  const handleSyncUser = (user: User) => {
    setState(prev => {
      if (prev.users.find(u => u.id === user.id)) return prev;
      return { ...prev, users: [user, ...prev.users] };
    });
  };

  const deleteRemoteClientAction = async (clientId: string) => {
    setState(prev => ({
      ...prev,
      clients: prev.clients.filter(c => c.id !== clientId),
      loans: prev.loans.filter(l => l.clientId !== clientId),
      collectionLogs: prev.collectionLogs.filter(l => l.clientId !== clientId),
    }));
    await deleteRemoteClient(clientId);
    await handleForceSync(true);
  };

  return {
    handleLogin, handleLogout, addUser, updateUser, deleteUser, updateSettings,
    addClient, addLoan, updateClient, deleteClient, updateLoan, recalculateAllLoansBalances,
    recalculateLoanStatus, deleteLoan, addCollectionAttempt, deleteCollectionLog,
    updateCollectionLog, addBulkData, updateCollectionLogNotes, addExpense, removeExpense,
    updateInitialCapital, updateCommissionBrackets, handleSyncUser, deleteRemoteClientAction
  };
};
