# 🔄 SINCRONIZACIÓN Y PERSISTENCIA

### 1. Limpieza de Timestamps
Para evitar que un cliente se quede con datos viejos "pegados", obliga a una resincronización total al iniciar sesión.
```typescript
localStorage.removeItem('last_sync_timestamp');
```

### 2. Sincronización Silenciosa vs Forzada
*   **Silenciosa**: Se ejecuta de fondo cada X minutos (sin molestar al usuario).
*   **Forzada**: Se dispara cuando el usuario hace una acción crítica (ej. Cobrar).

### 3. Manejo de IDs Inválidos
Filtra IDs corruptos o de prueba (`'admin-1'`, `'wzzegxk3a'`) antes de que entren a la base de datos para evitar errores de llave foránea (`FK Exception`).

### 4. Modo Offline (Capacitor)
Siempre verifica `Network.getStatus()` antes de intentar un push remoto. Si falla, guarda en una cola local (`syncQueue`).
