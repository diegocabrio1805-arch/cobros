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
import Reports from './components/Reports';
import Settings from './components/Settings';
import { getTranslation } from './utils/translations';
import { getLocalDateStringForCountry } from './utils/helpers';
import { supabase } from './services/supabase';
import UserCapture from './components/UserCapture';
import LandingPage from './components/LandingPage';
import { requestAppPermissions } from './utils/permissions';
import ErrorBoundary from './components/ErrorBoundary';


const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showManagerExpiryModal, setShowManagerExpiryModal] = useState(false);
  const [daysToExpiry, setDaysToExpiry] = useState<number | null>(null);
  const [showLanding, setShowLanding] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const [state, setState] = useState<AppState>(() => {
    let parsed = null;
    try {
      const saved = localStorage.getItem('prestamaster_v2');
      parsed = saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Error parsing localStorage data, resetting state:", e);
      // Optional: localStorage.removeItem('prestamaster_v2'); // Auto-clean corrupt data
    }

    const initialAdmin: User = { id: 'admin-1', name: 'Administrador Sistema', role: Role.ADMIN, username: '123456', password: '123456' };
    const users = parsed?.users || [initialAdmin];
    const currentUser = parsed?.currentUser || null;
    const defaultSettings: AppSettings = { language: 'es', country: 'CO', numberFormat: 'dot' };

    const defaultBrackets: CommissionBracket[] = [
      { maxMora: 20, payoutPercent: 100 },
      { maxMora: 30, payoutPercent: 80 },
      { maxMora: 40, payoutPercent: 60 },
      { maxMora: 100, payoutPercent: 40 }
    ];

    return {
      clients: parsed?.clients || [],
      loans: parsed?.loans || [],
      payments: parsed?.payments || [],
      expenses: parsed?.expenses || [],
      collectionLogs: parsed?.collectionLogs || [],
      users: users,
      currentUser: currentUser,
      commissionPercentage: parsed?.commissionPercentage ?? 10,
      commissionBrackets: parsed?.commissionBrackets || defaultBrackets,
      initialCapital: parsed?.initialCapital ?? 0,
      settings: parsed?.settings || defaultSettings
    };
  });

  const menuItems = useMemo(() => {
    if (!state.currentUser) return [];

    const isPowerUser = state.currentUser.role === Role.ADMIN || state.currentUser.role === Role.MANAGER;
    const isAdmin = state.currentUser.role === Role.ADMIN;
    const t = getTranslation(state.settings.language).menu;

    return [
      { id: 'dashboard', icon: 'fa-chart-line', label: t.dashboard, powerOnly: true },
      { id: 'clients', icon: 'fa-users', label: t.clients, powerOnly: false },
      { id: 'loans', icon: 'fa-money-bill-wave', label: t.loans, powerOnly: false },
      { id: 'route', icon: 'fa-route', label: t.route, powerOnly: false },
      { id: 'notifications', icon: 'fa-bell', label: t.notifications, powerOnly: false },
      { id: 'performance', icon: 'fa-chart-column', label: t.performance, powerOnly: true },
      { id: 'expenses', icon: 'fa-wallet', label: t.expenses, powerOnly: true },
      { id: 'simulator', icon: 'fa-calculator', label: t.simulator, powerOnly: false },
      { id: 'reports', icon: 'fa-file-invoice-dollar', label: t.reports, powerOnly: true },
      { id: 'map', icon: 'fa-map-location-dot', label: t.map, powerOnly: true },
      { id: 'commission', icon: 'fa-percent', label: t.commission, powerOnly: false },
      { id: 'settings', icon: 'fa-gear', label: t.settings, powerOnly: false },
      { id: 'collectors', icon: 'fa-user-gear', label: t.collectors, powerOnly: true },
      { id: 'managers', icon: 'fa-user-tie', label: t.managers, adminOnly: true },
      { id: 'capture', icon: 'fa-camera', label: 'Mi Perfil', powerOnly: false },
    ].filter(item => {
      if (item.adminOnly) return isAdmin;
      if (item.powerOnly) return isPowerUser;
      return true;
    });
  }, [state.currentUser, state.settings.language]);

  useEffect(() => {
    requestAppPermissions();
  }, []);

  useEffect(() => {
    const countryTodayStr = getLocalDateStringForCountry(state.settings.country);
    const today = new Date(countryTodayStr);

    setState(prev => {
      let hasChanges = false;
      const updatedUsers = prev.users.map(u => {
        if (u.expiryDate && !u.blocked) {
          const expiry = new Date(u.expiryDate);
          if (expiry < today) {
            hasChanges = true;
            return { ...u, blocked: true };
          }
        }
        return u;
      });

      return hasChanges ? { ...prev, users: updatedUsers } : prev;
    });
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const email = session.user.email?.toLowerCase();
        let localUser = state.users.find(u => u.username.toLowerCase() === email);

        if (!localUser) {
          try {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
            if (profile) {
              localUser = {
                id: profile.id,
                name: profile.name,
                username: profile.username,
                password: profile.password,
                role: profile.role as Role,
                expiryDate: profile.expiry_date,
                blocked: profile.blocked,
                managedBy: profile.managed_by
              };
            }
          } catch (e) { console.error("Error fetching profile", e); }

          if (!localUser) {
            localUser = {
              id: session.user.id,
              name: email?.split('@')[0] || 'Usuario',
              username: email || 'user',
              role: Role.MANAGER,
              password: '',
              blocked: false
            };
          }
          setState(prev => ({ ...prev, users: [...prev.users, localUser!] }));
        }

        if (localUser.blocked) {
          await supabase.auth.signOut();
          setState(prev => ({ ...prev, currentUser: null }));
          return;
        }

        setState(prev => ({ ...prev, currentUser: localUser! }));
        setActiveTab('dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [state.users]);

  useEffect(() => {
    localStorage.setItem('prestamaster_v2', JSON.stringify(state));
  }, [state]);

  // Sincronización automática de USUARIOS (Global)
  useEffect(() => {
    let channel: any;
    const syncUsersLive = async () => {
      try {
        const { syncService } = await import('./services/syncService');
        const remoteUsers = await syncService.pullFromSupabase(['users']);
        if (remoteUsers && remoteUsers.users) {
          setState(prev => {
            const map = new Map(prev.users.map(u => [u.username.toLowerCase(), u]));
            remoteUsers.users!.forEach(u => map.set(u.username.toLowerCase(), u));
            return { ...prev, users: Array.from(map.values()) };
          });
        }
      } catch (e) { console.error("Error live syncing users:", e); }
    };

    channel = supabase.channel('public:profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        console.log("Detectado cambio en usuarios - Sincronizando...");
        syncUsersLive();
      })
      .subscribe();

    syncUsersLive();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  // Sincronización automática de DATOS (Background Sync & Realtime - Solo Logueado)
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const initSync = async () => {
      if (!state.currentUser) return;
      setIsSyncing(true);
      try {
        const { syncService } = await import('./services/syncService');
        const remoteState = await syncService.pullFromSupabase(undefined, state.currentUser);

        setState(prev => {
          const merge = <T extends { id: string }>(local: T[], remote?: T[]) => {
            if (!remote) return local;
            const map = new Map(local.map(i => [i.id, i]));
            remote.forEach(i => map.set(i.id, i));
            return Array.from(map.values());
          };

          const mergeUsers = (local: User[], remote: User[] = []) => {
            const map = new Map(local.map(u => [u.username.toLowerCase(), u]));
            remote.forEach(u => map.set(u.username.toLowerCase(), u));
            return Array.from(map.values());
          };

          const newUsers = mergeUsers(prev.users, remoteState.users);
          const newClients = merge(prev.clients, remoteState.clients);
          const newLoans = merge(prev.loans, remoteState.loans);
          const newLogs = merge(prev.collectionLogs, remoteState.collectionLogs);
          const newPayments = merge(prev.payments, remoteState.payments);

          let newCurrentUser = prev.currentUser;
          let migratedState = { users: newUsers, clients: newClients, loans: newLoans, collectionLogs: newLogs, payments: newPayments, expenses: prev.expenses };

          if (remoteState.expenses) {
            migratedState.expenses = merge(prev.expenses, remoteState.expenses);
          }

          if (newCurrentUser) {
            const updatedUser = newUsers.find(u => u.username.toLowerCase() === newCurrentUser?.username.toLowerCase());
            if (updatedUser && updatedUser.id !== newCurrentUser.id) {
              newCurrentUser = updatedUser;
              // Migration logic omitted for brevity as it was already handled or complex
            }
          }

          const newState = { ...prev, currentUser: newCurrentUser, ...migratedState };

          // syncService.pushToSupabase(newState).catch(console.error); // REMOVED TO PREVENT INFINITE SYNC LOOP
          return newState;
        });
      } catch (e) { console.error("Error en Auto-Sync:", e); }
      finally { setIsSyncing(false); }
    };

    if (state.currentUser) {
      initSync();
      import('@capacitor/network').then(({ Network }) => {
        Network.addListener('networkStatusChange', status => {
          if (status.connected) setTimeout(() => initSync(), 2000);
        });
      }).catch(console.error);

      import('./services/syncService').then(({ syncService }) => {
        unsubscribe = syncService.subscribeToChanges(() => {
          console.log("Realtime update received. Refreshing data...");
          initSync();
        });
      });
    }

    return () => { if (unsubscribe) unsubscribe(); };
  }, [state.currentUser]);

  const pushStateToCloud = async (newState: AppState, entities?: ('users' | 'clients' | 'loans' | 'logs' | 'payments')[]) => {
    try {
      const { syncService } = await import('./services/syncService');
      await syncService.pushToSupabase(newState, entities);
    } catch (e: any) {
      console.error("Error subiendo datos:", e);
      // Alertar al usuario visiblemente para que sepa que no está respaldado
      alert("⚠️ ERROR DE SINCRONIZACIÓN: " + (e.message || "Fallo de red") + "\n\nSus datos están solo en este dispositivo. No borre la app hasta tener internet.");
    }
  };

  const getBranchId = (user: User | null): string => {
    if (!user) return 'none';
    if (user.role === Role.ADMIN || user.role === Role.MANAGER) return user.id;
    return user.managedBy || 'none';
  };

  const filteredState = useMemo(() => {
    if (!state.currentUser) return state;
    const user = state.currentUser;
    if (user.role === Role.ADMIN) {
      const allUsers = state.users.filter(u => !u.username.startsWith('DELETED_'));
      return { ...state, users: allUsers };
    }

    const branchId = getBranchId(user);
    let clients = state.clients.filter(c => c.branchId === branchId);
    let loans = state.loans.filter(l => l.branchId === branchId);
    let payments = state.payments.filter(p => p.branchId === branchId);
    let expenses = state.expenses.filter(e => e.branchId === branchId);
    let collectionLogs = state.collectionLogs.filter(log => log.branchId === branchId);
    const allUsers = state.users.filter(u => !u.username.startsWith('DELETED_'));
    let users = allUsers.filter(u => u.id === user.id || u.managedBy === user.id);

    if (user.role === Role.COLLECTOR) {
      clients = clients.filter(c => c.addedBy === user.id);
      const myClientIds = new Set(clients.map(c => c.id));
      loans = loans.filter(l => myClientIds.has(l.clientId) || l.collectorId === user.id);
      payments = payments.filter(p => myClientIds.has(p.clientId));
      collectionLogs = collectionLogs.filter(log => myClientIds.has(log.clientId) || log.recordedBy === user.id);
      users = users.filter(u => u.id === user.id);
    }

    return { ...state, clients, loans, payments, expenses, collectionLogs, users };
  }, [state]);

  const handleManualSync = async () => {
    if (isSyncing) return;
    try {
      setIsSyncing(true);
      const { syncService } = await import('./services/syncService');
      const remoteState = await syncService.pullFromSupabase(undefined, state.currentUser);

      setState(prev => {
        const merge = <T extends { id: string }>(local: T[], remote?: T[]) => {
          if (!remote) return local;
          const map = new Map(local.map(i => [i.id, i]));
          remote.forEach(i => map.set(i.id, i));
          return Array.from(map.values());
        };

        const mergedUsers = remoteState.users ?
          (() => {
            const map = new Map(prev.users.map(u => [u.username.toLowerCase(), u]));
            remoteState.users!.forEach(u => map.set(u.username.toLowerCase(), u));
            return Array.from(map.values());
          })() : prev.users;

        return {
          ...prev,
          users: mergedUsers,
          clients: merge(prev.clients, remoteState.clients),
          loans: merge(prev.loans, remoteState.loans),
          collectionLogs: merge(prev.collectionLogs, remoteState.collectionLogs),
          payments: merge(prev.payments, remoteState.payments),
          expenses: merge(prev.expenses, remoteState.expenses)
        };
      });
      alert("¡Sincronización Completada!");
    } catch (e) {
      alert("Error al sincronizar. Verifique su internet.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = (user: User) => {
    setState(prev => {
      const userExists = prev.users.some(u => u.id === user.id);
      const newUsers = userExists ? prev.users : [...prev.users, user];
      return { ...prev, currentUser: user, users: newUsers };
    });
    setActiveTab('dashboard');
    if (user.role === Role.MANAGER && user.expiryDate) {
      // Expiry logic...
      const expiry = new Date(user.expiryDate);
      const today = new Date();
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 5 && diffDays >= 0) {
        setDaysToExpiry(diffDays);
        setShowManagerExpiryModal(true);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setState(prev => ({ ...prev, currentUser: null }));
  };

  const handleGenerateManager = (data: { name: string, username: string, pass: string }) => {
    const trialDays = 20;
    const expiry = new Date();
    expiry.setDate(new Date().getDate() + trialDays);
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name: data.name,
      username: data.username,
      password: data.pass,
      role: Role.MANAGER,
      expiryDate: expiry.toISOString().split('T')[0],
      blocked: false
    };
    setState(prev => ({ ...prev, users: [...prev.users, newUser] }));
  };

  const handlePreLoginSync = async (silent = false) => {
    try {
      if (!silent) alert("Actualizando...");
      const { syncService } = await import('./services/syncService');
      const remoteState = await syncService.pullFromSupabase(['users']);
      if (remoteState && remoteState.users) {
        setState(prev => {
          const map = new Map(prev.users.map(u => [u.username.toLowerCase(), u]));
          remoteState.users!.forEach(u => map.set(u.username.toLowerCase(), u));
          return { ...prev, users: Array.from(map.values()) };
        });
        if (!silent) alert("Listo.");
      }
    } catch (e) { if (!silent) alert("Error."); }
  };

  const addUser = (user: User) => {
    const newUser = { ...user };
    if (!newUser.managedBy && (state.currentUser?.role === Role.MANAGER || state.currentUser?.role === Role.ADMIN)) {
      newUser.managedBy = state.currentUser.id;
    }
    setState(prev => {
      const next = { ...prev, users: [...prev.users, newUser] };
      pushStateToCloud(next, ['users']);
      return next;
    });
  };

  const updateUser = (updatedUser: User) => setState(prev => {
    const next = { ...prev, users: prev.users.map(u => u.id === updatedUser.id ? updatedUser : u) };
    pushStateToCloud(next, ['users']);
    return next;
  });

  const deleteUser = (userId: string) => {
    if (!window.confirm("¿Eliminar usuario?")) return;
    setState(prev => {
      const targetUser = prev.users.find(u => u.id === userId);
      if (!targetUser) return prev;
      const deletedUser = { ...targetUser, username: `DELETED_${Date.now()}_${targetUser.username}`, blocked: true };
      const next = { ...prev, users: prev.users.map(u => u.id === userId ? deletedUser : u) };
      pushStateToCloud(next, ['users']);
      return next;
    });
  };

  const updateSettings = (newSettings: AppSettings) => setState(prev => ({ ...prev, settings: newSettings }));

  const addClient = (client: Client, loan?: Loan) => {
    const branchId = getBranchId(state.currentUser);
    const newClient = { ...client, branchId, isActive: true };

    setState(prev => {
      const newLogs = [...prev.collectionLogs];
      let newLoans = [...prev.loans];

      if (loan) {
        newLoans.unshift({ ...loan, branchId });
        newLogs.unshift({
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
        });
      }

      const next = { ...prev, clients: [...prev.clients, newClient], loans: newLoans, collectionLogs: newLogs };
      setTimeout(() => pushStateToCloud(next, loan ? ['clients', 'loans', 'logs'] : ['clients']), 0);
      return next;
    });
  };

  const addLoan = (loan: Loan) => {
    const branchId = getBranchId(state.currentUser);
    setState(prev => {
      const next = {
        ...prev,
        loans: [{ ...loan, branchId }, ...prev.loans],
        collectionLogs: [{
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
        }, ...prev.collectionLogs]
      };
      setTimeout(() => pushStateToCloud(next, ['loans', 'logs']), 0);
      return next;
    });
  };

  const updateClient = (updatedClient: Client) => setState(prev => {
    const next = { ...prev, clients: prev.clients.map(c => c.id === updatedClient.id ? updatedClient : c) };
    setTimeout(() => pushStateToCloud(next, ['clients']), 0);
    return next;
  });

  const deleteClient = (clientId: string) => setState(prev => {
    const next = { ...prev, clients: prev.clients.map(c => c.id === clientId ? { ...c, isActive: false } : c) };
    setTimeout(() => pushStateToCloud(next, ['clients']), 0);
    return next;
  });

  const updateLoan = (updatedLoan: Loan) => setState(prev => {
    const next = { ...prev, loans: prev.loans.map(l => l.id === updatedLoan.id ? updatedLoan : l) };
    setTimeout(() => pushStateToCloud(next, ['loans']), 0);
    return next;
  });

  const addCollectionAttempt = (log: CollectionLog) => {
    const branchId = getBranchId(state.currentUser);
    const newLog = { ...log, branchId, recordedBy: state.currentUser?.id };

    setState(prev => {
      let updatedLoans = [...prev.loans];
      let updatedPayments = [...prev.payments];

      if (newLog.type === CollectionLogType.PAYMENT && newLog.amount) {
        let totalToApply = newLog.amount;
        updatedLoans = updatedLoans.map(loan => {
          if (loan.id === newLog.loanId) {
            const currentInstallments = loan.installments || [];
            if (currentInstallments.length === 0) return loan;

            const newInst = currentInstallments.map(i => ({ ...i }));
            for (let i = 0; i < newInst.length && totalToApply > 0.01; i++) {
              const inst = newInst[i];
              if (inst.status === PaymentStatus.PAID) continue;
              const remaining = inst.amount - (inst.paidAmount || 0);
              const applied = Math.min(totalToApply, remaining);
              inst.paidAmount = (inst.paidAmount || 0) + applied;
              totalToApply -= applied;
              inst.status = inst.paidAmount >= inst.amount - 0.01 ? PaymentStatus.PAID : PaymentStatus.PARTIAL;
              updatedPayments.push({
                id: `pay-${newLog.id}-inst-${inst.number}`,
                loanId: newLog.loanId,
                clientId: newLog.clientId,
                branchId: loan.branchId,
                amount: applied,
                date: newLog.date,
                installmentNumber: inst.number,
                isVirtual: newLog.isVirtual,
                isRenewal: newLog.isRenewal
              });
            }
            const allPaid = newInst.every(i => i.status === PaymentStatus.PAID);
            return { ...loan, installments: newInst, status: allPaid ? LoanStatus.PAID : LoanStatus.ACTIVE };
          }
          return loan;
        });
      }

      const next = {
        ...prev,
        loans: updatedLoans,
        payments: updatedPayments,
        collectionLogs: [newLog, ...prev.collectionLogs]
      };

      // Safely schedule sync outside reducer
      setTimeout(() => pushStateToCloud(next, ['logs', 'loans', 'payments']), 0);
      return next;
    });
  };

  const deleteCollectionLog = (logId: string) => {
    setState(prev => {
      const next = { ...prev, collectionLogs: prev.collectionLogs.filter(l => l.id !== logId) };
      setTimeout(() => pushStateToCloud(next, ['logs']), 0);
      return next;
    });
  };

  const updateCollectionLog = (logId: string, newAmount: number) => { };
  const updateCollectionLogNotes = (logId: string, notes: string) => { };

  const addExpense = (expense: Expense) => {
    const branchId = getBranchId(state.currentUser);
    setState(prev => ({ ...prev, expenses: [...prev.expenses, { ...expense, branchId }] }));
  };

  const updateCommissionBrackets = (brackets: CommissionBracket[]) => setState(prev => ({ ...prev, commissionBrackets: brackets }));
  const updateInitialCapital = (amount: number) => setState(prev => ({ ...prev, initialCapital: amount }));


  if (!state.currentUser) {
    if (showLanding) return <LandingPage onEnter={() => setShowLanding(false)} />;
    return <Login onLogin={handleLogin} users={state.users} onGenerateManager={handleGenerateManager} onSync={handlePreLoginSync} />;
  }

  const isPowerUser = state.currentUser.role === Role.ADMIN || state.currentUser.role === Role.MANAGER;
  const isAdmin = state.currentUser.role === Role.ADMIN;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden select-none">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} menuItems={menuItems} user={state.currentUser} onLogout={handleLogout} state={filteredState} onSync={handleManualSync} />

      <div className="md:hidden fixed top-0 left-0 right-0 z-[100] bg-white border-b border-slate-100 px-4 py-3 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-3">
          {activeTab !== 'menu' && (
            <button onClick={() => setActiveTab('menu')} className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center shrink-0">
              <i className="fa-solid fa-chevron-left"></i>
            </button>
          )}
          <div><h1 className="text-sm font-black text-emerald-600 uppercase tracking-tighter">Anexo Cobro</h1>
            {isSyncing && <p className="text-[9px] text-slate-400 animate-pulse">Sincronizando...</p>}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleManualSync} disabled={isSyncing} className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSyncing ? 'animate-spin bg-blue-50 text-blue-600' : 'bg-slate-100'}`}><i className={`fa-solid ${isSyncing ? 'fa-circle-notch' : 'fa-cloud-arrow-down'}`}></i></button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center"><i className="fa-solid fa-bars-staggered"></i></button>
        </div>
      </div>

      <main className="flex-1 transition-all duration-300 md:ml-0 pt-20 md:pt-0 h-screen overflow-y-auto bg-[#f8fafc] relative">
        {isSyncing && (
          <div className="absolute top-2 right-4 z-50 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2">
            <i className="fa-solid fa-circle-notch fa-spin"></i> Sincronizando
          </div>
        )}

        <div className="p-4 md:p-8 max-w-7xl mx-auto pb-32 md:pb-8 min-h-full">
          <React.Suspense fallback={<div className="flex h-full items-center justify-center"><i className="fa-solid fa-circle-notch fa-spin text-3xl text-slate-300"></i></div>}>
            <ErrorBoundary>
              {activeTab === 'dashboard' && <Dashboard state={filteredState} />}
              {activeTab === 'clients' && <Clients state={filteredState} addClient={addClient} updateClient={updateClient} deleteClient={deleteClient} addLoan={addLoan} />}
              {activeTab === 'loans' && <Loans state={filteredState} updateLoan={updateLoan} />}
              {activeTab === 'route' && <CollectionRoute state={filteredState} addCollectionAttempt={addCollectionAttempt} deleteCollectionLog={deleteCollectionLog} />}
              {activeTab === 'notifications' && <Notifications state={filteredState} />}
              {activeTab === 'settings' && <Settings state={filteredState} updateSettings={updateSettings} setActiveTab={setActiveTab} />}
              {activeTab === 'collectors' && <Collectors state={filteredState} onAddUser={addUser} onUpdateUser={updateUser} onDeleteUser={deleteUser} updateSettings={updateSettings} />}
              {activeTab === 'managers' && <Managers state={filteredState} onAddUser={addUser} onUpdateUser={updateUser} onDeleteUser={deleteUser} />}
              {activeTab === 'capture' && <UserCapture user={state.currentUser} onUpdateUser={updateUser} />}
              {activeTab === 'simulator' && <Simulator settings={state.settings} />}
              {activeTab === 'map' && <CollectionMap state={filteredState} />}
              {activeTab === 'menu' && (
                <div className="grid grid-cols-2 gap-4 pb-20">
                  {menuItems.map(item => (
                    <button key={item.id} onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-4 active:scale-95 transition-all text-center group">
                      <div className="w-16 h-16 bg-slate-50 text-slate-700 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300 shadow-inner">
                        <i className={`fa-solid ${item.icon}`}></i>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{item.label}</span>
                    </button>
                  ))}
                  <button onClick={handleLogout} className="col-span-2 bg-red-50 p-6 rounded-3xl shadow-sm border border-red-100 flex flex-col items-center justify-center gap-4 active:scale-95 transition-all mt-4">
                    <span className="text-red-500 font-black uppercase tracking-widest text-xs">Cerrar Sesión</span>
                  </button>
                </div>
              )}
              {activeTab === 'performance' && isPowerUser && <CollectorPerformance state={filteredState} />}
              {activeTab === 'reports' && isPowerUser && <Reports state={filteredState} />}
              {activeTab === 'expenses' && isPowerUser && <Expenses state={filteredState} addExpense={addExpense} />}
              {activeTab === 'commission' && <CollectorCommission state={filteredState} setCommissionPercentage={(p) => setState(prev => ({ ...prev, commissionPercentage: p }))} updateCommissionBrackets={updateCommissionBrackets} deleteCollectionLog={deleteCollectionLog} />}
            </ErrorBoundary>
          </React.Suspense>
        </div>
      </main>
    </div>
  );
};

export default App;