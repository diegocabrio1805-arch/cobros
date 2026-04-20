@echo off
title SERVIDOR ANEXO COBRO - SIEMPRE ACTIVO
echo Iniciando servidor en segundo plano...
set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

:restart
echo [%date% %time%] Servidor Iniciado.
node .\node_modules\vite\bin\vite.js --port 5173 --host
if %errorlevel% neq 0 (
    echo [%date% %time%] El servidor se detuvo inesperadamente. Reiniciando en 5 segundos...
    timeout /t 5
    goto restart
)
pause
