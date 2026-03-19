@echo off
echo ===================================================
echo   ENVIANDO CORRECCION DE FILTROS AL SERVIDOR...
echo ===================================================

cd c:\Users\HP\.gemini\antigravity\scratch\cobros

echo Agregando archivos modificados...
git add components/Clients.tsx components/CollectionMap.tsx components/CollectorPerformance.tsx components/Reports.tsx

echo Creando punto de guardado (commit)...
git commit -m "fix(UI): enforce user data isolation across all collector dropdowns"

echo Subiendo al servidor en la nube de Anexo (GitHub)...
git push origin main

echo ===================================================
echo   ESTADO: ACTUALIZACION ENVIADA CON EXITO.
echo ===================================================
echo POR FAVOR, CIERRA ESTA VENTANA Y ABRE TU ACTIVADOR NUEVAMENTE.
pause
