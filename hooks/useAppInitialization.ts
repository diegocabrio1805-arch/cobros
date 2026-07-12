import { useState, useEffect, useMemo } from 'react';
import { Preferences } from '@capacitor/preferences';
import { AppState, User, Role, CollectionLogType, CollectionLog } from '../types';
import { StorageService } from '../utils/localforageStorage';
import { resolveSettings } from '../utils/settingsHierarchy';

export const CURRENT_VERSION_ID = '6.9.6-STABLE';
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
    isolatedExpenses: [],
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

  // --- ARRANQUE SEGURO (Mecanismo de Recuperación) ---
  useEffect(() => {
    (window as any).__isBooted = true;
  }, []);

  // --- BULLETPROOF AUTO-UPDATER ---
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const url = window.location.pathname.endsWith('index.html') ? window.location.pathname : 'index.html';
        const res = await fetch(url + '?t=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) return;
        const text = await res.text();
        const match = text.match(/CURRENT_VERSION_ID\s*=\s*'([^']+)'/) || text.match(/CURRENT_VERSION\s*=\s*'([^']+)'/);
        
        if (match && match[1]) {
          const remoteVersion = match[1];
          if (remoteVersion !== CURRENT_VERSION_ID) {
            console.log(`[Update] New version found: ${remoteVersion}. Scheduling refresh...`);
            if ('caches' in window) {
                const names = await caches.keys();
                await Promise.all(names.map(name => caches.delete(name)));
            }
            window.location.reload();
          }
        }
      } catch (e) { }
    };
    setTimeout(checkForUpdates, 15000); // Check after 15s of stability
  }, []);

  const [isSecondaryLoading, setIsSecondaryLoading] = useState(true);

  // === CARGA INICIAL OPTIMIZADA EN DOS FASES ===
  useEffect(() => {
    const loadData = async () => {
      const startTime = Date.now();
      try {
        // === FASE 1: METADATOS ESENCIALES (renderiza Layout en <50ms) ===

        // 1. VERSION & PURGE MANAGEMENT
        const lastAppVersion = localStorage.getItem('LAST_APP_VERSION_ID');
        if (!lastAppVersion || lastAppVersion !== CURRENT_VERSION_ID) {
          console.log(`[App] Version updated: ${lastAppVersion} -> ${CURRENT_VERSION_ID}. Purging cache...`);
          localStorage.setItem('LAST_APP_VERSION_ID', CURRENT_VERSION_ID);
          await StorageService.removeItem('prestamaster_v2');
          const syncKeys = [
            'lastSyncTime', 'lastAppSync_timestamp', 'last_sync_timestamp_ms',
            'last_sync_timestamp_v8', 'last_sync_timestamp_v7', 'last_sync_timestamp_v6',
            'last_sync_timestamp', 'last_full_sync', 'sync_metadata', 'syncQueue',
            'last_emergency_sync_key'
          ];
          syncKeys.forEach(k => localStorage.removeItem(k));
          if ('serviceWorker' in navigator) {
            try {
              const regs = await navigator.serviceWorker.getRegistrations();
              for (const r of regs) await r.unregister();
            } catch (swErr) {
              console.warn("[App] Could not unregister SW (Incognito?):", swErr);
            }
          }
        }

        // Helper para evitar promesas colgadas
        const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
          return Promise.race([
            promise,
            new Promise<T>((resolve) => {
              const timer = setTimeout(() => {
                console.warn(`[Storage Timeout] Promesa colgada por > ${ms}ms. Forzando liberacion.`);
                resolve(fallback);
              }, ms);
              promise.then(() => clearTimeout(timer)).catch(() => clearTimeout(timer));
            })
          ]);
        };

        // 2. LEER STORAGE (con timeout de seguridad)
        let rawData: any = await withTimeout(
          StorageService.getItem<AppState>('prestamaster_v2'),
          2500,
          null
        );

        if (!rawData) {
          const lsData = localStorage.getItem('prestamaster_v2');
          if (lsData) {
            try { rawData = JSON.parse(lsData); } catch(e) {}
          }
        }

        if (!rawData) {
          // Intentar recuperación desde Preferences
          const nativePref = await withTimeout(
            Preferences.get({ key: 'NATIVE_CURRENT_USER' }),
            1500,
            { value: null }
          );
          if (nativePref.value) {
            try {
              const user = JSON.parse(nativePref.value);
              console.log('[Auto-Curación] Iniciando sesión sin datos en IDB (Rescatado). Borrando timestamps.');
              const syncKeys = ['last_sync_timestamp_ms', 'last_sync_timestamp_v8'];
              syncKeys.forEach(k => localStorage.removeItem(k));
              setState({ ...defaultInitialState, currentUser: user });
              setIsInitializing(false);
              setIsSecondaryLoading(false);
              return;
            } catch(e){}
          }
          setState(defaultInitialState);
          setIsInitializing(false);
          setIsSecondaryLoading(false);
          return;
        }

        // 3. PARSEAR METADATOS LIVIANOS (usuarios, sesión, settings)
        const users = (Array.isArray(rawData?.users) ? rawData.users : [initialAdmin]).map((u: any) => ({
          ...u,
          role: u.role as Role,
        }));

        let validatedCurrentUser = null;
        if (rawData?.currentUser?.id) {
          validatedCurrentUser = users.find((u: User) => u.id === rawData.currentUser.id) || null;
        }

        // Fallback robusto a Preferences
        if (!validatedCurrentUser) {
          try {
            const { value } = await Preferences.get({ key: 'NATIVE_CURRENT_USER' });
            if (value) {
              const parsedNative = JSON.parse(value);
              validatedCurrentUser = users.find((u: User) => u.id === parsedNative.id) || null;
            }
          } catch (e) { }
        }

        // FASE 1 COMPLETA: Renderizar Layout con datos livianos. Arrays pesados = vacíos por ahora.
        setState(prev => ({
          ...prev,
          users,
          currentUser: validatedCurrentUser,
          commissionPercentage: rawData?.commissionPercentage ?? 10,
          commissionBrackets: rawData?.commissionBrackets ?? [],
          initialCapital: rawData?.initialCapital ?? 0,
          settings: rawData?.settings || defaultInitialState.settings,
          branchSettings: rawData?.branchSettings || {},
          // Arrays pesados: vacíos temporalmente, se cargan en Fase 2
          clients: [],
          loans: [],
          payments: [],
          expenses: [],
          isolatedExpenses: [],
          collectionLogs: [],
        }));

        const phase1Time = Date.now() - startTime;
        console.log(`[App] ⚡ Fase 1 (Layout ready) en ${phase1Time}ms`);
        setIsInitializing(false); // El spinner global desaparece AQUÍ

        // === FASE 2: ARRAYS PESADOS (hilo liberado, siguiente tick del evento) ===
        setTimeout(() => {
          try {
            const parsedClients = Array.isArray(rawData?.clients) ? rawData.clients : [];
            if (parsedClients.length === 0) {
              console.log('[Auto-Curación] IDB cargado pero sin clientes. Borrando timestamps de sync para Full Sync.');
              const syncKeys = ['last_sync_timestamp_ms', 'last_sync_timestamp_v8'];
              syncKeys.forEach(k => localStorage.removeItem(k));
            }

            setState(prev => ({
              ...prev,
              clients: parsedClients,
              loans: Array.isArray(rawData?.loans) ? rawData.loans : [],
              payments: Array.isArray(rawData?.payments) ? rawData.payments : [],
              expenses: Array.isArray(rawData?.expenses) ? rawData.expenses : [],
              isolatedExpenses: Array.isArray(rawData?.isolatedExpenses) ? rawData.isolatedExpenses : [],
              collectionLogs: Array.isArray(rawData?.collectionLogs) ? rawData.collectionLogs : [],
            }));

            const totalTime = Date.now() - startTime;
            console.log(`[App] ✅ Fase 2 (Datos completos) en ${totalTime}ms`);
          } catch (err) {
            console.error("Error en Fase 2 de carga:", err);
          } finally {
            setIsSecondaryLoading(false);
          }
        }, 0);

      } catch (err) {
        console.error("Critical Boot Error:", err);
        setState(defaultInitialState);
        setIsInitializing(false);
        setIsSecondaryLoading(false);
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
    isSecondaryLoading,
    resolvedSettings
  };
};
