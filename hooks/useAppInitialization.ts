import { useState, useEffect, useMemo } from 'react';
import { Preferences } from '@capacitor/preferences';
import { AppState, User, Role, CollectionLogType, CollectionLog } from '../types';
import { StorageService } from '../utils/localforageStorage';
import { resolveSettings } from '../utils/settingsHierarchy';

export const CURRENT_VERSION_ID = '6.7.4-STABLE';
export const SYSTEM_ADMIN_ID = 'b3716a78-fb4f-4918-8c0b-92004e3d63ec';

export const useAppInitialization = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  
  const initialAdmin: User = { 
    id: SYSTEM_ADMIN_ID, 
    name: 'Administrador', 
    role: Role.ADMIN, 
    username: 'DDANTE1983', 
    password: 'Cobros2026' 
  };

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

  const [state, setState] = useState<AppState>(defaultInitialState);

  // --- BULLETPROOF AUTO-UPDATER ---
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const res = await fetch(window.location.pathname + '?t=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) return;
        const text = await res.text();
        const match = text.match(/CURRENT_VERSION\s*=\s*'([^']+)'/);
        if (match && match[1]) {
          const remoteVersion = match[1];
          const localVersion = CURRENT_VERSION_ID;
          const toNum = (v: string) => v.split('-')[0].split('.').map(Number).reduce((a, b, i) => a + b * Math.pow(1000, 2 - i), 0);
          const localNum = toNum(localVersion);
          const remoteNum = toNum(remoteVersion);
          const lastReload = parseInt(localStorage.getItem('last_auto_reload') || '0');
          
          if (remoteNum > localNum && (Date.now() - lastReload > 300000)) {
            console.log("UPDATE: remote", remoteVersion, "is newer than local", localVersion, "— reloading.");
            localStorage.setItem('last_auto_reload', Date.now().toString());
            if ('caches' in window) {
              const names = await caches.keys();
              await Promise.all(names.map(name => caches.delete(name)));
            }
            if ('serviceWorker' in navigator) {
              const regs = await navigator.serviceWorker.getRegistrations();
              await Promise.all(regs.map(r => r.unregister()));
            }
            window.location.reload();
          }
        }
      } catch (error) {
        console.log("Auto-updater check failed (offline?)");
      }
    };

    setTimeout(checkForUpdates, 5000);
    const interval = setInterval(checkForUpdates, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Indicate successful boot
  useEffect(() => {
    (window as any).__isBooted = true;
  }, []);

  // === CARGA INICIAL ASINCRONA ASYNC STORAGE ===
  useEffect(() => {
    const loadData = async () => {
      try {
        const lastAppVersion = localStorage.getItem('LAST_APP_VERSION_ID');
        if (!lastAppVersion || lastAppVersion !== CURRENT_VERSION_ID) {
          console.log(`[App] Version mismatch: ${lastAppVersion} -> ${CURRENT_VERSION_ID}. Purging cache...`);

          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
              await registration.unregister();
            }
          }

          if ('caches' in window) {
            const cacheNames = await caches.keys();
            for (const cacheName of cacheNames) {
              await caches.delete(cacheName);
            }
          }

          let savedSettings = null; 
          let savedBranchSettings = null;

          const oldSaved = localStorage.getItem('prestamaster_v2');
          if (oldSaved) {
            try {
              const oldData = JSON.parse(oldSaved);
              if (oldData?.settings) savedSettings = oldData.settings;
              if (oldData?.branchSettings) savedBranchSettings = oldData.branchSettings;
            } catch (e) { }
          } else {
            const idbSaved = await StorageService.getItem<AppState>('prestamaster_v2');
            if (idbSaved && idbSaved.settings) savedSettings = idbSaved.settings;
            if (idbSaved && idbSaved.branchSettings) savedBranchSettings = idbSaved.branchSettings;
          }

          localStorage.setItem('LAST_APP_VERSION_ID', CURRENT_VERSION_ID);
          
          // CRITICAL: Explicitly remove from both localStorage and IndexedDB (StorageService)
          localStorage.removeItem('prestamaster_v2');
          await StorageService.removeItem('prestamaster_v2');

          const keysToRemove = [
            'last_sync_timestamp_ms',
            'last_sync_timestamp_v6',
            'last_sync_timestamp_v7',
            'last_sync_timestamp_v8'
          ];
          keysToRemove.forEach(k => localStorage.removeItem(k));

          if (savedSettings || savedBranchSettings) {
            await StorageService.setItem('prestamaster_v2', { 
              settings: savedSettings || defaultInitialState.settings, 
              branchSettings: savedBranchSettings || {} 
            });
          }

          console.log("[App] Purge complete. Force clearing cache and reloading...");
          if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (const r of regs) await r.unregister();
          }
          window.location.href = window.location.pathname + '?v=' + Date.now();
          return;
        }

        let rawData: any = await StorageService.getItem<AppState>('prestamaster_v2');
        if (!rawData) {
          const lsData = localStorage.getItem('prestamaster_v2');
          if (lsData) {
            rawData = JSON.parse(lsData);
            localStorage.removeItem('prestamaster_v2');
            await StorageService.setItem('prestamaster_v2', rawData);
          }
        }

        if (!rawData) {
          setState(defaultInitialState);
          setIsInitializing(false);
          return;
        }

        const json = JSON.stringify(rawData).replace(/"admin-1"/g, `"${SYSTEM_ADMIN_ID}"`);
        rawData = JSON.parse(json);

        const users = (Array.isArray(rawData?.users) ? rawData.users : [initialAdmin]).map((u: any) => ({
          ...u,
          role: u.role as Role,
          managedBy: u.managedBy || u.managed_by
        }));

        let validatedCurrentUser = null;
        if (rawData?.currentUser && rawData.currentUser.id) {
          validatedCurrentUser = users.find((u: User) => u.id === rawData.currentUser.id) || null;
        } else {
          try {
            const res = await Preferences.get({ key: 'NATIVE_CURRENT_USER' });
            if (res.value) {
              const parsedNative = JSON.parse(res.value);
              validatedCurrentUser = users.find((u: User) => u.id === parsedNative.id) || null;
            }
          } catch (e) { }
        }

        setState({
          clients: Array.isArray(rawData?.clients) ? rawData.clients : [],
          loans: (Array.isArray(rawData?.loans) ? rawData.loans : []).map((l: any) => ({ ...l, isRenewal: l.isRenewal || false })),
          payments: Array.isArray(rawData?.payments) ? rawData.payments : [],
          expenses: Array.isArray(rawData?.expenses) ? rawData.expenses : [],
          collectionLogs: (Array.isArray(rawData?.collectionLogs) ? rawData.collectionLogs : []).map((l: any) => ({
            ...l, isRenewal: l.isRenewal || false, isOpening: l.isOpening || false,
            type: l.type as CollectionLogType
          })),
          users,
          currentUser: validatedCurrentUser,
          commissionPercentage: typeof rawData?.commissionPercentage === 'number' ? rawData.commissionPercentage : 10,
          commissionBrackets: Array.isArray(rawData?.commissionBrackets) ? rawData.commissionBrackets : [],
          initialCapital: typeof rawData?.initialCapital === 'number' ? rawData.initialCapital : 0,
          settings: rawData?.settings || defaultInitialState.settings,
          branchSettings: rawData?.branchSettings || defaultInitialState.branchSettings
        });

      } catch (err) {
        console.error("Error loading IDB DB", err);
        setState(defaultInitialState);
      } finally {
        setIsInitializing(false);
      }
    };
    loadData();
  }, []);

  const resolvedSettings = useMemo(() => {
    try {
      return resolveSettings(
        state.currentUser, 
        state.branchSettings || {}, 
        state.users, 
        state.settings || { language: 'es', country: 'CO', numberFormat: 'dot' } as any
      );
    } catch (e) {
      console.error("Settings resolution error:", e);
      return { language: 'es', country: 'CO', numberFormat: 'dot' } as any;
    }
  }, [state.currentUser, state.branchSettings, state.users]);

  return {
    state,
    setState,
    isInitializing,
    resolvedSettings
  };
};
