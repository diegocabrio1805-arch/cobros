# Walkthrough - Auditoría de Mapeo Total v6.1.183

He completado la auditoría de mapeo estricto para asegurar que el 100% de los datos se sincronicen correctamente entre el frontend y Supabase, sin riesgo de pérdida de datos por diferencias en nombres de campos (camelCase vs snake_case).

## Cambios Realizados

### 1. Sincronización de Subida (Push) - `useSync.ts`

- **Clientes**: Fotos, Ubicación, Límites de crédito.
- **Préstamos**: Tasas de interés, Cuotas, Fechas de feriados.
- **Pagos y Logs**: Recibos, Notas, Marcas de tiempo, Geolocalización por pago.

### 2. Sincronización de Bajada (Pull) - `App.tsx`

- Se expandieron los bloques de mapeo en `handleRealtimeData` para convertir los datos que vienen de Supabase (snake_case) de vuelta a las propiedades de la App (camelCase).

### 3. Sincronización de Borrado Suave (`deleted_at`)

- Se aseguró que TODAS las tablas mapeen correctamente el campo `deleted_at`.

### 4. Versión v6.1.183

- Se incrementó la versión para reflejar estos cambios críticos de integridad de datos.
