@echo off
setlocal enabledelayedexpansion

echo ==============================================
echo       PREPARADOR DE RESPALDO - COBROS
echo ==============================================
echo.
echo Este script creara una carpeta llamada "RESPALDO_COBROS" 
echo con solo los archivos necesarios (sin basura pesada).
echo.

set "DEST=..\RESPALDO_COBROS"

if exist "%DEST%" (
    echo Limpiando respaldo anterior...
    rd /s /q "%DEST%"
)

mkdir "%DEST%"

echo Copiando archivos del proyecto...
xcopy /s /e /y /exclude:exclude_list.txt . "%DEST%"

echo.
echo ==============================================
echo   ¡LISTO! La carpeta "RESPALDO_COBROS" ha sido creada 
echo   en tu Escritorio (fuera de la carpeta actual).
echo.
echo   PASO SIGUIENTE: 
echo   Sube esa carpeta "RESPALDO_COBROS" a tu Google Drive.
echo ==============================================
pause
