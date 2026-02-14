# 📕 GUÍA DE REFERENCIA TÉCNICA: ESTABILIDAD Y ROBUSTECIMIENTO
Esta carpeta contiene los patrones de diseño y técnicas de "blindaje" implementados para asegurar que la aplicación sea resiliente en entornos Web, Local y APK (Android).

## 📂 Contenido de la Guía
1. **[Estrategias de Recuperación (Anti-Crash)](./01_Recuperacion.md)**
2. **[Blindaje de Datos y Arreglos](./02_Blindaje_Datos.md)**
3. **[Sincronización y Persistencia](./03_Sincronizacion.md)**
4. **[Mejores Prácticas de React](./04_React_Best_Practices.md)**
5. **[Optimización de UI y Rendimiento](./05_Optimizacion_UI.md)**

---

## 🚀 Resumen Rápido (Cheat Sheet)

### 💎 El "Escudo de Hierro" (App Start)
Nunca confíes en que el `localStorage` esté sano. Siempre envuelve la carga inicial en un `try-catch` y ten un estado por defecto listo.
```typescript
const [state, setState] = useState(() => {
  try {
    const saved = localStorage.getItem('mi_app_v1');
    return saved ? JSON.parse(saved) : defaultState;
  } catch (e) {
    return defaultState; // Fallback seguro
  }
});
```

### 💎 Prevención de la "Pantalla Blanca" (WSOD)
Usa el patrón de **Panic Reload** en el `index.html`. Si la app no termina de cargar en 5 segundos, recarga automáticamente o muestra un botón de reparación.

### 💎 Diagnóstico en Producción
No escondas los errores totalmente. Si algo falla, muestra el **Detalle Técnico** (`error.stack`) oculto en un `<details>`, esto ahorra horas de soporte técnico con el usuario final.
