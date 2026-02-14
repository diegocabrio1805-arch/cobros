# ⚡ OPTIMIZACIÓN DE UI Y RENDIMIENTO (THROTTLING)

### 1. Throttling de Mapas (Evitar Parpadeos)
Cuando tienes una app con sincronización en tiempo real (Supabase/Firebase), el mapa puede intentar redibujarse cada vez que entra un dato nuevo, causando un "parpadeo" molesto.

*   **Solución**: Separar los datos de la tabla (tiempo real) de los datos del mapa (con retraso).
*   **Patrón de Implementación**:
```typescript
const [mapData, setMapData] = useState([]);
const lastUpdate = useRef(0);
const lastManual = useRef(0);

// 1. Instantáneo ante filtros manuales
useEffect(() => {
  setMapData(routeData);
  const now = Date.now();
  lastUpdate.current = now;
  lastManual.current = now;
}, [selectedDate, selectedCollector]);

// 2. Retardado (45s) ante sincronización de fondo
useEffect(() => {
  const now = Date.now();
  // Evitar saltos si el usuario está interactuando
  if (now - lastManual.current < 5000) return;

  if (now - lastUpdate.current >= 45000) {
    setMapData(routeData);
    lastUpdate.current = now;
  }
}, [routeData]);

// TIP CRÍTICO: Elimina dependencias volátiles (como listas globales de clientes) 
// del efecto de dibujo del mapa para evitar parpadeos innecesarios.
```

### 2. Uso de `useMemo` para Cálculos Pesados
Nunca filtres arreglos grandes directamente en el `return` del componente. Hazlo siempre dentro de un `useMemo` para evitar que la app se ponga lenta al escribir en inputs o mover el mapa.

### 3. InvalidateSize (Leaflet/Mapas)
Si el mapa aparece gris o incompleto al cargar, usa siempre un pequeño `setTimeout` para forzar el recalculo del tamaño:
```javascript
setTimeout(() => {
  map.invalidateSize();
}, 300);
```
