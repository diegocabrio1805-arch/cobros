# ⚛️ MEJORES PRÁCTICAS DE REACT

### 1. Reglas de Hooks (Crucial)
**NUNCA** llames un hook (`useMemo`, `useState`, `useEffect`) dentro de una condición, un bucle o dentro de otro hook.
*   **Error común**: Crear un `useMemo` dentro de un `.map()`.
*   **Solución**: Calcula los datos arriba y luego pásalos.

### 2. Normalización de Roles
Normaliza los roles apenas lleguen del servidor.
*   Ejm: Si viene "admin" o "ADMIN", conviértelo a una constante única `Role.ADMIN` para que tus filtros no fallen por una letra mayúscula.

### 3. Redirección Inteligente
No todos los usuarios deben ver la misma pantalla al inicio.
*   **Admin**: Dashboard / Resumen.
*   **Operativo/Cobrador**: Su tarea principal (ej. La Ruta).
Redirigir al inicio ahorra clics y previene errores de carga de datos no autorizados.
