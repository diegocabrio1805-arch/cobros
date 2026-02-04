
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
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

  const { isSyncing, syncError, showSuccess, lastErrors, setLastErrors, successMessage, setSuccessMessage, isOnline, processQueue, forceFullSync, pullData, pushClient, pushLoan, pushPayment, pushLog, pushUser, pushSettings, clearQueue, deleteRemoteLog, deleteRemotePayment, deleteRemoteClient, supabase, queueLength, addToQueue } = useSync();
  const [showErrorModal, setShowErrorModal] = useState(false);

  // AUTO-RESET ON UPDATE LOGIC (Moved to Component Body)
  useEffect(() => {
    // URL-BASED FORCED RESET (Using ?v= parameter)
    const params = new URLSearchParams(window.location.search);
    const urlVersion = params.get('v');
    const storedUrlVersion = localStorage.getItem('LAST_URL_VERSION');

    if (urlVersion && urlVersion !== storedUrlVersion) {
      console.log(`[URLReset] Version mismatch! URL: ${urlVersion} | Stored: ${storedUrlVersion}`);
      localStorage.setItem('LAST_URL_VERSION', urlVersion);

      // Comprehensive Cleanup
      localStorage.removeItem('last_sync_timestamp');
      localStorage.removeItem('last_sync_timestamp_v6');
      localStorage.removeItem('forced_resync_v5');

      // Silent full sync trigger
      handleForceSync(true, "Reset via URL", true);
      alert("Actualización Forzada: Descargando datos nuevos desde la nube...");
    }

    const checkAppVersion = async () => {
      try {
        if (!Capacitor.isNativePlatform()) return;

        const info = await CapApp.getInfo();
        const currentVersion = `${info.version}.${info.build}`;
        const storedVersion = localStorage.getItem('LAST_RUN_VERSION');

        console.log(`[VersionCheck] Current: ${currentVersion} | Stored: ${storedVersion}`);

        if (storedVersion !== currentVersion) {
          console.log("[VersionCheck] New version detected! Forcing cleanup...");
          localStorage.setItem('LAST_RUN_VERSION', currentVersion);
          localStorage.removeItem('last_sync_timestamp');
          localStorage.removeItem('last_sync_timestamp_v6');
          sessionStorage.removeItem('reset_reload_count');
          handleForceSync(true);
          alert("Aplicación Actualizada: Se han sincronizado los datos automáticamente.");
        }
      } catch (err) {
        console.warn("[VersionCheck] Failed to check/update version:", err);
      }
    };
    checkAppVersion();
  }, []);

  const [state, setState] = useState<AppState>(() => {
    console.log("App v3.1: Initializing state...");

    // RESET LOGIC: Force global reset to fix missing clients in APK
    const RESET_ID = 'RESET_STABLE_V6_FIX';

    try {
      const isReset = localStorage.getItem('LAST_RESET_ID') === RESET_ID;

      // Hard Wipe if ID mismatches
      if (!isReset) {
        console.log(">>> SYSTEM VERSION_V5_4_0_FINAL <<< FORCED CACHE & DATA WIPE");

        // 1. UNREGISTER SERVICE WORKERS (The main culprit in Chrome)
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (let registration of registrations) {
              registration.unregister();
              console.log('SW Unregistered for cleanup');
            }
          });
        }

        // 2. CLEAR ALL CACHES (window.caches API)
        if ('caches' in window) {
          caches.keys().then((names) => {
            for (let name of names) {
              caches.delete(name);
              console.log('Cache Storage cleared:', name);
            }
          });
        }

        // 3. CLEAR LOCALSTORAGE EXCEPT NECESSARY SETTINGS
        const lang = localStorage.getItem('app_language');
        const country = localStorage.getItem('app_country');

        localStorage.clear();

        if (lang) localStorage.setItem('app_language', lang);
        if (country) localStorage.setItem('app_country', country);

        localStorage.setItem('LAST_RESET_ID', RESET_ID);

        // Safety Check: Prevent Infinite Loop
        const reloadCount = parseInt(sessionStorage.getItem('reset_reload_count') || '0');
        if (reloadCount > 2) {
          console.error("CRITICAL: Infinite Reload Detected. Stopping reset.");
          return {
            clients: [], loans: [], payments: [], expenses: [], collectionLogs: [], users: [],
            currentUser: null, commissionPercentage: 10, commissionBrackets: [], settings: { language: 'es', country: 'CO', numberFormat: 'dot' }, branchSettings: {}
          };
        } else {
          sessionStorage.setItem('reset_reload_count', (reloadCount + 1).toString());
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          return {
            clients: [], loans: [], payments: [], expenses: [], collectionLogs: [], users: [],
            currentUser: null, commissionPercentage: 10, commissionBrackets: [], settings: { language: 'es', country: 'CO', numberFormat: 'dot' }, branchSettings: {}
          };
        }
      }
    } catch (e) {
      console.error("Reset Error:", e);
    }

    const saved = localStorage.getItem('prestamaster_v2');
    let parsed = null;
    try {
      if (saved) {
        parsed = JSON.parse(saved);
      }
    } catch (e) {
      console.error("CRITICAL: LocalStorage corruption detected. Resetting...", e);
      localStorage.removeItem('prestamaster_v2');
      parsed = null;
    }
    // STABLE ADMIN ID: Used to replace 'admin-1' and ensure consistency
    const SYSTEM_ADMIN_ID = 'b3716a78-fb4f-4918-8c0b-92004e3d63ec';
    const defaultSettings: AppSettings = { language: 'es', country: 'CO', numberFormat: 'dot' };
    const defaultBrackets: CommissionBracket[] = [
      { maxMora: 20, payoutPercent: 100 },
      { maxMora: 30, payoutPercent: 80 },
      { maxMora: 40, payoutPercent: 60 },
      { maxMora: 100, payoutPercent: 40 }
    ];

    // Aggressive migration for the separate syncQueue
    const savedQueue = localStorage.getItem('syncQueue');
    if (savedQueue && savedQueue.includes('admin-1')) {
      console.log("App: Migrating syncQueue to SYSTEM_ADMIN_ID");
      const migratedQueue = savedQueue.replace(/"admin-1"/g, `"${SYSTEM_ADMIN_ID}"`);
      localStorage.setItem('syncQueue', migratedQueue);
    }

    let rawData = parsed;
    if (rawData) {
      // Aggressive migration of all legacy IDs to stable UUID locally
      const migrateId = (id: string | undefined) => id === 'admin-1' ? SYSTEM_ADMIN_ID : id;
      const json = JSON.stringify(rawData).replace(/"admin-1"/g, `"${SYSTEM_ADMIN_ID}"`);
      rawData = JSON.parse(json);
    }

    const initialAdmin: User = { id: SYSTEM_ADMIN_ID, name: 'Administrador', role: Role.ADMIN, username: '123456', password: '123456' };
    const users = (rawData?.users || [initialAdmin]).map((u: User) => u.id === 'admin-1' ? initialAdmin : u);
    const currentUser = (rawData?.currentUser?.id === 'admin-1') ? initialAdmin : rawData?.currentUser;

    return {
      clients: rawData?.clients || [],
      loans: rawData?.loans || [],
      payments: rawData?.payments || [],
      expenses: rawData?.expenses || [],
      collectionLogs: rawData?.collectionLogs || [],
      users: users,
      currentUser: currentUser || null,
      commissionPercentage: rawData?.commissionPercentage ?? 10,
      commissionBrackets: rawData?.commissionBrackets || defaultBrackets,
      settings: rawData?.settings || defaultSettings,
      branchSettings: rawData?.branchSettings || {}
    };
  });

  const resolvedSettings = useMemo(() => {
    return resolveSettings(state.currentUser, state.branchSettings || {}, state.users, { language: 'es', country: 'CO', numberFormat: 'dot' });
  }, [state.currentUser, state.branchSettings, state.users]);

  useEffect(() => {
    const countryTodayStr = getLocalDateStringForCountry(state.settings.country);
    const today = new Date(countryTodayStr + 'T00:00:00');

    setState(prev => {
      let hasChanges = false;
      const updatedUsers = prev.users.map(u => {
        if (u.expiryDate && !u.blocked) {
          const expiry = new Date(u.expiryDate + 'T00:00:00');
          if (expiry < today) {
            hasChanges = true;
            return { ...u, blocked: true };
          }
        }
        return u;
      });

      return hasChanges ? { ...prev, users: updatedUsers } : prev;
    });
  }, [state.settings.country]);

  useEffect(() => {
    localStorage.setItem('prestamaster_v2', JSON.stringify(state));
  }, [state]);

  // Helper for Merging Data (Moved out for reuse in realtime + periodic)
  const mergeData = <T extends { id: string }>(local: T[], remote: T[]): T[] => {
    // Safe Merge: Union of Remote + Local-not-in-Remote
    const remoteMap = new Map();
    remote.forEach(i => {
      if (i && i.id) remoteMap.set(i.id, i);
    });

    const result = [...remote];
    local.forEach(l => {
      if (l && l.id && !remoteMap.has(l.id)) {
        result.push(l);
      }
    });
    return result;
  };

  // Realtime Subscription Effect
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase.channel('global-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, async (payload) => {
        console.log('[Realtime] Payment updated:', payload.eventType);
        const newData = await pullData();
        if (newData?.payments) setState(prev => ({ ...prev, payments: mergeData(prev.payments, newData.payments!) }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collection_logs' }, async (payload) => {
        console.log('[Realtime] Log updated:', payload.eventType);
        const newData = await pullData();
        if (newData?.collectionLogs) setState(prev => ({ ...prev, collectionLogs: mergeData(prev.collectionLogs, newData.collectionLogs!) }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, async (payload) => {
        console.log('[Realtime] Loan updated:', payload.eventType);
        const newData = await pullData();
        if (newData?.loans) setState(prev => ({ ...prev, loans: mergeData(prev.loans, newData.loans!) }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, async (payload) => {
        console.log('[Realtime] Client updated:', payload.eventType);
        const newData = await pullData();
        if (newData?.clients) setState(prev => ({ ...prev, clients: mergeData(prev.clients, newData.clients!) }));
      })
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    const setupBackButton = async () => {
      // @ts-ignore
      const { App: CapApp } = await import('@capacitor/app');
      CapApp.addListener('backButton', ({ canGoBack }: any) => {
        if (state.currentUser?.role === Role.ADMIN || state.currentUser?.role === Role.MANAGER) {
          if (activeTab !== 'dashboard') {
            setActiveTab('dashboard');
          } else {
            // @ts-ignore
            if (!canGoBack) CapApp.exitApp();
          }
        } else {
          if (activeTab !== 'route') {
            setActiveTab('route');
          } else {
            // @ts-ignore
            if (!canGoBack) CapApp.exitApp();
          }
        }
      });
    };

    if (navigator.userAgent.includes('Android')) {
      const requestPermissions = async () => {
        try {
          const geoStatus = await Geolocation.checkPermissions();
          if (geoStatus.location !== 'granted') await Geolocation.requestPermissions();
          const camStatus = await Camera.checkPermissions();
          if (camStatus.camera !== 'granted') await Camera.requestPermissions();
          const contactsStatus = await Contacts.checkPermissions();
          if (contactsStatus.contacts !== 'granted') await Contacts.requestPermissions();
          const pushStatus = await PushNotifications.checkPermissions();
          if (pushStatus.receive !== 'granted') await PushNotifications.requestPermissions();
        } catch (err) {
          console.error("Error requesting permissions:", err);
        }
      };
      requestPermissions();
      setupBackButton();
    }
  }, [activeTab, state.currentUser]);

  useEffect(() => {
    // CRITICAL FIX: Purge legacy "admin-1" user AND Sanitize invalid UUIDs
    setState(prev => {
      let newState = { ...prev };
      let hasChanges = false;

      // 1. Fix Legacy Admin ID
      const isLegacyUser = newState.currentUser?.id === 'admin-1';
      const hasLegacyInList = newState.users.some(u => u.id === 'admin-1');

      if (isLegacyUser || hasLegacyInList) {
        console.log("Legacy data detected. Forcing Admin ID migration...");
        const SYSTEM_ADMIN_ID = 'b3716a78-fb4f-4918-8c0b-92004e3d63ec';
        const newStateStr = JSON.stringify(newState).replace(/"admin-1"/g, `"${SYSTEM_ADMIN_ID}"`);
        newState = JSON.parse(newStateStr);
        hasChanges = true;
      }

      // 2. Fix Invalid UUIDs (The "wzzegxk3a" error)
      const isValidUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      // FORCE RESYNC V5: Ensure we have all clients by clearing incremental cache
      const hasResynced = localStorage.getItem('forced_resync_v5');
      if (!hasResynced) {
        console.log("Applying V5 Fix: Forcing full data re-download...");
        localStorage.removeItem('last_sync_timestamp');
        localStorage.setItem('forced_resync_v5', 'true');
        // We don't reload page here to avoid loops, but clearing timestamp ensures next pullData gets EVERYTHING.
      }

      // Map to track old ID -> new UUID replacements
      const idMap = new Map<string, string>();

      // A. Sanitize Clients
      const sanitizedClients = newState.clients.map(c => {
        if (!c.id || !isValidUuid(c.id)) {
          const newId = generateUUID();
          if (c.id) idMap.set(c.id, newId); // Track replacement
          hasChanges = true;
          return { ...c, id: newId };
        }
        return c;
      });

      // B. Sanitize Loans
      const sanitizedLoans = newState.loans.map(l => {
        let lChanged = false;
        let newId = l.id;
        let newClientId = l.clientId;

        // Fix Loan ID
        if (!l.id || !isValidUuid(l.id)) {
          newId = generateUUID();
          lChanged = true;
          hasChanges = true;
        }

        // Fix Client ID reference
        if (idMap.has(l.clientId)) {
          newClientId = idMap.get(l.clientId)!;
          lChanged = true;
          hasChanges = true;
        }

        return lChanged ? { ...l, id: newId, clientId: newClientId } : l;
      });

      // C. Sanitize Payments
      const sanitizedPayments = newState.payments.map(p => {
        let pChanged = false;
        let newId = p.id;
        let newClientId = p.clientId;
        // Note: Payment IDs often have custom format like "pay-UUID-inst-1", we check basic validity or partial UUID existence
        // For simplicity, if clientId needed change, we update it. 

        if (idMap.has(p.clientId)) {
          newClientId = idMap.get(p.clientId)!;
          pChanged = true;
          hasChanges = true;
        }

        // Ensure ID is valid or structured correctly? 
        // We trust custom IDs like 'pay-...' BUT if they contain the BAD ID, we must fix
        // e.g. "pay-badId-inst-1" -> "pay-newUUID-inst-1"
        // This is complex. For now, rely on clientId fix and Loan syncs regenerate them? 
        // Actually, preventing the crash is priority. If ID is strictly checked by postgres as uuid, then 'pay-...' might fail if column is UUID.
        // CHECK: Payment ID column in Supabase MUST be text if using 'pay-...'. 
        // IF it is UUID, then 'pay-...' is invalid. 
        // ASSUMPTION: Payment ID is TEXT. The error "invalid input syntax for type uuid" usually comes from Reference columns (loan_id, client_id) or Primary Key if UUID.
        // The reported error was in LOANS table sync potentially? Or Payments referencing Loan/Client.

        return pChanged ? { ...p, clientId: newClientId } : p;
      });

      // D. Sanitize Collection Logs
      const sanitizedLogs = newState.collectionLogs.map(log => {
        let logChanged = false;
        let newId = log.id;
        let newClientId = log.clientId;

        if (!log.id || (!isValidUuid(log.id) && !log.id.startsWith('init-') && !log.id.startsWith('pay-'))) {
          // Logs might have prefixes. If raw invalid string, replace.
          if (!log.id.includes('-')) {
            newId = generateUUID();
            logChanged = true;
            hasChanges = true;
          }
        }

        if (idMap.has(log.clientId)) {
          newClientId = idMap.get(log.clientId)!;
          logChanged = true;
          hasChanges = true;
        }

        return logChanged ? { ...log, id: newId, clientId: newClientId } : log;
      });

      if (hasChanges) {
        console.log("UUID Sanitization applied. Invalid IDs replaced.");

        // E. Fix Sync Queue (Crucial for the "wzzegxk3a" error)
        try {
          const queueStr = localStorage.getItem('syncQueue');
          if (queueStr) {
            const queue = JSON.parse(queueStr);
            if (Array.isArray(queue)) {
              let queueChanged = false;
              // Helper: Check if ID looks like the specific corrupt pattern
              const isBadId = (id: any) => typeof id === 'string' && (id === 'wzzegxk3a' || !id.includes('-') && id.length < 20 && !id.startsWith('init-') && !id.startsWith('pay-'));

              const cleanQueue = queue.map((item: any) => {
                if (!item || !item.data) return item;

                let pItem = { ...item };
                let itemChanged = false;

                // Check top level data.id
                if (item.data.id && isBadId(item.data.id)) {
                  console.warn("Found bad ID in queue item, dropping/fixing:", item);
                  return null; // Drop bad items safely
                }

                // Check client_id ref
                if (item.data.client_id && idMap.has(item.data.client_id)) {
                  pItem.data.client_id = idMap.get(item.data.client_id);
                  itemChanged = true;
                }
                if (item.data.clientId && idMap.has(item.data.clientId)) {
                  pItem.data.clientId = idMap.get(item.data.clientId);
                  itemChanged = true;
                }

                if (itemChanged) {
                  queueChanged = true;
                  return pItem;
                }
                return item;
              }).filter(Boolean);

              if (queueChanged || cleanQueue.length !== queue.length) {
                console.log("Sync Queue Sanitized. Saving...");
                localStorage.setItem('syncQueue', JSON.stringify(cleanQueue));
              }
            }
          }
        } catch (e) {
          console.error("Error cleaning syncQueue:", e);
        }

        return {
          ...newState,
          clients: sanitizedClients,
          loans: sanitizedLoans,
          payments: sanitizedPayments,
          collectionLogs: sanitizedLogs
        };
      }
      return prev;
    });
  }, []);

  const doPull = async () => {
    // We TRUST useSync's internal check. navigator.onLine is unreliable on Android WebView.
    // Auto-detect: If we have no clients, force full sync regardless of timestamp
    const shouldFullSync = state.clients.length === 0;
    const newData = await pullData(shouldFullSync);
    if (newData) {
      setState(prev => {
        // Enhanced merge with Loan Logic
        const mergeWithLogic = <T extends { id: string }>(local: T[], remote: T[]): T[] => {
          const remoteMap = new Map(remote.map(i => [i.id, i]));
          const result = [...remote];
          local.forEach(l => {
            const r = remoteMap.get(l.id);
            if (!r) {
              result.push(l);
            } else if ('installments' in l && 'installments' in r) {
              // Preserve the specific Loan logic requested previously
              const lPaidHistory = prev.collectionLogs.filter(log => log.loanId === l.id && log.type === CollectionLogType.PAYMENT && !log.isOpening).reduce((acc, log) => acc + (log.amount || 0), 0);
              const rPaidHistory = (newData.collectionLogs || []).filter(log => log.loanId === r.id && log.type === CollectionLogType.PAYMENT && !log.isOpening).reduce((acc, log) => acc + (log.amount || 0), 0);
              if (lPaidHistory > rPaidHistory) {
                const idx = result.findIndex(item => item.id === l.id);
                if (idx !== -1) result[idx] = l;
              }
            }
          });
          return result;
        };

        const updatedUsers = mergeData(prev.users, newData.users || []);
        let updatedCurrentUser = prev.currentUser;
        if (prev.currentUser) {
          const serverProfile = (newData.users || []).find(u => u.id === prev.currentUser?.id);
          if (serverProfile) {
            updatedCurrentUser = { ...prev.currentUser, ...serverProfile };
          }
        }

        return {
          ...prev,
          users: updatedUsers,
          currentUser: updatedCurrentUser,
          clients: mergeData(prev.clients, newData.clients || []),
          loans: mergeWithLogic(prev.loans, newData.loans || []),
          payments: mergeData(prev.payments, newData.payments || []),
          collectionLogs: mergeData(prev.collectionLogs, newData.collectionLogs || []),
          branchSettings: { ...(prev.branchSettings || {}), ...(newData.branchSettings || {}) },
          settings: resolveSettings(updatedCurrentUser, { ...(prev.branchSettings || {}), ...(newData.branchSettings || {}) }, updatedUsers, prev.settings)
        };
      });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      console.log("Mount Auto-Pull Triggered");
      doPull();
    }, 5000);

    window.addEventListener('focus', doPull);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', doPull);
    };
  }, []);

  useEffect(() => {
    // Aggressive Sync for Everyone: 4 second interval (Silent)
    // As requested by user: Force sync every 4 seconds, hidden window.
    const intervalTime = 4000;

    const syncInterval = setInterval(() => {
      if (!isSyncing && isOnline) {
        // Silent sync (true)
        handleForceSync(true);
      }
    }, intervalTime);
    return () => clearInterval(syncInterval);
  }, [isSyncing, isOnline]);

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
      if (u.managedBy === user.id) {
        myTeamIds.add(u.id);
        if (u.role === Role.COLLECTOR) {
          myDirectCollectorIds.add(u.id);
        }
      }
    });

    const isOurBranch = (itemBranchId: string | undefined, itemAddedBy: string | undefined, itemCollectorId: string | undefined) => {
      // Rule 1: Ownership - If I OR one of my DIRECT COLLECTORS added it.
      if (itemAddedBy === user.id || (itemAddedBy && myDirectCollectorIds.has(itemAddedBy))) return true;

      // Rule 2: Assignment - If it's assigned to my branch ID (Matches Gerente or shared Branch)
      if (itemBranchId === branchId) return true;

      // Rule 3: Direct Assignment - If it's assigned to me OR a collector in my team
      if (itemCollectorId === user.id || (itemCollectorId && myDirectCollectorIds.has(itemCollectorId))) return true;

      // Legacy/System Compatibility for Super Admins
      if (user.role === Role.ADMIN) {
        if (itemBranchId === SYSTEM_ADMIN_ID || itemBranchId === LEGACY_ADMIN_ID) return true;
      }

      return false;
    };

    // SOFT DELETE FILTER: Only show active clients (unless specifically viewing archives, but standard view hides them)
    // Also Admin sees everything, but even Admin shouldn't see "Deleted" clients in the main list.
    // If we want an "Archive", we'd add a toggle. For now, User wants them GONE.
    let clients = state.clients.filter(c => isOurBranch(c.branchId, c.addedBy, undefined) && c.isActive !== false);

    // Performance optimization: Create a Set of visible/active client IDs
    const activeClientIds = new Set(clients.map(c => c.id));

    // Filter related data to only show what belongs to visible clients
    // This ensures that if a client is "Deleted" (Soft), their loans/payments also disappear from the UI.
    let loans = state.loans.filter(l => activeClientIds.has(l.clientId));
    let payments = state.payments.filter(p => activeClientIds.has(p.clientId));
    let expenses = state.expenses.filter(e => isOurBranch(e.branchId, e.addedBy, undefined));
    let collectionLogs = state.collectionLogs.filter(log => activeClientIds.has(log.clientId));

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
    setState(prev => ({ ...prev, currentUser: user }));
    const branchId = getBranchId(user);
    if (branchId && branchId !== 'none') {
      localStorage.setItem('LAST_VALID_BRANCH_ID', branchId);
    }
    // CRITICAL FIX: Clear sync timestamp to force full resync on login
    // This ensures APK gets fresh data and removes any incorrectly cached clients
    localStorage.removeItem('last_sync_timestamp');
    console.log('[Login] Cleared sync timestamp - forcing full data resync');

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

  const handleForceSync = async (silent: boolean = false, message: string = "¡Sincronizado!", fullSync: boolean = false) => {
    if (!silent) setSuccessMessage(message);

    if (isSyncing) {
      if (!silent) console.log("Ya hay una sincronización en curso...");
      return;
    }

    if (fullSync) {
      localStorage.removeItem('last_sync_timestamp');
      localStorage.removeItem('last_sync_timestamp_v6');
      await forceFullSync();
    } else {
      await processQueue(true);
    }

    const newData = await pullData(fullSync);

    if (newData) {
      console.log("Forced pull data", newData);
      setState(prev => {
        return {
          ...prev,
          users: mergeData(prev.users, newData.users || []),
          clients: mergeData(prev.clients, newData.clients || []),
          loans: mergeData(prev.loans, newData.loans || []),
          payments: mergeData(prev.payments, newData.payments || []),
          collectionLogs: mergeData(prev.collectionLogs, newData.collectionLogs || []),
          branchSettings: { ...(prev.branchSettings || {}), ...(newData.branchSettings || {}) },
          settings: resolveSettings(prev.currentUser, { ...(prev.branchSettings || {}), ...(newData.branchSettings || {}) }, prev.users, prev.settings)
        };
      });
    }
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

    await handleForceSync(false);
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
          for (let i = 0; i < newInstallments.length && totalToApply > 0.01; i++) {
            const inst = newInstallments[i];
            if (inst.status === PaymentStatus.PAID) continue;
            const remainingInInst = Math.round((inst.amount - (inst.paidAmount || 0)) * 100) / 100;
            const appliedToInst = Math.min(totalToApply, remainingInInst);
            inst.paidAmount = Math.round(((inst.paidAmount || 0) + appliedToInst) * 100) / 100;
            totalToApply = Math.round((totalToApply - appliedToInst) * 100) / 100;
            inst.status = inst.paidAmount >= inst.amount - 0.01 ? PaymentStatus.PAID : PaymentStatus.PARTIAL;

            // FALLBACK & REPAIR: Ensure branchId is a valid UUID
            const isValidUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            const secureBranchId = (loan.branchId && isValidUuid(loan.branchId)) ? loan.branchId : branchId;

            const pRec: PaymentRecord = {
              id: `pay-${newLog.id}-inst-${inst.number}`,
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

          const isValidUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
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

    await handleForceSync(false);
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
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} user={state.currentUser} state={filteredState} />

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

      {/* ERROR BANNER - Red for Real Errors */}
      {syncError && !syncError.startsWith('Sincronizando') && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[2000] w-[95%] max-w-md">
          <div
            onClick={() => setShowErrorModal(true)}
            className="p-5 bg-red-600 text-white rounded-[2rem] shadow-[0_20px_50px_rgba(220,38,38,0.3)] border-2 border-white/20 animate-bounce group relative overflow-hidden cursor-pointer active:scale-95 transition-all"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <i className="fa-solid fa-cloud-bolt text-6xl -mr-4 -mt-4"></i>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-triangle-exclamation text-xl animate-pulse"></i>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-black uppercase text-xs tracking-[0.2em] mb-1">Error de Sincronización</h3>
                <div className="bg-black/20 p-3 rounded-xl">
                  <p className="text-[10px] font-bold opacity-95 leading-relaxed break-words font-mono">
                    {syncError}. <span className="underline font-black uppercase tracking-tighter">Tocar para Detalles</span>
                  </p>
                </div>
                <p className="text-[8px] font-black uppercase tracking-widest mt-2 opacity-60">
                  <i className="fa-solid fa-info-circle mr-1"></i>
                  Revise su conexión o contacte a soporte técnico
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const errorDiv = document.querySelector('.bg-red-600');
                  if (errorDiv) errorDiv.parentElement?.classList.add('hidden');
                }}
                className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all shrink-0"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
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
              <h1 className="text-sm font-black text-emerald-600 uppercase tracking-tighter leading-none">Anexo Cobro</h1>
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
            state={state}
            updateSettings={updateSettings}
            setActiveTab={setActiveTab}
            onForceSync={async () => {
              console.log("Manuall Pull Data Triggered");
              await pullData();
            }}
            onClearQueue={clearQueue}
            isOnline={isOnline}
            isSyncing={isSyncing}
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
