# 🛠 ESTRATEGIAS DE RECUPERACIÓN (ANTI-CRASH)

### 1. El "Filtro de Pánico" (index.html)
Coloca un script al inicio de tu `index.html` que monitoree errores globales.
*   **Para qué sirve**: Si la app muere antes de cargar React, este script muestra un botón de "Reparar".
*   **Código clave**:
```javascript
window.addEventListener('error', (e) => {
  // Si bootFinished es falso despues de X segundos, mostrar UI de error
  document.getElementById('error-trap').style.display = 'block';
});
```

### 2. Error Boundary (React)
Nunca dejes la app sin un `ErrorBoundary` global y uno por módulo crítico.
*   **Tip**: Agrega un botón de `localStorage.clear()` dentro del ErrorBoundary. Muchos errores se deben a datos locales corruptos del usuario.

### 3. Auto-Repair y Anti-Bucle (Caché)
Para evitar bucles de refresco infinitos al actualizar versiones:

*   **Problema**: Conflictos entre el Service Worker y el registro manual causan recargas sin fin.
*   **Solución**: Delegar todo al plugin de PWA (`vite-plugin-pwa`) y limpiar caché solo por versión.
*   **Código clave (App.tsx)**:
```typescript
const CURRENT_VERSION_ID = 'v6.1.42-STABLE';
if (localStorage.getItem('LAST_APP_ID') !== CURRENT_VERSION_ID) {
  localStorage.removeItem('last_sync_timestamp'); // Forzar relanzamiento de sync
  localStorage.setItem('LAST_APP_ID', CURRENT_VERSION_ID);
}
```
*   **Vite Config**: Cambiar `registerType` a `'prompt'` en lugar de `'autoUpdate'` para mayor estabilidad en Web View.
