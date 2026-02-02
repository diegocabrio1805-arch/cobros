@echo off
echo Iniciando servidor de desarrollo...
cd /d "%~dp0"
start "Anexo Cobro - Servidor" cmd /c "npm run dev"
timeout /t 3 /nobreak >nul
echo Abriendo Chrome...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "http://localhost:3000"
echo.
echo ========================================
echo   App iniciada correctamente
echo   Servidor: http://localhost:3000
echo ========================================
echo.
echo Presiona cualquier tecla para salir...
pause >nul
