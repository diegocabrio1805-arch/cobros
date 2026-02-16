@echo off
echo ===================================================
echo   ARRANQUE LIMPIO - PUERTO 3333
echo ===================================================
echo.
echo 1. Cerrando procesos viejos...
taskkill /f /im node.exe >nul 2>&1
echo.
echo 2. Iniciando en PUERTO SEGURO 3333...
echo.
echo NO USES EL PUERTO 3000.
echo.
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "http://localhost:3333"
cmd /c "npx vite --host --port 3333 --force"
pause
