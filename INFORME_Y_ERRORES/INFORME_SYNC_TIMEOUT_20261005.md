# Informe: Datos incorrectos en la web (recaudado ₲0) — 05/10/2026

## Síntoma
- Web (navegador normal e incógnito): Total Recaudado ₲0, Recaudo Hoy ₲0, Saldo Clientes inflado (₲428.290.010 vs ₲396.193.073 real).
- `localhost:5177` mostraba datos correctos. Cerrar sesión / `?reload=1` no lo arreglaban.
- A la mañana sincronizaba bien.

## Causa raíz
La descarga de `payments` y `collection_logs` (Lote 3 de `hooks/useSync.ts`) usaba paginación `OFFSET` + `ORDER BY updated_at`.
Cada página cuesta más que la anterior. Medición contra Supabase (usuario administrador, sin filtro de sucursal):

| Tabla | Filas (365 días) | Resultado con OFFSET |
|---|---|---|
| payments | 32.471 | página 18 → `57014 statement timeout` (8 s) |
| collection_logs | 12.738 | página 15 → `57014 statement timeout` |

Al fallar el Lote 3, pagos y logs quedaban vacíos: la UI mostraba ₲0 y saldos sin descontar pagos.
No fue un problema de caché: el caché solo ocultaba el fallo a quien ya tenía datos descargados.

## ¿Qué lo disparó?
No hubo cambios de código desde el 2/10. El volumen de datos cruzó el límite de tiempo de Supabase (~8 s por consulta).
`fix_log_mig_incorrectos.mjs` modificó registros (cambia `updated_at`) y pudo contribuir, pero no se confirmó.
Los Gerentes no se afectan igual: sus consultas filtran por `branch_id` (menos filas).

## Corrección (commit `afd394e`)
Paginación **keyset por `id`** (clave primaria): costo constante por página.
Prueba: 32.471 pagos en 33 consultas (43 s) y 12.738 logs en 13 consultas (16 s), sin errores.
Si una consulta falla, reduce el tamaño de página (1000 → 500 → 250 → 100) y reintenta hasta 5 veces.

## Parche preventivo (este commit)
1. **Watchdog por inactividad:** el límite de 300 s era total. Ahora se renueva con cada página recibida y solo aborta tras 120 s sin progreso. La base puede crecer sin volver a romper.
2. **Aviso visible:** si una descarga completa se aborta, se muestra "Descarga incompleta" en vez de fallar en silencio con ₲0.

## Recomendaciones
- Los índices `updated_at` ya existen (`PARCHE_OPTIMIZAR_DISK_IO.sql`); no hace falta crear más.
- Con la base creciendo, evaluar a futuro un RPC de totales en el servidor para el dashboard del administrador, en lugar de descargar todos los pagos.
- Después de scripts masivos de corrección (`UPDATE` sobre muchas filas) verificar la sincronización del administrador en incógnito.
- Regla: no usar `OFFSET` en tablas que crecen (`payments`, `collection_logs`); usar keyset por `id`.
