@echo off
setlocal
cls
echo =========================================================
echo   DESPLEGANDO A NETLIFY (Starter) - ANEXO COBROS
echo =========================================================
echo.
echo   1. Generando build de produccion...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo   [ERROR] El build ha fallado. Revisa los errores arriba.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo   2. Subiendo a Netlify...
echo   (IMPORTANTE: Si no has iniciado sesion, se abrira el navegador)
echo.
call npx netlify deploy --dir=dist --prod --message "Manual Deploy via BAT"

echo.
echo =========================================================
echo   PROCESO COMPLETADO
echo.
echo   Nota: No olvides configurar las variables de entorno 
echo   (SUPABASE_URL, etc) en el panel de Netlify.
echo =========================================================
pause
