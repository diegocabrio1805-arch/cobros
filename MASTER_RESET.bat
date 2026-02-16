@echo off
echo ===================================================
echo   LIMPIEZA MAESTRA Y REINSTALACION
echo   (Esto tardara unos minutos, ten paciencia)
echo ===================================================
echo.
echo 1. Eliminando carpetas de sistema (node_modules)...
if exist "node_modules" rmdir /s /q "node_modules"
if exist "package-lock.json" del /f /q "package-lock.json"
echo.
echo 2. Eliminando cache de Vite...
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite"
echo.
echo 3. Reinstalando librerias (puente de conexion)...
call npm install
echo.
echo 4. Iniciando sistema en puerto 3000...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "http://localhost:3000"
cmd /c "npx vite --host --force"
pause
