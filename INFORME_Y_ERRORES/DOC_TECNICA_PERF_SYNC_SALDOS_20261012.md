# Documentación Técnica: Optimización Sync Admin, Fix Error React #185 y Paridad de Saldos en Pedidos
**Fecha:** 12 de Octubre de 2026  
**Commit:** `c6f96c7`  
**Autor:** Antigravity AI Assistant & Diego  

---

## 1. Problema Reportado
1. **Lentitud extrema en el perfil Administrador** (tanto en PC como en celular Android): tardaba mucho en cambiar de pestaña a pestaña y en procesar datos.
2. **Error React #185 en celular**: `Minified React error #185; visit https://react.dev/errors/185` (Maximum update depth exceeded).
3. **Discrepancia en saldo de clientes entre Pedidos Pendientes (Dashboard / Cargar Pedido) y el Expediente del Cliente**:
   - En el panel de pedidos, Maura Isabel figuraba con saldo de ₲780.000 (y ₲220.000 a entregar) cuando en su expediente el saldo real pendiente era ₲30.000.
   - Arnaldo David figuraba con saldo de ₲750.000 cuando en su expediente estaba en ₲0 (crédito totalmente pagado).

---

## 2. Diagnóstico Técnico

### A. Causa de la lentitud y el Error #185
1. **Keep-alive simultáneo de pestañas (commit `1cd0f32`)**:
   - En `App.tsx`, las vistas principales (`Dashboard`, `Clients`, `Loans`, `MobileCollectorMode`) se mantenían montadas en memoria de forma simultánea usando `<div style={{ display: activeTab === '...' ? 'block' : 'none' }}>`.
   - `Clients.tsx` posee más de 5,500 líneas y cientos de listeners y useMemos. Al tener montadas las 4 pantallas a la vez sobrecargaba la memoria del móvil y disparaba re-renders en cadena, provocando el loop de actualización #185.
2. **Descarga masiva no filtrada para Administrador en `useSync.ts`**:
   - El Administrador no tenía filtro de `branch_id` en las consultas de Supabase (`clients`, `loans`, `payments`, `collection_logs`).
   - El sistema descargaba **toda la base de datos** (~52,000 registros, de los cuales ~16,400 correspondían a otras sucursales/admins) y luego los filtraba en memoria en `filteredState` de `useAppSyncEngine.ts`.
3. **Full Sync forzado en arranque web (commit `97f7569`)**:
   - Cada recarga en navegador disparaba una descarga completa de 1 año en vez de respetar el incremental.

### B. Causa de la discrepancia de saldos en Pedidos
- En el **Expediente del Cliente (`Clients.tsx`)**, el cálculo (`getClientMetrics`) evalúa el **crédito vigente/más reciente** del cliente.
- En **Pedidos (`Dashboard.tsx`, `Simulator.tsx` y `MobileOrdersWidget.tsx`)**, la función `getClientBalance` iteraba y sumaba el saldo de **todos** los préstamos históricos del cliente que tuvieran status `Activo` en la base de datos (incluyendo préstamos antiguos de meses previos que no habían sido migrados con status cerrado al renovarse).

---

## 3. Soluciones Implementadas

### A. Eliminación de Keep-Alive en `App.tsx`
- Se removió el envoltorio `display: none` y se restauró el renderizado condicional por pestaña activa (`{activeTab === 'clients' && <Clients ... />}`).
- Se erradicó el error React #185 y la memoria en celulares Android volvió a niveles óptimos.

### B. Aislamiento y Descarga Filtrada por Sucursal en `useSync.ts`
- Se añadió el filtro estricto por `branch_id = currentUser.id` para el Administrador en `clients`, `loans`, `profiles`, `expenses`, `deleted_items`, `simulated_orders` y `collection_logs`.
- **Manejo de registros cruzados (Cross-Branch)**: Para clientes y préstamos del Admin cuyos pagos o logs fueron registrados con un `branch_id` diferente, se implementó una consulta específica en bloques por `client_id` y `loan_id` para garantizar que no se pierda ningún abono histórico.

### C. Restauración del Sync Incremental y Vigilante Filtrado en `useAppSyncEngine.ts`
- Se retiró el Full Sync forzado en el inicio web.
- El motor vigilante de auto-reparación ahora cuenta exclusivamente los registros de la propia sucursal del Administrador (`q.eq('branch_id', user.id)`).
- Se agregó una rutina única de saneamiento (`admin_scope_cleanup_v1`) para descartar datos ajenos en caché local sin tocar la cola offline.

### D. Paridad de Cálculo de Saldo en Pedidos
- En `Dashboard.tsx`, `Simulator.tsx` y `MobileOrdersWidget.tsx`, se reescribió `getClientBalance` para ordenar los préstamos por fecha de creación descendente y evaluar el préstamo activo más reciente (exactamente igual a `getClientMetrics` en `Clients.tsx`).
- Resultado: Saldos y montos de entrega en el panel coinciden al 100% con los expedientes individuales.

### E. Respaldo SQL
- Se creó `PARCHE_AISLAMIENTO_ESTRICTO_ADMINS.sql` en la raíz del repositorio con las políticas de Row Level Security (RLS) para Supabase, disponible para cuando se requiera aplicar aislamiento nativo en la base de datos.
