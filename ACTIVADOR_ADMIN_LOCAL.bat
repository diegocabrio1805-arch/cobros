@echo off
title COBROS - Servidor Local Admin (5173)
color 0B
echo.
echo  ============================================
echo   ANEXO COBROS - Administracion Local
echo  ============================================
echo.

:: Liberar puerto 5173 si está en uso
echo  Liberando puerto 5173 si esta ocupado...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r /c:":5173 "') do (
    echo Matando proceso con PID %%a en puerto 5173...
    taskkill /f /pid %%a 2>nul
)

echo.
echo  Servidor local: http://localhost:5173
echo  Admin Panel:    http://localhost:5173/admin
echo.
echo  Iniciando servidor de desarrollo...
echo.

cd /d "c:\Users\Usuario\.antigravity\cobros"

:: Abrir el panel de administrador en el navegador automáticamente después de 3 segundos
start "" cmd /c "timeout /t 3 >nul && start http://localhost:5173/admin"

:: Iniciar servidor Vite en puerto 5173 estrictamente
npx vite --port 5173 --strictPort

pause
