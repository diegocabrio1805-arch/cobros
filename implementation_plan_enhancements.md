# Mejoras de Estabilidad, GPS y Perfil de Clientes

Este plan aborda la optimización de la conectividad Bluetooth, la persistencia de datos en la nube, y la implementación de controles de GPS obligatorios y captura de datos (fotos/ubicación) en el perfil de clientes.

## Cambios Realizados

### [Bluetooth Service]

- Reducir `KEEPER_INTERVAL_MS` a 5000ms para una reconexión más rápida.
- Asegurar inicio automático del keeper al conectar.

### [GPS Enforcement]

- Listener para detectar cambios en el sensor de GPS.
- Bloqueo de interfaz si `requiresLocation` está activo y el GPS se apaga.
- UI en `Collectors.tsx` para mostrar estado de GPS obligatorio.

### [Client UI Enhancements]

- Captura de fotos (Casa/Negocio).
- Captura de ubicación (Domicilio/Negocio).
- Permisos para que el cobrador actualice GPS.
- Optimización de buscador y refresco de datos.
