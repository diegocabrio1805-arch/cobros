# Manual Técnico de Optimización y Estabilización (v6.7.x)

Este documento resume las configuraciones críticas realizadas para asegurar el rendimiento de la aplicación en dispositivos de gama baja y la precisión de los datos en el Dashboard.

## 🛠 Proceso de Compilación (Android APK)
Para generar una APK que no se cierre en equipos de 2-3GB de RAM (Samsung/Xiaomi), se deben mantener estas configuraciones:

### 1. Optimizaciones de Rendimiento (Gradle)
- **R8 / ProGuard**: Activado para reducir el tamaño del código y optimizar la RAM.
- **Shrink Resources**: Activado para eliminar imágenes y recursos no utilizados.
- **Configuración**: `android/app/build.gradle` -> `minifyEnabled true`, `shrinkResources true`.

### 2. Esquema de Carga Local (Capacitor)
- Se utiliza `androidScheme: 'https'` en `capacitor.config.ts`.
- Esto obliga a la app a cargar los archivos desde el almacenamiento interno del teléfono en lugar de usar un servidor virtual lento, lo que evita cierres al arrancar.

### 3. Compatibilidad de Versiones (SDK)
- **compileSdkVersion**: 36 (Requerido para bibliotecas AndroidX).
- **targetSdkVersion**: 35 (Estándar actual para Play Store).
- **Ajustar en**: `android/variables.gradle`.

## ⏱ Lógica del Dashboard (Zonas Horarias)
Para evitar discrepancias en el "Recaudo de Hoy" durante la noche:
- Se utiliza la función `getLocalDateStringForCountry(country, date)` en `Dashboard.tsx`.
- Esta función fuerza la fecha local de Paraguay (`America/Asuncion`) o Colombia (`America/Bogota`) basándose en el país configurado en el sistema, ignorando la hora UTC del servidor.

## 💾 Sincronización y Caché (Supabase)
- **Supabase**: Base de datos central en tiempo real.
- **Memoria Local**: Los datos se guardan en IndexedDB (LocalForage). 
- **⚠️ Importante**: Si se borra el caché del navegador, la app realizará un "Sync Incremental". Si faltan datos, se debe forzar un "Full Sync" borrando las claves `last_sync_timestamp_v8` del LocalStorage.

## 🚀 Script de Despliegue
Cualquier cambio debe subirse usando el archivo **`SUBIR_APK_OPTIMIZADA.bat`** situado en la raíz, el cual automatiza el commit y el push para activar los GitHub Actions de construcción de la APK.

---
*Documento actualizado el 28 de marzo de 2026 para la versión 6.7.3*
