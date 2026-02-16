@echo off
echo ===================================================
echo   REPARACION EXPRESS V6.1.45
echo ===================================================
echo.
echo 1. Cerrando procesos de node...
taskkill /f /im node.exe >nul 2>&1
echo.
echo 2. Limpiando cache...
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite"
del /f /s /q node_modules\.vite\deps\_metadata.json >nul 2>&1
echo.
echo 3. Iniciando Servidor...
echo POR FAVOR ESPERA...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "http://localhost:3000"
cmd /c "npm install --force && npx vite --host"
pause
