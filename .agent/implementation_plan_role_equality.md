# Plan de Implementación - Igualdad Local (Gerente Superpoderes)

Otorga a los **Gerentes** las capacidades de un **Administrador** pero limitadas estrictamente a su propia sucursal/equipo.

## Cambios Propuestos

### 1. Componente de Cobradores (`Collectors.tsx`)

- **Configuración de Recibo**: Cambiar el check de `isAdmin` a `isAdminOrManager` para que los Gerentes puedan personalizar el nombre de empresa y contacto de su sucursal.
- **Edición de Fecha**: Validar que el campo `expiryDate` sea editable por Gerentes.
- **Borrado**: Confirmar que el botón de borrado no tenga disparadores de `isAdmin` ocultos.

### 2. Lógica de Aplicación (`App.tsx`)

- **Unificación de Permisos**: Revisar si hay algún `isAdmin` en las funciones `updateUser` o `deleteUser` que deba ser `isAdminOrManager`.
- **Sincronización Auth**: Mantener el uso de la Edge Function `update-auth-user`, que ya permite a Gerentes cambiar contraseñas de subordinados.

### 3. Base de Datos (Supabase RLS)

- **Política de Perfiles**: Reforzar la política de RLS para permitir explícitamente que los Gerentes hagan `UPDATE` y `DELETE` (soft-delete) en perfiles donde ellos sean el `managed_by`.
