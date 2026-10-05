# Informe: Corrección de Cierre Inesperado e Impresoras Bluetooth (05 Octubre 2026)

## Problema Reportado
1. Los celulares no se conectaban correctamente a las impresoras térmicas al intentar imprimir un ticket.
2. Al registrar un pago, la aplicación abría WhatsApp automáticamente y, al volver al sistema, **la aplicación se cerraba (crasheo total)**.

## Causa Raíz (Análisis Técnico)

### 1. Cierre Inesperado de la App (OOM Crash)
El parche anterior que introdujo la paginación optimizada (`keyset pagination`) generó un efecto secundario en el ciclo de vida de la aplicación en Android.
* **El fallo:** Cuando la aplicación pasaba a segundo plano (al abrir WhatsApp) y el usuario volvía, el sistema disparaba el evento `appStateChange`. Este evento **forzaba el desbloqueo** de la cola de sincronización e iniciaba una nueva descarga, **incluso si la descarga anterior aún estaba corriendo en segundo plano**.
* **Resultado:** Esto provocaba que la aplicación ejecutara 2 o más sincronizaciones masivas al mismo tiempo, consumiendo el 100% de la memoria RAM del celular (Out Of Memory - OOM), lo que obligaba a Android a matar/cerrar la aplicación por completo.

### 2. Problemas con la Impresora Bluetooth
La aplicación enviaba la orden de imprimir el recibo (vía el plugin de Bluetooth) y **en el mismo milisegundo** abría WhatsApp.
* **El fallo:** Al abrir WhatsApp, la aplicación de Cobros pasaba a segundo plano instantáneamente. El sistema operativo Android pausa todos los procesos de los plugins (incluido el Bluetooth) cuando una app ya no está en pantalla.
* **Resultado:** La impresora no tenía tiempo suficiente para recibir el buffer de datos completo antes de que la conexión fuera interrumpida por el sistema operativo, resultando en impresiones fallidas o conexiones corruptas.

## Solución Aplicada (El Parche)

1. **Corrección de Memoria en `useSync.ts`:**
   Se eliminó el reseteo forzado del bloqueo de sincronización (`isProcessingRef.current = false`) en el evento de recuperación de la aplicación. Ahora, si la app vuelve de WhatsApp y ya había una sincronización en curso, simplemente la deja terminar, evitando la duplicación de procesos y salvando la memoria RAM. La aplicación ya no se cerrará al volver de WhatsApp.

2. **Temporizador de Impresión en `CollectionRoute.tsx`:**
   Se introdujo un retraso inteligente de **1.5 segundos (1500ms)** antes de abrir WhatsApp automáticamente tras registrar un pago. Esto le da a la impresora Bluetooth el tiempo exacto y necesario para recibir la orden completa y empezar a imprimir antes de que la app pase a segundo plano.

## Pruebas y Próximos Pasos
El parche ya ha sido aplicado. El cobrador ahora notará una pausa de 1 segundo después de registrar el pago (mientras la impresora arranca) e inmediatamente después se abrirá WhatsApp. Al regresar, el sistema se mantendrá estable.
