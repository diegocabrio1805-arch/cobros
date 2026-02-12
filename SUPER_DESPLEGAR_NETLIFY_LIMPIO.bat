@echo off
echo =========================================
echo   DESPLIEGUE LIMPIO A NETLIFY (DESDE CERO)
echo =========================================
echo.

REM 1. Limpieza de directorios
echo [1/5] Eliminando carpeta dist y node_modules...
if exist "dist" rd /s /q "dist"
if exist "node_modules" rd /s /q "node_modules"
if exist "package-lock.json" del /q "package-lock.json"

REM 2. Reinstalacion limpia
echo [2/5] Reinstalando dependencias (esto puede tardar)...
call npm install

REM 3. Build de produccion
echo [3/5] Generando build de produccion...
call npm run build

REM 4. Despliegue a Netlify
echo [4/5] Desplegando a Netlify (PROD)...
call npx netlify deploy --dir=dist --prod --message "Auto Deploy Clean v6.1.36"

REM 5. Verificacion
echo.
echo =========================================
echo   PROCESO FINALIZADO
echo =========================================
echo Revisa: https://cobros-anexo-2026.netlify.app/
echo.
pause
