@echo off
cd ..
echo [SISTEMA] Iniciando Build v6.1.24...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build fallido. Deteniendo.
    exit /b %ERRORLEVEL%
)
echo [SISTEMA] Desplegando a Netlify...
call npx netlify deploy --dir=dist --prod --message "Force Deploy v6.1.24 ARMAGEDON"
echo [SISTEMA] Proceso completado.
