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
| 2026-11-18 | `474fa56` | Nivel 2: Leaflet bajo demanda, `payments` & Blindaje Caída Supabase | (1) Creado `utils/leafletLoader.ts` y quitado `<script>`/`<link>` bloqueante de `leaflet` del `<head>` en `index.html`; `Reports.tsx` y `CollectionMap.tsx` cargan Leaflet solo al abrir mapas sin bloquear el arranque ni afectar el GPS de Pago/No Pago. (2) Dejado de descargar en `pullData` y de guardar en RAM/IndexedDB la tabla `payments` (que ninguna pantalla leía; `pushPayment` / `pushBulk` siguen respaldando a Supabase al cobrar/importar), reduciendo tráfico de sync, eventos Realtime duplicados y uso de memoria/watchdogs. (3) Blindada la cola offline (`useSync.ts`): errores transitorios de red, timeout o Supabase 5xx (`500/502/503/504/429`) usan `transientAttempts` con backoff hasta 60 s pero **nunca incrementan `retryCount` ni expulsan pagos/no-pagos a `failedSyncItems`**, tolerando caídas de Supabase de 1+ hora sin pérdida de cobros; bajado reintento de `syncInterval` de 2s a 30s para cuidar batería. `tsc --noEmit` y `vite build` verificados. |

---

## 2. Qué NO Funcionó / Qué NO se Hizo / Reglas de No Regresión (No Repetir)

1. **NO usar `keep-alive` (`display: none`) para mantener varias pestañas pesadas montadas** (`1cd0f32` → revertido en `c6f96c7`): `Clients.tsx` + `Dashboard.tsx` + `Loans.tsx` + `CollectionRoute.tsx` montados juntos saturaron memoria y dispararon el error **React #185**.
2. **NO quitar la recuperación *cross-branch* a `Gerente`** (`2807c0e` y refinado en `6d33d40`): Al filtrar `Gerente` por `branch_id` en las consultas principales, es obligatorio mantenerlo incluido junto con `Administrador` en la consulta *cross-branch* para no perder pagos registrados por otro rol en sus clientes.
3. **NO reducir `safetyMargin` web por debajo de 2 horas (`7,200,000 ms`)** (`97f7569`): Si un cobrador tiene la hora del teléfono Android desfasada/atrasada 1 hora, un margen de 15 min haría que el PC en web no descargue sus pagos recién sincronizados.
4. **NO filtrar eventos Realtime `DELETE` por `payload.new?.branch_id`**: En Postgres/Supabase los eventos `DELETE` no traen `payload.new` (y `payload.old` suele traer solo la PK si no hay `REPLICA IDENTITY FULL`). Nunca ignorar `DELETE` por sucursal; solo agrupar con *debounce* de 400 ms.
5. **NO filtrar por `validUuidRegex` al cerrar o eliminar préstamos/cobros** (`7ffc8a7`): Los registros históricos con prefijo `L-` o `LOG-` son `TEXT` válidos en Supabase; excluirlos los dejaba activos en la nube provocando saldos duplicados.
6. **NO pasar `undefined` como `prefilteredLogs` a `calculateTotalPaidFromLogs`**: Si un préstamo aún no tiene cobros en el `Map`, pasar `logsMap.get(loanId) || []`. Si se pasa `undefined`, la función recorre linealmente todos los `collectionLogs` (`O(N × M)`).
7. **NO importar `xlsx-js-style` o `jspdf` de forma estática** en componentes principales o helpers compartidos (`pdfHelper.ts` debe usar `import type { jsPDF }`), porque arrastran ~1.5 MB al bundle inicial y ralentizan celulares Android.
8. **NO expulsar elementos de `syncQueue` a `failedSyncItems` por errores de red/timeout/5xx de Supabase**: Antes, si Supabase caía más de ~20 minutos (20 reintentos en backoff de 60s), `item.retryCount > 20` sacaba pagos/no-pagos de `syncQueue` hacia `failedSyncItems` y nunca se subían solos al volver Supabase. Los errores transitorios (`isTransientNetworkOrServerError`) deben esperar indefinidamente con `transientAttempts` hasta que Supabase responda.
9. **NO eliminar Leaflet por completo** (descartado): El usuario utiliza el mapa de Pagos y No Pagos en Reportes y en el Mapa de Cobros; se mantiene cargado bajo demanda con `utils/leafletLoader.ts`.
10. **Nota técnica de build Windows / Android (APK Web Espejo):**
    - Para `tsc`, ejecutar directamente `node cobros\node_modules\typescript\bin\tsc --noEmit -p cobros\tsconfig.json` (no usar `npx tsc` sin red).
    - La APK Android funciona como **web espejo** (`server.url: "https://diegocabrio1805-arch.github.io/cobros/"` en `capacitor.config.ts` y `android/app/src/main/assets/capacitor.config.json`). `.github/workflows/static.yml` despliega automáticamente cada `push` a `main`, por lo que los celulares reciben todos los cambios web sin recompilar ni reinstalar la APK (al reiniciar la app o pulsar "Recargar App" en `AutoUpdater.tsx`). **Solo se debe recompilar la APK (`npx cap sync android` / `./gradlew`) si se modifican plugins nativos, permisos Android, ícono nativo o splash.**

---

## 3. Cronograma Pendiente (Qué Falta por Hacer para Retomar la Próxima Vez)

### Fase A — Rápida, bajo riesgo y alto impacto inmediato
| ID | Archivo(s) | Qué falta realizar | Beneficio directo | Estado |
| :--- | :--- | :--- | :--- | :---: |
| **A1** | `components/CollectionRoute.tsx` (líneas 192–193, 239 y 159) | Corregir el indicador visual `hasNoPayReport` ("No Pago hoy" en la lista de Ruta, hoy oculto porque `logsByLoan` solo guarda `PAGO`) y limpiar el texto con código pegado dentro del `confirm()` de `handleDeleteClient` (línea 159). | El cobrador vuelve a ver marcado en Ruta a quién ya reportó No Pago hoy, y el aviso de borrado queda limpio. | ⏳ Pendiente |
| **A2** | `components/CollectionRoute.tsx` (líneas 64–86) | Cachear en memoria 1 vez por sesión/gerente la consulta a `credenciales_bancard` en lugar de consultarla en Supabase cada vez que se selecciona un cliente. | Evita cientos de consultas redundantes a Supabase al día en redes 4G lentas. | ⏳ Pendiente |
| **A3** | `public/`, `vite.config.ts`, `index.html` (línea 10) | Comprimir íconos pesados en `public/` (`pwa-512x512.png` 441 KB, `pwa-192x192.png` 441 KB, `favicon.ico` 397 KB, `app_icon.png` 246 KB), excluir `feature_graphic.png` (352 KB) y `app_icon.png` del precaché PWA (~1.7 MB menos de precaché), y agregar `runtimeCaching` para `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/...` para carga de íconos 100% offline. | Acelera la primera carga en móvil y garantiza que los íconos funcionen tras 4+ horas sin señal. | ⏳ Pendiente |

### Fase B — Optimizaciones profundas (Mediano plazo / Mayor escala)
| ID | Archivo(s) | Qué falta realizar | Beneficio directo | Estado |
| :--- | :--- | :--- | :--- | :---: |
| **B1** | `utils/localforageStorage.ts`, `hooks/useAppSyncEngine.ts` | Separar `IndexedDB` (`prestamaster_v3`) por tabla (`clients`, `loans`, `collectionLogs`, `settings`) en vez de un solo objeto gigante. | Al registrar 1 cobro ya no reescribe toda la cartera en disco; elimina micro-tirones y ahorra batería. | ⏳ Pendiente |
| **B2** | `hooks/useSync.ts` | Omitir el JSON `installments` en préstamos históricos ya `Pagado` (descarga bajo demanda solo al abrir historial del crédito). | Evita que el celular se vuelva lento con los meses al acumular miles de cuotas ya cerradas. | ⏳ Pendiente |
| **B3** | `hooks/useSync.ts`, `hooks/useAppSyncEngine.ts` | Inyección directa de eventos Realtime (`payload.new`) al estado del Administrador en lugar de esperar debounce + re-consulta incremental. | Baja la latencia visual en el Administrador de **2–4 s a ~1 s** y reduce lecturas a Supabase. | ⏳ Pendiente |
| **B4** | `package.json`, `vite.config.ts` | Limpiar dependencias pesadas sin uso en runtime (`jimp`, auditoría de `vite-plugin-node-polyfills`). | Reduce peso del bundle final y tiempos de build. | ⏳ Pendiente |

---

## 4. Escala y Capacidad Actual del Sistema (Diagnóstico 2026-11-18)

- **Nivel actual:** **PYME / Financiera Mediana Multi-Sucursal** (~**8/10** en estabilidad operativa y blindaje offline).
- **Por cobrador (celular Android gama media/baja):** cómodo hasta **300–500 clientes activos** y **200–400 registros (Pagos / No Pagos) diarios** por cobrador (las RPCs `get_collector_*` descargan únicamente su propia cartera). Soporta cortes de internet de **4+ horas** y caídas de Supabase de **1+ hora** sin pérdida de cobros ni pérdida de visibilidad en el Administrador al reconectar.
- **Por sucursal (Administrador / Gerente):** cómodo con **5 a 25 cobradores por sucursal**, **1.500 a 4.000 clientes activos** y **25.000 a 50.000 cobros al año por sucursal** (~1.000–3.000 movimientos/día), aislado estrictamente por `branch_id` y ventana de 365 días en `fullSync`.
- **Plataforma completa (multi-sucursal en paralelo):**
  - Con **Supabase Free:** ~**50 a 100 usuarios simultáneos** (~5–15 sucursales medianas; techo fijado por 500 MB de BD, 200 conexiones Realtime y 5 GB/mes de *egress*).
  - Con **Supabase Pro ($25/mes):** **500+ usuarios simultáneos** (~20–60+ sucursales / 100–300 cobradores en calle al mismo tiempo).
- **Qué destraba el salto a Empresa Grande (> 5.000 clientes activos o > 50 cobradores en una sola sucursal):** completar la **Fase B** (`B1` IndexedDB por tabla, `B2` omitir `installments` en créditos `Pagado`, `B3` Realtime directo) y, en una etapa posterior, mover reportes históricos de 365 días a consultas SQL bajo demanda en Supabase en vez de mantener todo el año en RAM del navegador.
