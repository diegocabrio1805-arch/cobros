@echo off
echo ===================================================
echo   SUPER REPARACION DE CHROME
echo ===================================================
echo.
echo 1. Cerrando procesos colgados de Chrome...
taskkill /F /IM chrome.exe /T >nul 2>&1

echo 2. Limpiando archivos temporales basicos...
timeout /t 2 >nul

echo 3. Iniciando Chrome en modo RECUPERACION (Forzando posicion)...
start chrome --disable-extensions --window-position=0,0 --window-size=1200,800 --no-first-run "http://localhost:3001"

echo.
echo 4. Si sigue sin verse, probaremos DESACTIVANDO aceleracion de hardware...
echo (Presione una tecla para intentar modo sin GPU si el anterior fallo, o cierre esta ventana si ya abrio)
pause >nul
start chrome --disable-extensions --disable-gpu --window-position=0,0 --window-size=1200,800 "http://localhost:3001"

echo.
echo LISTO. 
echo Si aun no abre, puede que deba reiniciar su PC o reinstalar Chrome.
echo.
pause
