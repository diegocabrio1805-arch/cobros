@echo off
echo ===================================================
echo   DIAGNOSTICO FINAL Y ARRANQUE FORZADO
echo ===================================================
echo.
echo 1. Cerrando cualquier cosa previa...
taskkill /f /im node.exe >nul 2>&1
echo 2. Limpiando nucleo de cache...
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite"
del /f /s /q node_modules\.vite\deps\_metadata.json >nul 2>&1
echo.
echo 3. Iniciando servidor en PUERTO 3333...
echo POR FAVOR ESPERA 5 SEGUNDOS...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "http://localhost:3333"
cmd /c "npx vite --host --port 3333"
pause
