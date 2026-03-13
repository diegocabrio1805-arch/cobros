# 🛡 BLINDAJE DE DATOS Y ARREGLOS

### 1. La Regla de Oro: `Array.isArray()`
Nunca asumas que un objeto que viene de una base de datos o de `localStorage` es un arreglo, incluso si el tipo de TypeScript lo dice.
*   **Error fatal**: `lista.map(...)` -> `lista is undefined`.
*   **Modo Seguro**:
```typescript
const itemsValidos = Array.isArray(items) ? items : [];
itemsValidos.map(item => ...);
```

### 2. Encadenamiento Opcional (`?.`)
Úsalo en todo lo que no sea una constante interna.
*   **Mal**: `client.name.toLowerCase()`
*   **Bien**: `client?.name?.toLowerCase() || 'Sin Nombre'`

### 3. Valores por Defecto en Destructuración
```typescript
const { clients = [], loans = [] } = state;
```
Esto asegura que, si el estado está vacío, los sub-componentes no crasheen al intentar iterar.
