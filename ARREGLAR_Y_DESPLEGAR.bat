@echo off
setlocal
cls
echo =========================================================
echo   REPARACION Y DESPLIEGUE DE EMERGENCIA - ANEXO COBROS
echo =========================================================
echo.
echo   1. Limpiando cache de dependencias corruptas...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json
echo.
echo   2. Reinstalando sistema (esto tardara unos minutos)...
call npm install
echo.
echo   3. Generando version v6.1.3...
call npm run build
echo.
echo   4. Conectando con Netlify (si pide login, autoriza)...
call npx netlify deploy --dir=dist --prod --message "Emergency Fix v6.1.3"
echo.
echo =========================================================
echo   LISTO! SI SALE 'Website Draft URL', YA FUNCIONA.
echo =========================================================
pause
