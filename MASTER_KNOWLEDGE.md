# Manual Maestro: Anexo Cobro v6.7.4-STABLE

Este documento sirve como la **Memoria Central** del proyecto, consolidando todas las funciones, optimizaciones y decisiones arquitectónicas realizadas hasta la fecha.

## 📱 Funciones Principales

### 1. Sistema de Recibos Inviolables (Foto)
- **Captura Profesional**: Implementamos una técnica de "Foto Recibo" usando `html2canvas`. Captura un contenedor oculto con diseño de ticket y lo convierte en imagen (`JPEG`).
- **Antifraude**: Al ser una imagen, el cobrador no puede editar montos ni fechas tras el envío, garantizando la integridad de los datos.
- **Leyenda Estandarizada**: Al compartir por WhatsApp, el caption automático es siempre: `"Comprobante de Operación"`.

### 2. Automatización de Comunicación (Modo Ticket)
- **WhatsApp "One-Click"**: Tras registrar un pago exitoso, la app abre automáticamente WhatsApp dirigida al cliente.
- **Mensaje Simplificado**: El texto pre-cargado es únicamente la palabra `"ticket"`. Esto acelera el flujo de trabajo del cobrador en la calle.
- **Botón PDF**: Se mantiene la opción manual de generar y compartir un PDF tradicional de alta calidad (`jsPDF`).

### 3. Globalización y Multipaís (CO / PY)
- **Localización Dinámica**: Soporte nativo para Colombia y Paraguay.
- **Prefijos Telefónicos**: Lógica inteligente de marcado (`+57`, `+595`) que limpia números y detecta longitudes (ej: 10 dígitos en Colombia).
- **Formateo de Moneda**: Separadores de miles y moneda configurables dinámicamente desde el panel de Opciones de la empresa.

## ⚙️ Optimizaciones para Gama Baja (Samsung A04 / TCL 40)

### 1. Sincronización Secuencial (Anti-Crash)
- Para evitar que la app se cierre por falta de memoria RAM al arrancar en celulares viejos, el proceso de descarga de tablas (`useSync.ts`) se realiza de forma **escalonada**:
    - Descarga tablas ligeras (Settings, Users) primero.
    - Introduce retrasos de 100-200ms entre las tablas pesadas (Clients, Loans, Logs).
    - Esto mantiene estable la WebView de Android durante la sincronización inicial.

### 2. Auto-Curación y Purga (Deep Purge)
- **Control de Versiones**: Al detectar un cambio en `CURRENT_VERSION_ID` (en `useAppInitialization.ts`), la app realiza una limpieza total:
    - Borra `localStorage`.
    - Borra `IndexedDB` (LocalForage) por completo.
    - Borra el `Service Worker` y la caché del navegador.
- **Beneficio**: Corrige errores de "app colgada" sin necesidad de que el usuario desinstale y vuelva a instalar la APK.

## 🛠 Arquitectura Técnica

- **Frontend**: React 18 con Vite.
- **Backend**: Supabase (PostgreSQL + Realtime + Auth).
- **Almacenamiento Offline**: 
    - `localStorage`: Datos de sesión y sincronización rápida.
    - `localforage`: Base de datos pesada para clientes, préstamos e imágenes (fotos de casa/negocio).
- **Build Pipeline**: GitHub Actions automatizado vía `android-build.yml`.

---
*Manual maestro actualizado el 13 de abril de 2026. Versión de Producción: 6.7.4-STABLE*
