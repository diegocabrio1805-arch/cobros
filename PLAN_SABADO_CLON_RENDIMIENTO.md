# Plan de Trabajo para el Sábado: Clonación y Optimización de Rendimiento

## Objetivo Principal
Crear un clon independiente del sistema "Anexo Cobro" para realizar pruebas de rendimiento profundas sin afectar a los usuarios en producción. El objetivo técnico es eliminar los "cuelgues" en celulares de gama media/baja al iniciar sesión y sincronizar.

## Pasos Acordados

### Fase 1: Preparación del Entorno (Clonación)
1. Duplicar la carpeta local del proyecto `cobros` hacia un nuevo directorio (ej. `cobros_v2` o `anexo_clon`).
2. El usuario deberá crear un **nuevo proyecto vacío en Supabase** (versión gratuita).
3. Inyectar las nuevas credenciales de Supabase (`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`) en el archivo `.env` del proyecto clonado.
4. Ejecutar los scripts SQL de inicialización en el nuevo panel de Supabase para generar las tablas vacías necesarias.

### Fase 2: Cirugía de Rendimiento (Web Workers)
1. **Extracción del filtrado:** Sacar la lógica pesada del `filteredState` del archivo `useAppSyncEngine.ts` (que actualmente bloquea el hilo principal de React con su `useMemo`).
2. **Creación del Web Worker:** Trasladar todo el procesamiento matemático (quién ve qué préstamos, clientes, pagos, etc.) a un hilo en segundo plano (Web Worker).
3. **Optimización de la Cola:** Cambiar la lectura de la cola de sincronización de `localStorage` a almacenamiento puramente asíncrono.
4. **Optimización del Chunking:** Evitar que el método `mergeData` combine arreglos masivos de forma bloqueante.

### Fase 3: Pruebas y Despliegue
1. Desplegar el sistema clonado en una nueva URL temporal (ej. vía Netlify).
2. Probar el inicio de sesión y sincronización con cuentas simuladas que tengan alta carga de datos desde un dispositivo móvil de baja capacidad.
3. Si el resultado es exitoso y fluido, decidir si se migran los usuarios a esta nueva versión o si se portan los cambios al código principal.

---
*Nota para la IA: Al iniciar sesión el sábado, leer este documento como contexto prioritario antes de realizar cualquier cambio en el código fuente.*
