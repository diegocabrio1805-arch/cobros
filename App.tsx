
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { useRegisterSW } from 'virtual:pwa-register/react';
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
import { getTranslation } from './utils/translations';
import { getLocalDateStringForCountry, generateUUID } from './utils/helpers';
import { resolveSettings } from './utils/settingsHierarchy';
import { useSync } from './hooks/useSync';
import { isPrintingNow, startConnectionKeeper } from './services/bluetoothPrinterService';
import FloatingBackButton from './components/FloatingBackButton';
import LocationEnforcer from './components/LocationEnforcer';
import { Geolocation } from '@capacitor/geolocation';
import { Camera } from '@capacitor/camera';
import { Contacts } from '@capacitor-community/contacts';
import { PushNotifications } from '@capacitor/push-notifications';
import { Device } from '@capacitor/device';



const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showManagerExpiryModal, setShowManagerExpiryModal] = useState(false);
  const [showCollectorExpiryAlert, setShowCollectorExpiryAlert] = useState(false);
  const [expiringCollectorsNames, setExpiringCollectorsNames] = useState<string[]>([]);
  const [daysToExpiry, setDaysToExpiry] = useState<number | null>(null);
  const [isJumping, setIsJumping] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

  // 1. STATE INITIALIZATION (Moved to top)
  const [state, setState] = useState<AppState>(() => {
    // --- CONSTANTS ---
    const CURRENT_VERSION_ID = 'v6.1.40-ULTRA-PWA-REDUX'; // <--- UPDATED VERSION
    const lastAppVersion = localStorage.getItem('LAST_APP_VERSION_ID');
    const RESET_ID = '2026-02-10-ULTRA-PURGE-V2-ARMAGEDON';

    try {
      // FIX: Comparación estricta para asegurar que CUALQUIER cambio de versión limpie la cache vieja
      if (!lastAppVersion || lastAppVersion !== CURRENT_VERSION_ID) {
        console.log("App v6.1.14: Version mismatch detected. PURGING CACHE...");
        localStorage.setItem('LAST_APP_VERSION_ID', CURRENT_VERSION_ID);
        localStorage.removeItem('last_sync_timestamp');
        localStorage.removeItem('last_sync_timestamp_v6');
        localStorage.removeItem('prestamaster_v2');
        // Clear queue too to avoid garbage IDs
        localStorage.removeItem('syncQueue');
      }
    } catch (e) {
      console.error("Version Check Error:", e);
    }

    const saved = localStorage.getItem('prestamaster_v2');
    let parsed = null;
    try {
      if (saved) parsed = JSON.parse(saved);
    } catch (e) {
      localStorage.removeItem('prestamaster_v2');
    }

    const SYSTEM_ADMIN_ID = 'b3716a78-fb4f-4918-8c0b-92004e3d63ec';
    const defaultSettings: AppSettings = { language: 'es', country: 'CO', numberFormat: 'dot' };

    let rawData = parsed;
    if (rawData) {
      const json = JSON.stringify(rawData).replace(/"admin-1"/g, `"${SYSTEM_ADMIN_ID}"`);
      rawData = JSON.parse(json);
    }

    const initialAdmin: User = { id: SYSTEM_ADMIN_ID, name: 'Administrador', role: Role.ADMIN, username: '123456', password: '123456' };
    const users = (rawData?.users || [initialAdmin]).map((u: any) => ({ ...u, role: u.role === 'admin' ? Role.ADMIN : u.role }));

    return {
      clients: rawData?.clients || [],
      loans: rawData?.loans || [],
      payments: rawData?.payments || [],
      expenses: rawData?.expenses || [],
      collectionLogs: rawData?.collectionLogs || [],
      users: users,
      currentUser: rawData?.currentUser || null,
      commissionPercentage: rawData?.commissionPercentage ?? 10,
      commissionBrackets: rawData?.commissionBrackets || [],
      settings: rawData?.settings || defaultSettings,
      branchSettings: rawData?.branchSettings || {}
    };
  });

  const resolvedSettings = useMemo(() => {
    return resolveSettings(state.currentUser, state.branchSettings || {}, state.users, { language: 'es', country: 'CO', numberFormat: 'dot' });
  }, [state.currentUser, state.branchSettings, state.users]);

  // 2. HELPER FUNCTIONS
  const mergeData = <T extends { id: string, updated_at?: string }>(
    local: T[],
    remote: T[],
    pendingAddIds: Set<string> = new Set(),
    pendingDeleteIds: Set<string> = new Set(),
    isFullSync: boolean = false
  ): T[] => {
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

    const remoteMap = new Map(remote.map(i => [i.id, i]));
    const result: T[] = [...remote.filter(r => !pendingDeleteIds.has(r.id) && !(r as any).deletedAt)];
    const resultMap = new Map(result.map(i => [i.id, i]));

    local.forEach(l => {
      if (!l || !l.id || pendingDeleteIds.has(l.id)) return;
      const r = remoteMap.get(l.id);
      if (!r) {
        if (pendingAddIds.has(l.id) && !resultMap.has(l.id)) result.push(l);
      } else if (l.updated_at && r.updated_at && new Date(l.updated_at).getTime() > new Date(r.updated_at).getTime()) {
        const idx = result.findIndex(item => item.id === l.id);
        if (idx !== -1) result[idx] = l;
      }
    });

    if (!isFullSync) {
      local.forEach(l => {
        if (l && l.id && !pendingDeleteIds.has(l.id) && !remoteMap.has(l.id) && !resultMap.has(l.id)) {
          result.push(l);
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
    deleteRemoteLog, deleteRemotePayment, deleteRemoteClient
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
    // REMOVED: if (isSyncing) return; // Allow manual/automatic retry to ensure visibility
    if (fullSync) await forceFullSync();
    else await processQueue(true);
  };

  // PWA UPDATE HANDLING
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error) {
      console.log('SW Registration Error:', error);
    },
  });


  // --- 4. EFFECTS ---
  const forceSyncRef = React.useRef(handleForceSync);
  useEffect(() => { forceSyncRef.current = handleForceSync; }, [handleForceSync]);

  useEffect(() => {
    if (!state.currentUser) return;
    const isAndroid = Capacitor.getPlatform() === 'android';
    const syncInterval = setInterval(() => {
      // FORCE SILENCE ON WEB ALWAYS, ONLY SHOW ON ANDROID
      forceSyncRef.current(!isAndroid, isAndroid ? "¡ARMAGEDON ACTIVO!" : "", true);
    }, 5000);
    return () => clearInterval(syncInterval);
  }, [state.currentUser?.id]);

  useEffect(() => {
    localStorage.setItem('prestamaster_v2', JSON.stringify(state));
    if (state.currentUser) Preferences.set({ key: 'NATIVE_CURRENT_USER', value: JSON.stringify(state.currentUser) });
    else Preferences.remove({ key: 'NATIVE_CURRENT_USER' });
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
    // START BLUETOOTH KEEPER
    startConnectionKeeper();

    // BACKGROUND/RESUME HANDLER
    const resumeListener = CapApp.addListener('appStateChange', async ({ isActive }) => {
      if (isActive) {
        console.log("App resumed: Checking Bluetooth connection...");
        // Reconnect silently if needed
        const { connectToPrinter } = await import('./services/bluetoothPrinterService');
        connectToPrinter(undefined, false, true);
      }
    });

    const timer = setTimeout(() => {
      console.log("Mount Auto-Pull Triggered");
      doPull();
    }, 5000);

    window.addEventListener('focus', doPull);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', doPull);
      resumeListener.then(handle => handle.remove());
    };
  }, []);

  useEffect(() => {
    // Dynamic Background Sync
    // High Data Usage (Pending Queue): Sync every 10s
    // Low Data Usage (Idle): Sync every 60s
    const intervalTime = queueLength > 0 ? 10000 : 60000;

    const syncInterval = setInterval(() => {
      // Skip sync if already syncing, offline, or PRINTING
      if (!isSyncing && isOnline && !isPrintingNow()) {
        const isSilent = true;
        // console.log(`[Background Sync] Pulse (Interval: ${intervalTime}ms)`); 
        handleForceSync(isSilent);
      }
    }, intervalTime);

    // Immediate sync when coming online
    const handleOnline = () => {
      console.log("[Network] Back Online - Forcing Sync");
      handleForceSync(true);
    };
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('online', handleOnline);
    };
  }, [isSyncing, isOnline, queueLength]);

  useEffect(() => {
    let syncHangingTimeout: any;
    if (isSyncing) {
      syncHangingTimeout = setTimeout(() => {
        console.warn("Sync seems to be hanging, forcing reset...");
        clearQueue();
      }, 120000);
    }
    return () => {
      if (syncHangingTimeout) clearTimeout(syncHangingTimeout);
    };
  }, [isSyncing]);

  const getBranchId = (user: User | null): string => {
    if (!user) return 'none';
    if (user.role === Role.ADMIN || user.role === Role.MANAGER) return user.id;
    return user.managedBy || 'none';
  };

  const filteredState = useMemo(() => {
    if (!state.currentUser) return state;
    const user = state.currentUser;
    const branchId = getBranchId(user);
    const SYSTEM_ADMIN_ID = 'b3716a78-fb4f-4918-8c0b-92004e3d63ec';
    const LEGACY_ADMIN_ID = '00000000-0000-0000-0000-000000000001';

    // 1. Identify "My Team" (Me + Any direct report)
    const myTeamIds = new Set<string>();
    const myDirectCollectorIds = new Set<string>();
    myTeamIds.add(user.id);

    // Pass 1: Add Direct Reports
    state.users.forEach(u => {
      if (u.managedBy?.toLowerCase() === user.id.toLowerCase()) {
        myTeamIds.add(u.id.toLowerCase());
        if (u.role === Role.COLLECTOR) {
          myDirectCollectorIds.add(u.id.toLowerCase());
        }
      }
    });

    const isOurBranch = (itemBranchId: string | undefined, itemAddedBy: string | undefined, itemCollectorId: string | undefined) => {
      const myId = user.id.toLowerCase();
      const bId = branchId.toLowerCase();
      const iBranchId = itemBranchId?.toLowerCase();
      const iAddedBy = itemAddedBy?.toLowerCase();
      const iCollectorId = itemCollectorId?.toLowerCase();

      // Regla 1: Autoría - Si YO o uno de mis COBRADORES DIRECTOS lo creó.
      if (iAddedBy === myId || (iAddedBy && myDirectCollectorIds.has(iAddedBy))) return true;

      // Regla 2: Asignación por Sucursal - Si está asignado a mi propio ID de Rama (Único para cada Admin/Gerente)
      // Nota: branchId para administradores es su propio user.id
      if (iBranchId === bId && bId !== '00000000-0000-0000-0000-000000000001') return true;

      // Regla 3: Asignación Directa - Si está asignado a mí O a un cobrador de mi equipo
      if (iCollectorId === myId || (iCollectorId && myDirectCollectorIds.has(iCollectorId))) return true;

      return false;
    };

    // SOFT DELETE FILTER: Only show active clients (unless specifically viewing archives, but standard view hides them)
    // Also Admin sees everything, but even Admin shouldn't see "Deleted" clients in the main list.
    // If we want an "Archive", we'd add a toggle. For now, User wants them GONE.
    let clients = state.clients.filter(c => isOurBranch(c.branchId, c.addedBy, undefined) && c.isActive !== false && !c.deletedAt);

    // Performance optimization: Create a Set of visible/active client IDs
    const activeClientIds = new Set(clients.map(c => c.id));

    // Filter related data to only show what belongs to visible clients
    // This ensures that if a client is "Deleted" (Soft), their loans/payments also disappear from the UI.
    let loans = state.loans.filter(l => activeClientIds.has(l.clientId) && !l.deletedAt);
    let payments = state.payments.filter(p => activeClientIds.has(p.clientId) && !p.deletedAt);
    let expenses = state.expenses.filter(e => isOurBranch(e.branchId, e.addedBy, undefined)); // Expenses don't have deletedAt yet or handle differently
    let collectionLogs = state.collectionLogs.filter(log => activeClientIds.has(log.clientId) && !log.deletedAt);

    let users = state.users.filter(u => {
      if (u.id === user.id) return true;
      if (myTeamIds.has(u.id)) return true;
      return false;
    });

    if (user.role === Role.COLLECTOR) {
      // Regla de Oro: El cobrador debe ver TODO el historial de sus clientes, 
      // incluso si lo registró otro administrador o cobrador anteriormente.
      // But purely restricted to: Assigned to ME or Added by ME

      // Clients I explicitly need to see:
      // 1. Added by me
      // 2. I have an active loan assigned to me for them

      const myAssignedClientIds = new Set<string>();
      state.loans.forEach(l => {
        if (l.collectorId === user.id) myAssignedClientIds.add(l.clientId);
      });

      clients = clients.filter(c => c.addedBy === user.id || myAssignedClientIds.has(c.id));

      const visibleClientIds = new Set(clients.map(c => c.id));
      loans = loans.filter(l => visibleClientIds.has(l.clientId));
      payments = payments.filter(p => visibleClientIds.has(p.clientId));
      collectionLogs = collectionLogs.filter(log => log.clientId && visibleClientIds.has(log.clientId));

      // Collectors only see themselves in user lists (usually)
      users = users.filter(u => u.id === user.id);
    }

    return { ...state, clients, loans, payments, expenses, collectionLogs, users, settings: resolvedSettings };
  }, [state]);

  // REGISTRO AUTOMÁTICO DE INICIO DE JORNADA (🏁)
  useEffect(() => {
    const recordOpening = async () => {
      if (!state.currentUser) return;

      const today = new Date().toISOString().split('T')[0];
      const hasOpeningToday = state.collectionLogs.some(log =>
        log.type === CollectionLogType.OPENING &&
        log.recordedBy === state.currentUser?.id &&
        log.date.startsWith(today)
      );

      if (!hasOpeningToday) {
        try {
          // Intentar obtener ubicación para marcar el inicio
          const position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 10000
          });

          const newLog: CollectionLog = {
            id: generateUUID(),
            clientId: '00000000-0000-0000-0000-000000000000', // System placeholder
            loanId: '00000000-0000-0000-0000-000000000000',   // System placeholder
            type: CollectionLogType.OPENING,
            date: new Date().toISOString(),
            location: { lat: position.coords.latitude, lng: position.coords.longitude },
            recordedBy: state.currentUser.id
          };

          addCollectionAttempt(newLog);
          console.log("Inicio de jornada registrado en:", position.coords.latitude, position.coords.longitude);
        } catch (geoErr) {
          console.warn("No se pudo obtener ubicación para inicio de jornada:", geoErr);
          // Opcional: Registrar apertura sin GPS (0,0) si es crítico, 
          // pero el mapa filtrará (0,0), así que mejor no si queremos precisión.
        }
      }
    };

    // Pequeño delay para asegurar que el estado está listo
    const timer = setTimeout(recordOpening, 3000);
    return () => clearTimeout(timer);
  }, [state.currentUser?.id, state.collectionLogs.length]);

  const handleLogin = (user: User) => {
    // Normalizar rol 'admin' a Role.ADMIN ('Administrador') para compatibilidad con filtros
    const normalizedRole = (user.role as string).toLowerCase() === 'admin' ? Role.ADMIN : user.role;
    const normalizedUser = { ...user, role: normalizedRole };

    setState(prev => ({ ...prev, currentUser: normalizedUser }));
    const branchId = getBranchId(normalizedUser);
    if (branchId && branchId !== 'none') {
      localStorage.setItem('LAST_VALID_BRANCH_ID', branchId);
    }
    // CRITICAL FIX: Clear sync timestamp to force full resync on login
    // This ensures APK gets fresh data and removes any incorrectly cached clients
    localStorage.removeItem('last_sync_timestamp');
    localStorage.removeItem('last_sync_timestamp_v6');
    console.log('[Login] Cleared sync timestamps - forcing full data resync');

    // Force immediate sync on login to ensure fresh data
    setTimeout(() => handleForceSync(true), 100);
    if (user.role === Role.MANAGER) {
      if (user.expiryDate) {
        const expiry = new Date(user.expiryDate + 'T00:00:00');
        const diffDays = Math.ceil((expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 5 && diffDays >= 0) {
          setDaysToExpiry(diffDays);
          setShowManagerExpiryModal(true);
        }
      }
      const expiringColls = state.users.filter(u => u.managedBy === user.id && u.role === Role.COLLECTOR && u.expiryDate && Math.ceil((new Date(u.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 5);
      if (expiringColls.length > 0) {
        setExpiringCollectorsNames(expiringColls.map(c => c.name));
        setShowCollectorExpiryAlert(true);
        setIsJumping(true);
        setTimeout(() => setIsJumping(false), 3000);
      }
    }
  };

  const handleLogout = () => setState(prev => ({ ...prev, currentUser: null }));

  const handleGenerateManager = async (data: { name: string, username: string, pass: string }) => {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 20);
    const newUser: User = { id: generateUUID(), name: data.name, username: data.username, password: data.pass, role: Role.MANAGER, expiryDate: expiry.toISOString().split('T')[0], blocked: false };
    await pushUser(newUser);
    setState(prev => ({ ...prev, users: [...prev.users, newUser] }));
    await handleForceSync(false);
  };

  const addUser = async (user: User) => {
    const newUser = { ...user, managedBy: user.managedBy || (state.currentUser?.role === Role.MANAGER || state.currentUser?.role === Role.ADMIN ? state.currentUser.id : undefined) };
    await pushUser(newUser);
    setState(prev => ({ ...prev, users: [...prev.users, newUser] }));
    await handleForceSync(false);
  };

  const updateUser = async (updatedUser: User) => {
    await pushUser(updatedUser);
    setState(prev => ({ ...prev, users: prev.users.map(u => u.id === updatedUser.id ? updatedUser : u), currentUser: state.currentUser?.id === updatedUser.id ? updatedUser : state.currentUser }));
    await handleForceSync(false);
  };

  const deleteUser = async (userId: string) => {
    // Note: Assuming there's no pushDeleteUser yet, but following the pattern for local state
    setState(prev => ({ ...prev, users: prev.users.filter(u => u.id !== userId && u.managedBy !== userId) }));
    await handleForceSync(false);
  };

  const updateSettings = async (newSettings: AppSettings) => {
    const branchId = getBranchId(state.currentUser);
    setState(prev => ({
      ...prev,
      settings: newSettings, // Temporal para compatibilidad inmediata en UI
      branchSettings: {
        ...(prev.branchSettings || {}),
        [branchId]: newSettings
      }
    }));
    await pushSettings(branchId, newSettings);
    await handleForceSync(false);
  };


  const addClient = async (client: Client, loan?: Loan) => {
    const branchId = getBranchId(state.currentUser);
    const newClient = { ...client, branchId, isActive: true, createdAt: new Date().toISOString() };

    // Push client and check result
    const clientSynced = await pushClient(newClient);

    // Update state with client only if not already there (prevent Realtime race)
    setState(prev => {
      if (prev.clients.some(c => c.id === newClient.id)) return prev;
      return {
        ...prev,
        clients: [...prev.clients, newClient]
      };
    });

    if (loan) {
      const newLoan = { ...loan, branchId };
      const newLog: CollectionLog = {
        id: `init-${loan.id}`,
        loanId: loan.id,
        clientId: client.id,
        branchId,
        type: CollectionLogType.PAYMENT,
        amount: loan.principal,
        date: loan.createdAt,
        location: { lat: 0, lng: 0 },
        isOpening: true,
        recordedBy: state.currentUser?.id
      };

      if (clientSynced) {
        // Push loan and log SEQUENTIALLY to prevent FK Race Conditions
        // Log depends on Loan, so Loan must be synced first.
        await pushLoan(newLoan);
        await pushLog(newLog);
        handleForceSync(true);
      } else {
        // If client is queued (offline/error), queue subsequent dependent operations
        addToQueue('ADD_LOAN', newLoan);
        addToQueue('ADD_LOG', newLog);
      }

      setState(prev => {
        const hasLoan = prev.loans.some(l => l.id === newLoan.id);
        const hasLog = prev.collectionLogs.some(log => log.id === newLog.id);

        return {
          ...prev,
          loans: hasLoan ? prev.loans : [newLoan, ...prev.loans],
          collectionLogs: hasLog ? prev.collectionLogs : [newLog, ...prev.collectionLogs]
        };
      });
    }

    await handleForceSync(true);
  };

  const addLoan = async (loan: Loan) => {
    const branchId = getBranchId(state.currentUser);
    const newLoan = { ...loan, branchId };

    // pushLoan returns boolean now
    const loanSynced = await pushLoan(newLoan);

    const initLog: CollectionLog = {
      id: `init-${loan.id}`,
      loanId: loan.id,
      clientId: loan.clientId,
      branchId,
      type: CollectionLogType.PAYMENT,
      amount: loan.principal,
      date: loan.createdAt,
      location: { lat: 0, lng: 0 },
      isOpening: true,
      recordedBy: state.currentUser?.id
    };

    if (loanSynced) {
      await pushLog(initLog);
      handleForceSync(true);
    } else {
      addToQueue('ADD_LOG', initLog);
    }

    setState(prev => ({ ...prev, loans: [newLoan, ...prev.loans], collectionLogs: [initLog, ...prev.collectionLogs] }));
    await handleForceSync(true);
  };



  const updateClient = async (updatedClient: Client) => {
    await pushClient(updatedClient);
    setState(prev => ({ ...prev, clients: prev.clients.map(c => c.id === updatedClient.id ? updatedClient : c) }));
    await handleForceSync(false);
  };

  const deleteClient = async (clientId: string) => {
    // SOFT DELETE LOGIC
    // We update local state to hide it immediately (by updating isActive or just removing from array if we want it gone)
    // The previous 'FilteredState' change ensures that if we mark it isActive=false, it disappears.

    // However, to be "Gone" instantly from the UI without waiting for a re-render of filteredState might be fine,
    // but updating the actual object in state is safer for sync.

    // OPTION: We remove it from the 'clients' array locally so it's instantly gone.
    // AND we call deleteRemoteClient which will push the "is_active = false" update to Supabase.

    if (isOnline) {
      await deleteRemoteClient(clientId);
    } else {
      // Queue it? deleteRemoteClient handles queuing.
      deleteRemoteClient(clientId);
    }

    setState(prev => ({
      ...prev,
      // We remove it from the list entirely for immediate feedback
      clients: prev.clients.filter(c => c.id !== clientId),
      // We also remove related data from view
      loans: prev.loans.filter(l => l.clientId !== clientId),
      payments: prev.payments.filter(p => p.clientId !== clientId),
      collectionLogs: prev.collectionLogs.filter(l => l.clientId !== clientId)
    }));

    // CRITICAL: Force FULL sync to trigger realtime propagation
    // This ensures other users (web/APK) see the deletion immediately
    await handleForceSync(true);
  };

  const updateLoan = async (updatedLoan: Loan) => {
    await pushLoan(updatedLoan);
    setState(prev => ({ ...prev, loans: prev.loans.map(l => l.id === updatedLoan.id ? updatedLoan : l) }));
    await handleForceSync(false);
  };

  const addCollectionAttempt = async (log: CollectionLog) => {
    const branchId = getBranchId(state.currentUser);
    const newLog = { ...log, branchId, recordedBy: state.currentUser?.id };

    // 1. ASYNC FIRST: Ensure the log is pushed/queued
    await pushLog(newLog);

    // 2. CALCULATE UPDATES (Synchronous logic based on current state)
    let updatedLoans = [...state.loans];
    let updatedPayments = [...state.payments];
    const newPaymentsForSync: PaymentRecord[] = [];
    const loansToSync: Loan[] = [];

    // Si es un log de apertura, no procesamos abonos ni cuotas
    if (newLog.type === CollectionLogType.OPENING) {
      setState(prev => ({ ...prev, collectionLogs: [newLog, ...prev.collectionLogs] }));
      return;
    }

    if (newLog.type === CollectionLogType.PAYMENT && newLog.amount) {
      let totalToApply = Math.round(newLog.amount * 100) / 100;
      updatedLoans = updatedLoans.map(loan => {
        if (loan.id === newLog.loanId) {
          const newInstallments = (loan.installments || []).map(i => ({ ...i }));

          // Define helper once inside map to avoid scope issues or move outside if possible. 
          // Since it's a small helper, defining it here is fine but ensure no duplication.
          const isValidUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

          for (let i = 0; i < newInstallments.length && totalToApply > 0.01; i++) {
            const inst = newInstallments[i];
            if (inst.status === PaymentStatus.PAID) continue;

            const remainingInInst = Math.round((inst.amount - (inst.paidAmount || 0)) * 100) / 100;
            const appliedToInst = Math.min(totalToApply, remainingInInst);
            inst.paidAmount = Math.round(((inst.paidAmount || 0) + appliedToInst) * 100) / 100;
            totalToApply = Math.round((totalToApply - appliedToInst) * 100) / 100;
            inst.status = inst.paidAmount >= inst.amount - 0.01 ? PaymentStatus.PAID : PaymentStatus.PARTIAL;

            const secureBranchId = (loan.branchId && isValidUuid(loan.branchId)) ? loan.branchId : branchId;

            const pRec: PaymentRecord = {
              id: `pay-${newLog.id}-${inst.number}`, // REVERTED TO PREFIX: Required for deletion linkage
              loanId: newLog.loanId,
              clientId: newLog.clientId,
              collectorId: state.currentUser?.id,
              branchId: secureBranchId,
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
          const finalBranchId = (loan.branchId && isValidUuid(loan.branchId)) ? loan.branchId : branchId;

          const updatedLoan = { ...loan, installments: newInstallments, status: allPaid ? LoanStatus.PAID : LoanStatus.ACTIVE, branchId: finalBranchId };
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
      await Promise.all([
        ...newPaymentsForSync.map(p => pushPayment(p)),
        ...loansToSync.map(l => pushLoan(l))
      ]);
    }

    await handleForceSync(true);
  };

  const deleteCollectionLog = async (logId: string) => {
    // SECURITY CHECK: Collectors cannot delete logs
    if (state.currentUser?.role === Role.COLLECTOR) {
      alert("ERROR: No tienes permisos para eliminar registros.");
      return;
    }
    // Notify remote DB first (or queue if offline)
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
              if (newInst[idx].paidAmount <= 0.01) {
                newInst[idx].status = PaymentStatus.PENDING;
              } else if (newInst[idx].paidAmount < newInst[idx].amount - 0.01) {
                newInst[idx].status = PaymentStatus.PARTIAL;
              } else {
                newInst[idx].status = PaymentStatus.PAID;
              }
            }
          });
          // Re-calc status
          const allPaid = newInst.every(inst => inst.status === PaymentStatus.PAID);
          const updatedLoan = { ...loan, installments: newInst, status: allPaid ? LoanStatus.PAID : LoanStatus.ACTIVE };
          loansToSync.push(updatedLoan);
          return updatedLoan;
        }
        return loan;
      });
    }

    // Update UI (Optimistic)
    setState(prev => ({
      ...prev,
      loans: updatedLoans,
      payments: updatedPayments,
      collectionLogs: prev.collectionLogs.filter(l => l.id !== logId)
    }));

    // Async side effects (Outside setState)
    if (recordsToReverse.length > 0) {
      for (const p of recordsToReverse) await deleteRemotePayment(p.id);
    }
    if (loansToSync.length > 0) {
      for (const l of loansToSync) await pushLoan(l);
    }

    // CRITICAL: Force FULL sync to trigger realtime propagation
    // This ensures other users (web/APK) see the deletion immediately
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

  if (!state.currentUser) return <Login onLogin={handleLogin} users={state.users} onGenerateManager={handleGenerateManager} onSyncUser={handleSyncUser} onForceSync={() => handleForceSync(true)} />;

  const isPowerUser = state.currentUser.role === Role.ADMIN || state.currentUser.role === Role.MANAGER;
  const isAdmin = state.currentUser.role === Role.ADMIN;
  const t = getTranslation(state.settings.language).menu;

  const handleBack = () => {
    if (activeTab !== 'dashboard' && activeTab !== 'route') {
      setActiveTab(isPowerUser ? 'dashboard' : 'route');
    }
  };

  const isHomeTab = activeTab === 'dashboard' || activeTab === 'route';

  return (
    <div className="flex flex-col md:flex-row min-h-full bg-slate-50 relative overflow-x-hidden">
      <FloatingBackButton onClick={handleBack} visible={!isHomeTab} />
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        user={state.currentUser}
        state={filteredState}
        isSyncing={isSyncing}
        isFullSyncing={isFullSyncing}
      />

      {showManagerExpiryModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-amber-400 w-full max-w-md rounded-[2.5rem] shadow-2xl relative overflow-hidden animate-scaleIn border-4 border-amber-300">
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-white/30 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <i className="fa-solid fa-triangle-exclamation text-3xl text-amber-900"></i>
              </div>
              <h3 className="text-2xl font-black text-amber-950 uppercase tracking-tighter">¡ATENCIÓN GERENTE!</h3>
              <p className="text-amber-900 font-bold leading-tight">
                Su cuenta de administración está próxima a vencer. <br />
                <span className="text-3xl font-black block mt-2">FALTAN {daysToExpiry} DÍAS</span>
              </p>
              <button onClick={() => setShowManagerExpiryModal(false)} className="w-full py-4 bg-amber-950 text-amber-400 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">ENTENDIDO</button>
            </div>
            <button onClick={() => setShowManagerExpiryModal(false)} className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-amber-950/40 hover:text-amber-950 transition-colors"><i className="fa-solid fa-xmark text-2xl"></i></button>
          </div>
        </div>
      )}

      {showCollectorExpiryAlert && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] relative overflow-hidden animate-scaleIn border-b-8 border-red-600">
            <button onClick={() => setShowCollectorExpiryAlert(false)} className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center text-slate-500 hover:text-red-600 transition-colors z-20"><i className="fa-solid fa-circle-xmark text-2xl"></i></button>

            <div className="h-48 w-full overflow-hidden relative flex items-center justify-center bg-[#0f172a]">
              <div className={`${isJumping ? 'jump-3s' : ''} transition-all duration-300`}>
                <img
                  src="https://cdn-icons-png.flaticon.com/512/963/963385.png"
                  alt="Motorcycle Helmet Retro"
                  className="w-32 h-32 object-contain filter drop-shadow-[0_20px_20px_rgba(0,0,0,0.5)]"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent"></div>
              <div className="absolute bottom-4 left-6 text-white">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">Alerta Urgente</p>
                <h3 className="text-xl font-black uppercase tracking-tighter">Vencimientos Próximos</h3>
              </div>
            </div>

            <div className="p-8 space-y-4">
              <p className="text-slate-700 font-black text-sm uppercase leading-relaxed">
                Gerente, hay cobradores con menos de <span className="text-red-600 font-black underline">5 DÍAS</span> de vigencia:
              </p>
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                {expiringCollectorsNames.map((name, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-4 bg-red-50 rounded-2xl border border-red-100 shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white">
                      <i className="fa-solid fa-motorcycle"></i>
                    </div>
                    <span className="text-xs font-black text-slate-950 uppercase">{name}</span>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-slate-100">
                <button onClick={() => setShowCollectorExpiryAlert(false)} className="w-full py-4 bg-[#0f172a] text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">GESTIONAR AHORA</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GREEN SUCCESS WINDOW */}
      {/* GREEN SUCCESS WINDOW */}
      {showSuccess && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[2000] w-[90%] max-w-sm">
          <div className="bg-emerald-500 text-white rounded-2xl shadow-2xl p-4 flex items-center gap-4 animate-scaleIn border-b-4 border-emerald-700">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shadow-inner">
              <i className="fa-solid fa-check text-2xl animate-pulse"></i>
            </div>
            <div>
              <h3 className="font-black uppercase text-sm tracking-wider">{successMessage || "¡Sincronizado!"}</h3>
              <p className="text-xs font-bold opacity-90">Datos actualizados en la nube.</p>
            </div>
          </div>
        </div>
      )}

      {/* SYNC STATUS - Blue for Progress */}
      {syncError && syncError.startsWith('Sincronizando') && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[2000] w-[90%] max-w-sm">
          <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl shadow-lg flex items-center gap-3 animate-slideDown">
            <i className="fa-solid fa-rotate animate-spin"></i>
            <span className="font-bold text-xs uppercase tracking-wider">{syncError}</span>
          </div>
        </div>
      )}

      {/* ERROR BANNER - ONLY VISIBLE FOR ADMIN AS PER USER REQUEST */}
      {isAdmin && syncError && !syncError.startsWith('Sincronizando') && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[2000] w-[95%] max-w-md">
          <div className="bg-red-500 text-white rounded-2xl shadow-2xl p-4 flex items-center gap-4 animate-scaleIn border-b-4 border-red-700">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shadow-inner">
              <i className="fa-solid fa-triangle-exclamation text-2xl"></i>
            </div>
            <div>
              <h3 className="font-black uppercase text-sm tracking-widest">Error de Conexión</h3>
              <p className="text-[10px] font-bold opacity-90 leading-tight">{syncError}</p>
            </div>
          </div>
        </div>
      )}

      <header className="md:hidden bg-white border-b border-slate-100 px-4 py-3 sticky top-0 z-[100] shadow-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            {!isHomeTab ? (
              <button onClick={handleBack} className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center transition-all active:scale-90">
                <i className="fa-solid fa-chevron-left"></i>
              </button>
            ) : (
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isMobileMenuOpen ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-600'}`}>
                <i className={`fa-solid ${isMobileMenuOpen ? 'fa-xmark' : 'fa-bars-staggered'}`}></i>
              </button>
            )}
            <div>
              <h1 className="text-sm font-black text-emerald-600 uppercase tracking-tighter leading-none">Anexo Cobro <span className="text-[10px] opacity-50 ml-1">v6.1.39 PWA</span></h1>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className={`text-[8px] font-black uppercase tracking-widest ${isOnline ? 'text-emerald-600' : 'text-red-600'}`}>
                  {isOnline ? 'Conectado' : 'Sin Internet'}
                </span>
                {queueLength > 0 && (
                  <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md animate-bounce border border-amber-200">
                    {queueLength} pendientes
                  </span>
                )}
              </div>
            </div>
          </div>

          {!isHomeTab && (
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isMobileMenuOpen ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-600'}`}>
              <i className={`fa-solid ${isMobileMenuOpen ? 'fa-xmark' : 'fa-bars-staggered'}`}></i>
            </button>
          )}
        </div>

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
            {isAdmin && (
              <button onClick={() => { handleForceSync(false, "¡Sincronización Total Completa!", true); setIsMobileMenuOpen(false); }} className="col-span-2 flex flex-col items-center justify-center gap-1 p-4 bg-emerald-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-900/40 border-b-4 border-emerald-900 active:scale-95 transition-all">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-bolt-lightning text-amber-400"></i> ACTIVADOR: SINCRONIZACIÓN TOTAL
                </div>
                {queueLength > 0 && <span className="bg-amber-400 text-slate-900 px-2 py-0.5 rounded-full text-[8px] animate-pulse">{queueLength} PENDIENTES DE SUBIR</span>}
              </button>
            )}
            <button onClick={handleLogout} className="col-span-2 flex items-center justify-center gap-3 p-4 mt-2 rounded-2xl bg-red-50 text-red-600 border border-red-100 font-black uppercase text-[10px] tracking-widest"><i className="fa-solid fa-power-off"></i> CERRAR SESIÓN</button>
          </div>
        )}
      </header>

      <main className="flex-1 p-3 md:p-8 mobile-scroll-container">
        <div className="max-w-[1400px] mx-auto pb-20">
          {activeTab === 'dashboard' && isPowerUser && <Dashboard state={filteredState} />}
          {activeTab === 'clients' && <Clients state={filteredState} addClient={addClient} addLoan={addLoan} updateClient={updateClient} updateLoan={updateLoan} deleteCollectionLog={deleteCollectionLog} updateCollectionLog={updateCollectionLog} updateCollectionLogNotes={updateCollectionLogNotes} addCollectionAttempt={addCollectionAttempt} globalState={state} onForceSync={handleForceSync} setActiveTab={setActiveTab} />}
          {activeTab === 'loans' && <Loans state={filteredState} addLoan={addLoan} updateLoanDates={() => { }} addCollectionAttempt={addCollectionAttempt} deleteCollectionLog={deleteCollectionLog} onForceSync={handleForceSync} />}
          {activeTab === 'route' && <CollectionRoute state={filteredState} addCollectionAttempt={addCollectionAttempt} deleteCollectionLog={deleteCollectionLog} updateClient={updateClient} deleteClient={deleteClient} onForceSync={handleForceSync} />}
          {activeTab === 'notifications' && <Notifications state={filteredState} />}
          {activeTab === 'expenses' && isPowerUser && <Expenses state={filteredState} addExpense={addExpense} removeExpense={removeExpense} updateInitialCapital={updateInitialCapital} />}
          {activeTab === 'commission' && <CollectorCommission state={filteredState} setCommissionPercentage={(p) => { setState(prev => ({ ...prev, commissionPercentage: p })); setTimeout(() => handleForceSync(true), 200); }} updateCommissionBrackets={updateCommissionBrackets} deleteCollectionLog={deleteCollectionLog} />}
          {activeTab === 'collectors' && isPowerUser && <Collectors state={filteredState} onAddUser={addUser} onUpdateUser={updateUser} onDeleteUser={deleteUser} updateSettings={updateSettings} />}
          {activeTab === 'managers' && isAdmin && <Managers state={filteredState} onAddUser={addUser} onUpdateUser={updateUser} onDeleteUser={deleteUser} />}
          {activeTab === 'performance' && isPowerUser && <CollectorPerformance state={filteredState} />}
          {activeTab === 'simulator' && <Simulator settings={resolvedSettings} />}
          {activeTab === 'reports' && isPowerUser && <Reports state={filteredState} settings={resolvedSettings} />}
          {activeTab === 'settings' && <Settings
            state={filteredState}
            updateSettings={updateSettings}
            setActiveTab={setActiveTab}
            onForceSync={() => handleForceSync(true)}
            onClearQueue={clearQueue}
            isOnline={isOnline}
            isSyncing={isSyncing}
            isFullSyncing={isFullSyncing}
            onDeepReset={handleDeepReset}
          />}
          {activeTab === 'profile' && <Profile state={filteredState} onUpdateUser={updateUser} />}
        </div>
      </main>

      {/* GPS ENFORCEMENT */}
      <LocationEnforcer
        isRequired={state.currentUser?.requiresLocation || false}
        onLocationEnabled={() => {
          console.log('Location enabled successfully');
        }}
      />

      {/* CLEAN PRODUCTION v5.3.0 */}
    </div>
  );
};

export default App;
