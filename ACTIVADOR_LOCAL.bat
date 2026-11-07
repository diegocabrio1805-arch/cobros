@echo off
title ANEXO COBRO - Servidor Local (5173)
color 0A

echo.
echo  ========================================================
echo             SISTEMA ANEXO COBRO - LOCAL
echo  ========================================================
echo.

cd /d "%~dp0"

echo  [1/3] Verificando y liberando puerto 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r /c:":5173 "') do (
    echo   - Cerrando proceso residual (PID %%a)...
    taskkill /f /pid %%a >nul 2>&1
)

echo.
echo  [2/3] Abriendo navegador en http://localhost:5173/cobros/ ...
start "" cmd /c "timeout /t 3 >nul && start http://localhost:5173/cobros/"

echo.
echo  [3/3] Iniciando servidor Vite en puerto 5173...
echo.
echo  --------------------------------------------------------
echo   Acceso Local:    http://localhost:5173/cobros/
echo   Para detener:    Cierra esta ventana o presiona Ctrl + C
echo  --------------------------------------------------------
echo.

npx vite --port 5173 --strictPort --host 0.0.0.0

pause

