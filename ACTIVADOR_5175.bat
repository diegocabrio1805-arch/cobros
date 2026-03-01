@echo off
title ANEXO COBRO - Servidor Local (5175)
echo Iniciando servidor local en puerto 5175...

cd /d "C:\Users\DANIEL\Desktop\cobros"

:: Abre el navegador automáticamente tras 3 segundos
start "" cmd /c "timeout /t 3 >nul && start http://localhost:5175"

:: Inicia el servidor Vite
npm run dev

pause
