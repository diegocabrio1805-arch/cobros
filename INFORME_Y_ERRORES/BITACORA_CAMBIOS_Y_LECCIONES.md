# Bitácora Automática de Cambios, Métricas y Lecciones Aprendidas — Anexo Cobro

> **Uso obligatorio para el agente:** Leer este archivo antes de diagnosticar o modificar `cobros` y actualizarlo automáticamente después de cada cambio, prueba o despliegue (incluso si algo falla o se revierte).

---

## 1. Cambios y Optimizaciones Ya Aplicadas (Qué Funcionó)

| Fecha | Commit | Área | Qué se realizó y resultado verificado |
| :--- | :--- | :--- | :--- |
| 2026-10-08 | `2807c0e` | Sync (`Gerente`) | Se removió filtro restrictivo en `payments`/`collection_logs` para el rol `Gerente` para no perder pagos registrados por Admin u otra sucursal en clientes propios. |
| 2026-10-10 | `97f7569` | Web Sync | En navegador normal (PC), se amplió el margen de incremento a **2 horas** (`7,200,000 ms`) para cubrir desfases de reloj de hasta 1 h en celulares Android y se añadió el vigilante de auto-reparación. |
| 2026-10-12 | `c6f96c7` / `12b9efa` | Performance, RLS & Saldos | Eliminado `keep-alive` (`display: none`) en `App.tsx` (erradicó React Error `#185` y OOM móvil). Aislamiento por `branch_id` en Admin + paginación *keyset* por `id` + creación de `PARCHE_AISLAMIENTO_ESTRICTO_ADMINS.sql`. Unificado cálculo de `getClientMetrics` en `Dashboard.tsx`, `Simulator.tsx` y `MobileOrdersWidget.tsx`. |
| 2026-10-xx | `9c25adc` | Seguridad | Bloqueo de inicio de sesión a usuarios `soft-deleted`. |
| 2026-10-xx | `0e9ead3` | Saldos | Deduplicación de logs `MIGRACIÓN EXCEL` (`LOG-MIG-*`) en cálculo de saldo. |
| 2026-10-xx | `b652fc2` / `d0bacdc` | Móvil Android | `FastInput` sin lag en teclados Android/Honor IME y limpieza de pedidos zombie. |
| 2026-10-xx | `4a536f5` | Importación Excel | Preservación exacta de saldo y monto pagado al importar planillas Excel (`excelHelper.ts`). |
| 2026-10-xx | `3114c15` | Tickets | Configuración independiente por sucursal para ocultar campos del ticket/recibo. |
| 2026-11-16 | `fc57872` | Saldos & Tickets | Paridad de recibos/tickets/reimpresiones/reportes con `calculateTotalPaidFromLogs` y `calculateTotalPaidUpTo`. Auto-anulación (`deleted_at`) de `collection_logs` previos a planilla al importar Excel + limpieza en BD de 103 logs pre-planilla. |
| 2026-11-17 | `7ffc8a7` | Sync, Borrado & Planillas | Corrección definitiva de variación entre `ALTERFINADMI` y cobradores (`coacobrador3`/`coacobrador4`): (1) `useSync.ts` ahora sí elimina/marca `deleted_at` en IDs legacy `L-` y `LOG-` en cascada; (2) `useAppActions.ts` cierra préstamos `L-` superpuestos en Supabase al importar Excel (incluso clientes duplicados por nombre); (3) `useAppSyncEngine.ts` impide que `mergeData` resucite registros `deleted_at` (`emergency_sync_v6913_CARTERA_UNIFICADA_V3`); (4) `CollectionRoute.tsx` y `Loans.tsx` deduplican por cliente y filtran logs eliminados/no-pagos. Limpieza en BD dejó `coacobrador3` (93 activos = `128.566.531 Gs`) y `coacobrador4` (68 activos = `84.778.792 Gs`) con 0 Gs de variación. |
| 2026-11-18 | `6d33d40` | Rendimiento Nivel 1 | Optimización de carga, CPU, Realtime e IndexedDB en 10 archivos (`App.tsx`, `Clients.tsx`, `CollectorCommission.tsx`, `Dashboard.tsx`, `Loans.tsx`, `Sidebar.tsx`, `useAppSyncEngine.ts`, `useSync.ts`, `utils/pdfHelper.ts`, `vite.config.ts`): `chunk-clients` **1,257.49 → 271.28 kB (-78% / gzip -86%)**, `chunk-dashboard` **626.05 → 261.58 kB (-58%)**, PWA precaché **10,600.09 → 6,315.61 KiB (-40%, 73 → 47 archivos)**; carga bajo demanda de `xlsx-js-style` (970 kB) y `jspdf` (555 kB); eliminación de bucles `O(N × M)` en `Loans`, `Dashboard`, `Clients`; reloj aislado en `SidebarClock`; fin de doble escritura en IndexedDB; filtro de `branch_id` en Realtime (`INSERT`/`UPDATE`) y `Gerente`, *debounce* de 400 ms en `DELETE`, *throttle* en auditoría (10 min) y *cross-branch* paralelizado (5 min). `tsc --noEmit` = 0 errores y `vite build` = OK. |

---

## 2. Qué NO Funcionó / Reglas de No Regresión (No Repetir)

1. **NO usar `keep-alive` (`display: none`) para mantener varias pestañas pesadas montadas** (`1cd0f32` → revertido en `c6f96c7`): `Clients.tsx` + `Dashboard.tsx` + `Loans.tsx` + `CollectionRoute.tsx` montados juntos saturaron memoria y dispararon el error **React #185**.
2. **NO quitar la recuperación *cross-branch* a `Gerente`** (`2807c0e` y refinado en `6d33d40`): Al filtrar `Gerente` por `branch_id` en las consultas principales, es obligatorio mantenerlo incluido junto con `Administrador` en la consulta *cross-branch* para no perder pagos registrados por otro rol en sus clientes.
3. **NO reducir `safetyMargin` web por debajo de 2 horas (`7,200,000 ms`)** (`97f7569`): Si un cobrador tiene la hora del teléfono Android desfasada/atrasada 1 hora, un margen de 15 min haría que el PC en web no descargue sus pagos recién sincronizados.
4. **NO filtrar eventos Realtime `DELETE` por `payload.new?.branch_id`**: En Postgres/Supabase los eventos `DELETE` no traen `payload.new` (y `payload.old` suele traer solo la PK si no hay `REPLICA IDENTITY FULL`). Nunca ignorar `DELETE` por sucursal; solo agrupar con *debounce* de 400 ms.
5. **NO filtrar por `validUuidRegex` al cerrar o eliminar préstamos/cobros** (`7ffc8a7`): Los registros históricos con prefijo `L-` o `LOG-` son `TEXT` válidos en Supabase; excluirlos los dejaba activos en la nube provocando saldos duplicados.
6. **NO pasar `undefined` como `prefilteredLogs` a `calculateTotalPaidFromLogs`**: Si un préstamo aún no tiene cobros en el `Map`, pasar `logsMap.get(loanId) || []`. Si se pasa `undefined`, la función recorre linealmente todos los `collectionLogs` (`O(N × M)`).
7. **NO importar `xlsx-js-style` o `jspdf` de forma estática** en componentes principales o helpers compartidos (`pdfHelper.ts` debe usar `import type { jsPDF }`), porque arrastran ~1.5 MB al bundle inicial y ralentizan celulares Android.
8. **Nota técnica de build Windows / Android:**
   - Para `tsc`, ejecutar directamente `node cobros\node_modules\typescript\bin\tsc --noEmit -p cobros\tsconfig.json` (no usar `npx tsc` sin red).
   - Para los dispositivos que usan la **APK instalada** (no navegador web/PWA), los cambios de código requieren recompilar la APK (`npx cap sync android`).

---

## 3. Optimizaciones Pendientes (Nivel 2 — Backlog Verificado)

1. **`leaflet.js` bloqueante en `<head>` de `index.html`:** Cargar con `defer` o dinámicamente solo al abrir el mapa, para que celulares sin buena señal en 3G/4G no queden bloqueados esperando a `unpkg.com` antes de iniciar React.
2. **Dejar de descargar/persistir `state.payments` en memoria y en IndexedDB:** Ninguna pantalla ni cálculo actual lee `state.payments` (todos los saldos y recibos salen de `state.collectionLogs`). Mantener el `upsert` hacia Supabase al cobrar si se requiere respaldo SQL, pero omitir su descarga en `pullData` y su almacenamiento en IndexedDB reducirá casi a la mitad el volumen de sync y RAM.
3. **Separar IndexedDB por tabla:** En `localforageStorage.ts` y `useAppSyncEngine.ts`, dividir `prestamaster_v3` en claves independientes (`clients`, `loans`, `collectionLogs`, `settings`) para no reescribir toda la cartera al registrar un solo cobro.
4. **Omitir el JSON `installments` en créditos `Pagado`:** Evitar traer en memoria/sync decenas de cuotas ya cerradas para créditos finalizados hace meses, descargándolas bajo demanda si se abre el historial.
5. **Realtime incremental directo + limpieza de assets:** Inyectar `payload.new` directo al estado en lugar de re-consultar tablas, comprimir `public/favicon.png` (451 kB en precaché PWA) y auditar dependencias pesadas no usadas en runtime (`jimp`, `vite-plugin-node-polyfills`).
