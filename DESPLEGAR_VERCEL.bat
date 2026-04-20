@echo off
setlocal
cls
echo =========================================================
echo   DESPLEGANDO A VERCEL (Produccion) - ANEXO COBROS
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
echo   2. Subiendo a Vercel...
echo   (Se solicitara inicio de sesion si es la primera vez)
echo.
call npx vercel --prod

echo.
echo =========================================================
echo   PROCESO COMPLETADO
echo.
echo   IMPORTANTE:
echo   Recuerda configurar las Variables de Entorno en el 
echo   panel de Vercel (Settings > Environment Variables):
echo   - VITE_SUPABASE_URL
echo   - VITE_SUPABASE_ANON_KEY
echo   - VITE_SERVICE_ROLE_KEY (si aplica)
echo =========================================================
pause
