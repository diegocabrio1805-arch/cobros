# ⚠️ ADVERTENCIA: PREVENCIÓN DE BUCLES DE REINICIO

Este documento sirve como memoria técnica para evitar que se repita el error detectado en la versión **v6.7.6**, donde una "limpieza agresiva" causó un bucle infinito de reinicios en dispositivos móviles.

## El Anti-Patrón (Lo que NO se debe hacer)
Nunca utilices `localStorage.clear()` en la fase de arranque de una aplicación híbrida (Capacitor/PWA) si tienes múltiples capas de control:
1. **Conflicto de Capas**: Si el `index.html` guarda una bandera de estado y el hook de React (`useAppInitialization`) llama a `clear()`, se borra la bandera.
2. **Ciclo Infinito**: La app se reinicia -> El `index.html` ve que falta la bandera -> Limpia y reinicia -> React vuelve a limpiar... **BUCLE**.

## La Solución Recomendada (Standard)
1. **Limpieza Quirúrgica**: En lugar de `localStorage.clear()`, elimina solo las llaves específicas que necesitan resetearse (ej. `localStorage.removeItem('prestamaster_v2')`).
2. **Gestión Unificada**: Centraliza el control de versiones en el Hook de React, no en el HTML estático.
3. **Persistencia de Banderas**: Las banderas de "App Instalada" o "Versión Actual" deben ser protegidas y nunca borradas en un proceso de actualización rutinario.

## Regla de Oro para el Futuro
> "Si llamas a `window.location.reload()`, asegúrate de que cualquier bandera de `localStorage` necesaria para el siguiente arranque haya sido guardada **ANTES** y no sea borrada por ningún script de inicialización."

---
*Este documento es autogenerado por la IA Antigravity para la protección del ciclo de vida de la aplicación.*
