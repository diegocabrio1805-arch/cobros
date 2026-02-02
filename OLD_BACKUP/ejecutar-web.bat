@echo off
echo ===================================================
echo   RESTAURANDO SITIO WEB (BYPASS POWERSHELL)
echo ===================================================
echo.
echo Limpiando cache de Vite...
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite"
del /f /s /q node_modules\.vite\deps\_metadata.json >nul 2>&1

echo.
echo Iniciando servidor en modo CMD...
echo Por favor espera a que se abra Google Chrome...
echo.

start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "http://localhost:3001"

cmd /c "npm install --force && npx vite --host"

pause
