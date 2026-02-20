
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
// import { useRegisterSW } from 'virtual:pwa-register/react';
import React, { useState, useEffect, useMemo } from 'react';
import { AppState, Client, Loan, Role, LoanStatus, PaymentStatus, Expense, CollectionLog, CollectionLogType, User, AppSettings, PaymentRecord, CommissionBracket } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Clients from './components/Clients';
import Loans from './components/Loans';
import CollectionRoute from './components/CollectionRoute';
import Expenses from './components/Expenses';
import CollectionMap from './components/CollectionMap';
import CollectorCommission from './components/CollectorCommission';
import Collectors from './components/Collectors';
import Managers from './components/Managers';
import CollectorPerformance from './components/CollectorPerformance';
import Notifications from './components/Notifications';
import Login from './components/Login';
import Simulator from './components/Simulator';
import Settings from './components/Settings';
import Profile from './components/Profile';
import Reports from './components/Reports';
import Generator from './components/Generator/Generator';
import { getTranslation } from './utils/translations';
import { getLocalDateStringForCountry, generateUUID } from './utils/helpers';
import { resolveSettings } from './utils/settingsHierarchy';
import { useSync } from './hooks/useSync';
import { isPrintingNow, startConnectionKeeper } from './services/bluetoothPrinterService';
import FloatingBackButton from './components/FloatingBackButton';
import LocationEnforcer from './components/LocationEnforcer';
import { Geolocation } from '@capacitor/geolocation';


import ErrorBoundary from './components/ErrorBoundary';
import LicenseReminder from './components/LicenseReminder';


const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showManagerExpiryModal, setShowManagerExpiryModal] = useState(false);
  const [showCollectorExpiryAlert, setShowCollectorExpiryAlert] = useState(false);
  const [expiringCollectorsNames, setExpiringCollectorsNames] = useState<string[]>([]);
  const [daysToExpiry, setDaysToExpiry] = useState<number | null>(null);
  const [isJumping, setIsJumping] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

  // 1. STATE INITIALIZATION
  const [state, setState] = useState<AppState>(() => {
    const CURRENT_VERSION_ID = 'v6.1.72-SECURITY';
    const SYSTEM_ADMIN_ID = 'b3716a78-fb4f-4918-8c0b-92004e3d63ec';
    const initialAdmin: User = { id: SYSTEM_ADMIN_ID, name: 'Administrador', role: Role.ADMIN, username: '123456', password: '123456' };
    const defaultInitialState: AppState = {
      clients: [],
      loans: [],
      payments: [],
      expenses: [],
      collectionLogs: [],
      users: [initialAdmin],
      currentUser: null,
      commissionPercentage: 10,
      commissionBrackets: [],
      initialCapital: 0,
      settings: { language: 'es', country: 'CO', numberFormat: 'dot' },
      branchSettings: {}
    };

    try {
      const lastAppVersion = localStorage.getItem('LAST_APP_VERSION_ID');
      if (!lastAppVersion || lastAppVersion !== CURRENT_VERSION_ID) {
        // IMPORTANTE: Preservar la configuración de la empresa antes de limpiar
        let savedSettings = null;
        let savedBranchSettings = null;
        try {
          const oldSaved = localStorage.getItem('prestamaster_v2');
          if (oldSaved) {
            const oldData = JSON.parse(oldSaved);
            if (oldData?.settings) savedSettings = oldData.settings;
            if (oldData?.branchSettings) savedBranchSettings = oldData.branchSettings;
          }
        } catch (e) { /* ignorar */ }

        localStorage.setItem('LAST_APP_VERSION_ID', CURRENT_VERSION_ID);
        localStorage.removeItem('last_sync_timestamp');
        localStorage.removeItem('last_sync_timestamp_v6');
        localStorage.removeItem('prestamaster_v2');
        localStorage.removeItem('syncQueue');

        // Restaurar la configuración después de la limpieza
        if (savedSettings || savedBranchSettings) {
          const restoredData: any = {};
          if (savedSettings) restoredData.settings = savedSettings;
          if (savedBranchSettings) restoredData.branchSettings = savedBranchSettings;
          localStorage.setItem('prestamaster_v2', JSON.stringify(restoredData));
        }
      }

      const saved = localStorage.getItem('prestamaster_v2');
      if (!saved) return defaultInitialState;

      let rawData = JSON.parse(saved);
      if (rawData) {
        const json = JSON.stringify(rawData).replace(/"admin-1"/g, `"${SYSTEM_ADMIN_ID}"`);
        rawData = JSON.parse(json);
      }

      const users = (Array.isArray(rawData?.users) ? rawData.users : [initialAdmin]).map((u: any) => ({
        ...u,
        role: u.role === 'admin' ? Role.ADMIN : u.role
      }));



      return {
        clients: Array.isArray(rawData?.clients) ? rawData.clients : [],
        loans: Array.isArray(rawData?.loans) ? rawData.loans : [],
        payments: Array.isArray(rawData?.payments) ? rawData.payments : [],
        expenses: Array.isArray(rawData?.expenses) ? rawData.expenses : [],
        collectionLogs: Array.isArray(rawData?.collectionLogs) ? rawData.collectionLogs : [],
        users: users,
        currentUser: rawData?.currentUser || null,
        commissionPercentage: rawData?.commissionPercentage ?? 10,
        commissionBrackets: Array.isArray(rawData?.commissionBrackets) ? rawData.commissionBrackets : [],
        settings: rawData?.settings || defaultInitialState.settings,
        branchSettings: rawData?.branchSettings || {}
      };
    } catch (e) {
      return defaultInitialState;
    }
  });

  const resolvedSettings = useMemo(() => {
    try {
      return resolveSettings(state.currentUser, state.branchSettings || {}, state.users, { language: 'es', country: 'CO', numberFormat: 'dot' });
    } catch (e) {
      console.error("Settings resolution error:", e);
      return { language: 'es', country: 'CO', numberFormat: 'dot' } as any;
    }
  }, [state.currentUser, state.branchSettings, state.users]);

  // 2. HELPER FUNCTIONS
  const mergeData = <T extends { id: string, updated_at?: string }>(
    local: T[],
    remote: T[],
    pendingAddIds: Set<string> = new Set(),
    pendingDeleteIds: Set<string> = new Set(),
    isFullSync: boolean = false
  ): T[] => {
    if (!Array.isArray(local)) local = [];
    if (!Array.isArray(remote)) remote = [];
    if (isFullSync) {
      const result = [...remote.filter(r => !pendingDeleteIds.has(r.id) && !(r as any).deletedAt)];
      const remoteIds = new Set(result.map(r => r.id));
      local.forEach(l => {
        if (l && l.id && pendingAddIds.has(l.id) && !remoteIds.has(l.id)) {
          result.push(l);
        }
      });
      return result;
    }

    const remoteMap = new Map((Array.isArray(remote) ? remote : []).map(i => [i.id, i]));
    const result: T[] = [...(Array.isArray(remote) ? remote : []).filter(r => !pendingDeleteIds.has(r.id) && !(r as any).deletedAt)];
    const resultMap = new Map(result.map(i => [i.id, i]));

    local.forEach(l => {
      if (!l || !l.id || pendingDeleteIds.has(l.id)) return;
      const r = remoteMap.get(l.id);

      // PROTECTION: If local item is very recent (< 5 mins), keep it even if not in remote/result
      // This protects against "Push -> FullSync -> Remote lag -> Delete" race condition
      const isRecent = l.updated_at && (Date.now() - new Date(l.updated_at).getTime() < 300000);

      if (!r) {
        if ((pendingAddIds.has(l.id) || isRecent) && !resultMap.has(l.id)) {
          result.push(l);
          resultMap.set(l.id, l);
        }
      } else if (l.updated_at && r.updated_at && new Date(l.updated_at).getTime() > new Date(r.updated_at).getTime()) {
        const idx = result.findIndex(item => item.id === l.id);
        if (idx !== -1) {
          result[idx] = l;
          resultMap.set(l.id, l);
        }
      }
    });

    if (!isFullSync) {
      local.forEach(l => {
        if (l && l.id && !pendingDeleteIds.has(l.id) && !remoteMap.has(l.id) && !resultMap.has(l.id)) {
          result.push(l);
          resultMap.set(l.id, l);
        }
      });
    }
    return result;
  };

  const handleRealtimeData = (newData: Partial<AppState>, isFullSync?: boolean) => {
    setState(prev => {
      const queueStr = localStorage.getItem('syncQueue');
      const queue = queueStr ? JSON.parse(queueStr) : [];
      const pendingDeleteIds = new Set<string>();
      const pendingAddIds = new Set<string>();

      if (Array.isArray(queue)) {
        queue.forEach((item: any) => {
          if (item?.data?.id) {
            if (item.operation.startsWith('DELETE_')) pendingDeleteIds.add(item.data.id);
            else if (item.operation.startsWith('ADD_')) pendingAddIds.add(item.data.id);
          }
        });
      }

      const updatedState = { ...prev };

      if (newData.deletedItems && newData.deletedItems.length > 0) {
        const delIds = new Set(newData.deletedItems.map(d => d.recordId));
        if (updatedState.payments) updatedState.payments = updatedState.payments.filter(i => !delIds.has(i.id));
        if (updatedState.collectionLogs) updatedState.collectionLogs = updatedState.collectionLogs.filter(i => !delIds.has(i.id));
        if (updatedState.loans) updatedState.loans = updatedState.loans.filter(i => !delIds.has(i.id));
        if (updatedState.clients) updatedState.clients = updatedState.clients.filter(i => !delIds.has(i.id));
      }

      if (newData.payments) updatedState.payments = mergeData(updatedState.payments, newData.payments, pendingAddIds, pendingDeleteIds, !!isFullSync);
      if (newData.collectionLogs) updatedState.collectionLogs = mergeData(updatedState.collectionLogs, newData.collectionLogs, pendingAddIds, pendingDeleteIds, !!isFullSync);
      if (newData.loans) updatedState.loans = mergeData(updatedState.loans, newData.loans, pendingAddIds, pendingDeleteIds, !!isFullSync);
      if (newData.clients) updatedState.clients = mergeData(updatedState.clients, newData.clients, pendingAddIds, pendingDeleteIds, !!isFullSync);
      if (newData.expenses) updatedState.expenses = mergeData(updatedState.expenses, newData.expenses, pendingAddIds, pendingDeleteIds, !!isFullSync);
      if (newData.users) updatedState.users = mergeData(updatedState.users, newData.users, pendingAddIds, pendingDeleteIds, !!isFullSync);

      if (newData.branchSettings) updatedState.branchSettings = { ...prev.branchSettings, ...newData.branchSettings };

      return updatedState;
    });
  };

  // 3. SYNC HOOK
  const {
    isSyncing, isFullSyncing, syncError, isOnline, processQueue, forceFullSync, pullData,
    pushClient, pushLoan, pushPayment, pushLog, pushUser, pushSettings, addToQueue,
    setSuccessMessage, showSuccess, successMessage, queueLength, clearQueue,
    deleteRemoteLog, deleteRemotePayment, deleteRemoteClient, fetchClientPhotos
  } = useSync(handleRealtimeData);

  const doPull = () => pullData();

  const handleDeepReset = () => {
    if (confirm("¿Estás seguro? Esto borrará todos los datos locales y forzará una descarga total.")) {
      localStorage.removeItem('prestamaster_v2');
      localStorage.removeItem('last_sync_timestamp');
      localStorage.removeItem('last_sync_timestamp_v6');
      window.location.reload();
    }
  };

  // 4. COMMAND FUNCTIONS
  const handleForceSync = async (silent: boolean = false, message: string = "¡Sincronizado!", fullSync: boolean = false) => {
    if (!silent) setSuccessMessage(message);
    if (fullSync) await forceFullSync();
    else await processQueue(true);
  };

  // --- 4. EFFECTS ---
  const forceSyncRef = React.useRef(handleForceSync);
  useEffect(() => { forceSyncRef.current = handleForceSync; }, [handleForceSync]);

  // REMOVED: Duplicate sync interval - already handled by the main sync effect below (line 309)

  useEffect(() => {
    const timer = setTimeout(() => {
      // PERFORMANCE OPTIMIZATION (Zonas de mala señal / Gama Baja):
      // No guardamos las fotos en localStorage para evitar saturar los 5MB del navegador y crashear la APK.
      // Las fotos se descargan bajo demanda cuando se abre el expediente.
      const stateToPersist = {
        ...state,
        clients: (state.clients || []).map(c => ({
          ...c,
          profilePic: undefined,
          housePic: undefined,
          businessPic: undefined,
          documentPic: undefined
        }))
      };

      try {
        localStorage.setItem('prestamaster_v2', JSON.stringify(stateToPersist));
        if (state.currentUser) {
          Preferences.set({ key: 'NATIVE_CURRENT_USER', value: JSON.stringify(state.currentUser) });
        }
      } catch (e) {
        console.error("Local Storage Save Error:", e);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    const recover = async () => {
      if (state.currentUser) return;
      const { value } = await Preferences.get({ key: 'NATIVE_CURRENT_USER' });
      if (value) {
        try {
          const user = JSON.parse(value);
          setState(prev => ({ ...prev, currentUser: user }));
          setTimeout(() => handleForceSync(true), 1000);
        } catch (e) { }
      }
    };
    recover();
  }, []);

  useEffect(() => {
    startConnectionKeeper();
    const resumeListener = CapApp.addListener('appStateChange', async ({ isActive }) => {
      if (isActive) {
        const { connectToPrinter } = await import('./services/bluetoothPrinterService');
        connectToPrinter(undefined, false, true);
      }
    });

    const timer = setTimeout(() => {
      doPull();
    }, 5000);

    // OPTIMIZATION: Cooldown on focus to prevent sync storm when switching tabs
    let lastFocusSync = 0;
    const handleFocus = () => {
      const now = Date.now();
      if (now - lastFocusSync > 120000) { // Only sync if last focus sync was >2 minutes ago
        lastFocusSync = now;
        doPull();
      }
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', handleFocus);
      resumeListener.then(handle => handle.remove());
    };
  }, []);

  useEffect(() => {
    // OPTIMIZATION: Increased idle interval from 60s to 120s to reduce egress
    // OPTIMIZATION: Instant sync trigger (2s if busy, 30s if idle)
    const intervalTime = queueLength > 0 ? 2000 : 30000;
    const syncInterval = setInterval(() => {
      if (!isSyncing && isOnline && !isPrintingNow()) {
        handleForceSync(true);
      }
    }, intervalTime);

    const handleOnline = () => {
      handleForceSync(true);
    };
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('online', handleOnline);
    };
  }, [isSyncing, isOnline, queueLength]);

  const getBranchId = (user: User | null): string => {
    if (!user) return 'none';
    if (user.role === Role.ADMIN || user.role === Role.MANAGER) return user.id;
    return user.managedBy || 'none';
  };

  const filteredState = useMemo(() => {
    if (!state.currentUser) return state;
    const user = state.currentUser;
    const branchId = getBranchId(user);
    const myTeamIds = new Set<string>();
    const myDirectCollectorIds = new Set<string>();
    myTeamIds.add(user.id);

    (Array.isArray(state.users) ? state.users : []).forEach(u => {
      if (u.managedBy?.toLowerCase() === user.id.toLowerCase()) {
        myTeamIds.add(u.id.toLowerCase());
        if (u.role === Role.COLLECTOR) {
          myDirectCollectorIds.add(u.id.toLowerCase());
        }
      }
    });

    const isOurBranch = (itemBranchId: string | undefined, itemAddedBy: string | undefined, itemCollectorId: string | undefined) => {
      const myId = user.id.toLowerCase();
      if (itemAddedBy?.toLowerCase() === myId || (itemAddedBy && myDirectCollectorIds.has(itemAddedBy.toLowerCase()))) return true;
      if (itemBranchId?.toLowerCase() === branchId.toLowerCase()) return true;
      if (itemCollectorId?.toLowerCase() === myId || (itemCollectorId && myDirectCollectorIds.has(itemCollectorId.toLowerCase()))) return true;
      return false;
    };

    let clients = (Array.isArray(state.clients) ? state.clients : []).filter(c => isOurBranch(c.branchId, c.addedBy, undefined) && c.isActive !== false && !c.deletedAt);
    const activeClientIds = new Set(clients.map(c => c.id));
    let loans = (Array.isArray(state.loans) ? state.loans : []).filter(l => activeClientIds.has(l.clientId) && !l.deletedAt);
    let payments = (Array.isArray(state.payments) ? state.payments : []).filter(p => activeClientIds.has(p.clientId) && !p.deletedAt);
    let expenses = (Array.isArray(state.expenses) ? state.expenses : []).filter(e => isOurBranch(e.branchId, e.addedBy, undefined));
    let collectionLogs = (Array.isArray(state.collectionLogs) ? state.collectionLogs : []).filter(log => activeClientIds.has(log.clientId) && !log.deletedAt);
    let users = (Array.isArray(state.users) ? state.users : []).filter(u => user.role === Role.ADMIN || u.id === user.id || myTeamIds.has(u.id.toLowerCase()));

    if (user.role === Role.COLLECTOR) {
      const myAssignedClientIds = new Set<string>();
      loans.forEach(l => { if (l.collectorId === user.id) myAssignedClientIds.add(l.clientId); });
      clients = clients.filter(c => c.addedBy === user.id || myAssignedClientIds.has(c.id));
      const visibleClientIds = new Set(clients.map(c => c.id));
      loans = loans.filter(l => visibleClientIds.has(l.clientId));
      payments = payments.filter(p => visibleClientIds.has(p.clientId));
      collectionLogs = collectionLogs.filter(log => log.clientId && visibleClientIds.has(log.clientId));
      users = users.filter(u => u.id === user.id);
    }

    return { ...state, clients, loans, payments, expenses, collectionLogs, users, settings: resolvedSettings };
  }, [state, resolvedSettings]);

  // ACTION HANDLERS
  const handleLogin = (user: User) => {
    const normalizedRole = (user.role as string).toLowerCase() === 'admin' ? Role.ADMIN : user.role;
    const normalizedUser = { ...user, role: normalizedRole };
    setState(prev => ({ ...prev, currentUser: normalizedUser }));
    setActiveTab(normalizedRole === Role.COLLECTOR ? 'route' : 'dashboard');
    localStorage.removeItem('last_sync_timestamp');
    localStorage.removeItem('last_sync_timestamp_v6');
    setTimeout(() => handleForceSync(true), 100);
  };

  const handleLogout = () => setState(prev => ({ ...prev, currentUser: null }));

  const addUser = async (user: User) => {
    const newUser = { ...user, managedBy: user.managedBy || (state.currentUser?.role === Role.MANAGER || state.currentUser?.role === Role.ADMIN ? state.currentUser.id : undefined) };
    await pushUser(newUser);
    setState(prev => ({ ...prev, users: [...prev.users, newUser] }));
    await handleForceSync(false);
  };

  const updateUser = async (updatedUser: User) => {
    const userWithStamp = { ...updatedUser, updated_at: new Date().toISOString() };
    setState(prev => ({ ...prev, users: prev.users.map(u => u.id === userWithStamp.id ? userWithStamp : u), currentUser: state.currentUser?.id === userWithStamp.id ? userWithStamp : state.currentUser }));
    pushUser(userWithStamp);
    handleForceSync(false);
  };

  const deleteUser = async (userId: string) => {
    setState(prev => ({ ...prev, users: prev.users.filter(u => u.id !== userId && u.managedBy !== userId) }));
    await handleForceSync(false);
  };

  const updateSettings = async (newSettings: AppSettings) => {
    const branchId = getBranchId(state.currentUser);
    setState(prev => ({ ...prev, settings: newSettings, branchSettings: { ...(prev.branchSettings || {}), [branchId]: newSettings } }));
    pushSettings(branchId, newSettings);
    handleForceSync(false);
  };

  const addClient = async (client: Client, loan?: Loan) => {
    const branchId = getBranchId(state.currentUser);
    const newClient = { ...client, branchId, isActive: true, createdAt: new Date().toISOString(), updated_at: new Date().toISOString() };

    // Optimistic Update
    setState(prev => ({ ...prev, clients: [...prev.clients, newClient] }));

    // Background Push
    pushClient(newClient);
    if (loan) addLoan(loan);
    handleForceSync(true);
  };

  const addLoan = async (loan: Loan) => {
    const branchId = getBranchId(state.currentUser);
    const newLoan = { ...loan, branchId, updated_at: new Date().toISOString() };

    // Optimistic Update
    setState(prev => ({ ...prev, loans: [newLoan, ...prev.loans] }));

    // Background Push
    pushLoan(newLoan);
    handleForceSync(true);
  };

  const updateClient = async (updatedClient: Client) => {
    const clientWithStamp = { ...updatedClient, updated_at: new Date().toISOString() };
    setState(prev => ({ ...prev, clients: prev.clients.map(c => c.id === clientWithStamp.id ? clientWithStamp : c) }));
    pushClient(clientWithStamp);
    handleForceSync(false);
  };

  const updateLoan = async (updatedLoan: Loan) => {
    const loanWithStamp = { ...updatedLoan, updated_at: new Date().toISOString() };
    setState(prev => ({ ...prev, loans: prev.loans.map(l => l.id === loanWithStamp.id ? loanWithStamp : l) }));
    pushLoan(loanWithStamp);
    handleForceSync(false);
  };

  const addCollectionAttempt = async (log: CollectionLog) => {
    const branchId = getBranchId(state.currentUser);
    const newLog = { ...log, branchId, recordedBy: state.currentUser?.id, updated_at: new Date().toISOString() };

    // 1. ASYNC FIRST: Ensure the log is pushed/queued
    pushLog(newLog);

    // 2. CALCULATE UPDATES (Synchronous logic based on current state)
    let updatedLoans = [...state.loans];
    let updatedPayments = [...state.payments];
    const newPaymentsForSync: PaymentRecord[] = [];
    const loansToSync: Loan[] = [];

    // Si es un log de apertura, no procesamos abonos ni cuotas
    if (newLog.type === CollectionLogType.OPENING) {
      setState(prev => ({ ...prev, collectionLogs: [newLog, ...prev.collectionLogs] }));
      handleForceSync(true);
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
              created_at: new Date().toISOString()
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

    // 3. UPDATE UI (Optimistic)
    setState(prev => ({ ...prev, loans: updatedLoans, payments: updatedPayments, collectionLogs: [newLog, ...prev.collectionLogs] }));

    // 4. EXECUTE SIDE EFFECTS (Outside setState)
    if (newPaymentsForSync.length > 0 || loansToSync.length > 0) {
      for (const p of newPaymentsForSync) pushPayment(p);
      for (const l of loansToSync) pushLoan(l);
    }

    handleForceSync(true);
  };

  const deleteCollectionLog = async (logId: string) => {
    if (state.currentUser?.role === Role.COLLECTOR) {
      alert("ERROR: No tienes permisos para eliminar registros.");
      return;
    }
    await deleteRemoteLog(logId);

    const logToDelete = state.collectionLogs.find(l => l.id === logId);
    if (!logToDelete) return;

    let updatedLoans = [...state.loans];
    const recordsToReverse = state.payments.filter(p => p.id.startsWith(`pay-${logId}-`));
    const updatedPayments = state.payments.filter(p => !p.id.startsWith(`pay-${logId}-`));
    const loansToSync: Loan[] = [];

    if (logToDelete.type === CollectionLogType.PAYMENT) {
      updatedLoans = updatedLoans.map(loan => {
        if (loan.id === logToDelete.loanId) {
          const newInst = (loan.installments || []).map(i => ({ ...i }));
          recordsToReverse.forEach(rec => {
            const idx = rec.installmentNumber - 1;
            if (newInst[idx]) {
              newInst[idx].paidAmount = Math.max(0, Number(((newInst[idx].paidAmount || 0) - rec.amount).toFixed(2)));
              if (newInst[idx].paidAmount <= 0.01) newInst[idx].status = PaymentStatus.PENDING;
              else if (newInst[idx].paidAmount < newInst[idx].amount - 0.01) newInst[idx].status = PaymentStatus.PARTIAL;
              else newInst[idx].status = PaymentStatus.PAID;
            }
          });
          const allPaid = newInst.every(inst => inst.status === PaymentStatus.PAID);
          const updatedLoan = { ...loan, installments: newInst, status: allPaid ? LoanStatus.PAID : LoanStatus.ACTIVE };
          loansToSync.push(updatedLoan);
          return updatedLoan;
        }
        return loan;
      });
    }

    setState(prev => ({
      ...prev,
      loans: updatedLoans,
      payments: updatedPayments,
      collectionLogs: prev.collectionLogs.filter(l => l.id !== logId)
    }));

    if (recordsToReverse.length > 0) {
      for (const p of recordsToReverse) await deleteRemotePayment(p.id);
    }
    if (loansToSync.length > 0) {
      for (const l of loansToSync) await pushLoan(l);
    }

    await handleForceSync(true);
  };

  const updateCollectionLog = (logId: string, newAmount: number) => {
    const log = state.collectionLogs.find(l => l.id === logId);
    if (!log) return;
    deleteCollectionLog(logId);
    setTimeout(() => {
      const newLog: CollectionLog = { ...log, amount: newAmount, date: new Date().toISOString() };
      addCollectionAttempt(newLog);
    }, 10);
  };

  const updateCollectionLogNotes = (logId: string, notes: string) => {
    setState(prev => ({
      ...prev,
      collectionLogs: prev.collectionLogs.map(l => l.id === logId ? { ...l, notes } : l)
    }));
  };

  const addExpense = (expense: Expense) => {
    const branchId = getBranchId(state.currentUser);
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

  if (!state.currentUser) return <Login onLogin={handleLogin} users={state.users} onGenerateManager={() => { }} onSyncUser={handleSyncUser} onForceSync={() => handleForceSync(true)} />;

  const isPowerUser = state.currentUser.role === Role.ADMIN || state.currentUser.role === Role.MANAGER;
  const isAdmin = state.currentUser.role === Role.ADMIN;
  const t = getTranslation(state.settings.language).menu;

  return (
    <ErrorBoundary>
      <div className="flex flex-col md:flex-row min-h-full bg-slate-50 relative overflow-x-hidden">
        {/* MOBILE HEADER */}
        <header className="md:hidden bg-white border-b border-slate-100 px-4 py-3 sticky top-0 z-[100] shadow-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isMobileMenuOpen ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-600'}`}>
                <i className={`fa-solid ${isMobileMenuOpen ? 'fa-xmark' : 'fa-bars-staggered'}`}></i>
              </button>
              <div>
                <h1 className="text-sm font-black text-emerald-600 uppercase tracking-tighter leading-none">{state.settings.companyName || 'Anexo Cobro'} <span className="text-[10px] opacity-50 ml-1">v6.1.63 PWA</span></h1>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className={`text-[8px] font-black uppercase tracking-widest ${isOnline ? 'text-emerald-600' : 'text-red-600'}`}>
                    {isOnline ? 'Conectado' : 'Sin Internet'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {queueLength > 0 && <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 animate-pulse">{queueLength}</span>}
              <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 uppercase tracking-tighter">v6.1.72 PWA</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-xs font-black" onClick={() => setActiveTab('profile')}>
                {state.currentUser?.name.charAt(0)}
              </div>
            </div>
          </div>

          {/* MOBILE MENU OVERLAY */}
          {isMobileMenuOpen && (
            <div className="fixed inset-0 top-[52px] left-0 w-full h-[calc(100vh-52px)] bg-white/95 backdrop-blur-md border-b border-slate-200 py-4 px-4 grid grid-cols-2 gap-2 animate-fadeIn shadow-2xl z-[90] overflow-y-auto">
              {[
                { id: 'dashboard', icon: 'fa-chart-line', label: t.dashboard, powerOnly: true },
                { id: 'clients', icon: 'fa-users', label: t.clients, powerOnly: false },
                { id: 'loans', icon: 'fa-money-bill-wave', label: t.loans, powerOnly: false },
                { id: 'route', icon: 'fa-route', label: t.route, powerOnly: false },
                { id: 'notifications', icon: 'fa-bell', label: t.notifications, powerOnly: false },
                { id: 'collectors', icon: 'fa-user-gear', label: t.collectors, powerOnly: true },
                { id: 'performance', icon: 'fa-chart-column', label: t.performance, powerOnly: true },
                { id: 'expenses', icon: 'fa-wallet', label: t.expenses, powerOnly: true },
                { id: 'simulator', icon: 'fa-calculator', label: t.simulator, powerOnly: false },
                { id: 'reports', icon: 'fa-file-invoice-dollar', label: t.reports, powerOnly: true },
                { id: 'commission', icon: 'fa-percent', label: t.commission, powerOnly: false },
                { id: 'generator', icon: 'fa-file-signature', label: 'Pagares', powerOnly: false },
                { id: 'profile', icon: 'fa-user-circle', label: t.profile, powerOnly: false },
                { id: 'settings', icon: 'fa-gear', label: t.settings, powerOnly: false },
                { id: 'managers', icon: 'fa-user-tie', label: t.managers, adminOnly: true },
              ].filter(item => {
                if (item.adminOnly) return isAdmin;
                if (item.powerOnly) return isPowerUser;
                return true;
              }).map((item) => (
                <button key={item.id} onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 p-3 rounded-2xl transition-all border ${activeTab === item.id ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg' : 'bg-white text-slate-500 border-slate-100 active:bg-slate-50'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeTab === item.id ? 'bg-white/20' : 'bg-slate-50 text-emerald-500'}`}><i className={`fa-solid ${item.icon} text-sm`}></i></div>
                  <span className="text-[10px] font-black uppercase tracking-wider truncate">{item.label}</span>
                </button>
              ))}
              <button onClick={handleLogout} className="col-span-2 flex items-center justify-center gap-3 p-4 mt-2 rounded-2xl bg-red-50 text-red-600 border border-red-100 font-black uppercase text-[10px] tracking-widest"><i className="fa-solid fa-power-off"></i> CERRAR SESIÓN</button>
            </div>
          )}
        </header>

        <FloatingBackButton onClick={() => setActiveTab(isPowerUser ? 'dashboard' : 'route')} visible={activeTab !== 'dashboard' && activeTab !== 'route'} />
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onLogout={handleLogout}
          user={state.currentUser}
          state={filteredState}
          isSyncing={isSyncing}
          isFullSyncing={isFullSyncing}
        />
        <main className="flex-1 p-3 md:p-8 mobile-scroll-container">
          <div className="max-w-[1400px] mx-auto pb-20">
            {activeTab === 'dashboard' && isPowerUser && <Dashboard state={filteredState} />}
            {activeTab === 'clients' && <Clients state={filteredState} addClient={addClient} addLoan={addLoan} updateClient={updateClient} updateLoan={updateLoan} deleteCollectionLog={deleteCollectionLog} updateCollectionLog={updateCollectionLog} updateCollectionLogNotes={updateCollectionLogNotes} addCollectionAttempt={addCollectionAttempt} globalState={state} onForceSync={handleForceSync}
              setActiveTab={setActiveTab}
              fetchClientPhotos={fetchClientPhotos}
            />
            }
            {activeTab === 'loans' && <Loans state={filteredState} addLoan={addLoan} updateLoanDates={() => { }} addCollectionAttempt={addCollectionAttempt} deleteCollectionLog={deleteCollectionLog} onForceSync={handleForceSync} />}
            {activeTab === 'route' && <CollectionRoute state={filteredState} addCollectionAttempt={addCollectionAttempt} deleteCollectionLog={deleteCollectionLog} updateClient={updateClient} deleteClient={async (clientId: string) => {
              setState(prev => ({
                ...prev,
                clients: prev.clients.filter(c => c.id !== clientId),
                loans: prev.loans.filter(l => l.clientId !== clientId),
                collectionLogs: prev.collectionLogs.filter(l => l.clientId !== clientId),
              }));
              await deleteRemoteClient(clientId);
              await handleForceSync(true);
            }} onForceSync={handleForceSync} />}
            {activeTab === 'notifications' && <Notifications state={filteredState} />}
            {activeTab === 'expenses' && isPowerUser && <Expenses state={filteredState} addExpense={addExpense} removeExpense={removeExpense} updateInitialCapital={updateInitialCapital} />}
            {activeTab === 'commission' && <CollectorCommission state={filteredState} setCommissionPercentage={(p) => { setState(prev => ({ ...prev, commissionPercentage: p })); setTimeout(() => handleForceSync(true), 200); }} updateCommissionBrackets={updateCommissionBrackets} deleteCollectionLog={deleteCollectionLog} />}
            {activeTab === 'collectors' && <Collectors state={filteredState} onAddUser={addUser} onUpdateUser={updateUser} onDeleteUser={deleteUser} updateSettings={updateSettings} />}
            {activeTab === 'managers' && isAdmin && <Managers state={filteredState} onAddUser={addUser} onUpdateUser={updateUser} onDeleteUser={deleteUser} />}
            {activeTab === 'performance' && isPowerUser && <CollectorPerformance state={filteredState} />}
            {activeTab === 'simulator' && <Simulator settings={resolvedSettings} />}
            {activeTab === 'reports' && isPowerUser && <Reports state={filteredState} settings={resolvedSettings} />}
            {activeTab === 'settings' && <Settings state={filteredState} updateSettings={updateSettings} setActiveTab={setActiveTab} onForceSync={() => handleForceSync(true)} onClearQueue={clearQueue} isOnline={isOnline} isSyncing={isSyncing} isFullSyncing={isFullSyncing} onDeepReset={handleDeepReset} />}
            {activeTab === 'generator' && <Generator settings={filteredState.settings} />}
            {activeTab === 'profile' && <Profile state={filteredState} onUpdateUser={updateUser} />}
          </div>
        </main>
        {isPowerUser && <LicenseReminder currentUser={state.currentUser} users={state.users} />}
      </div>
    </ErrorBoundary>
  );
};

export default App;
