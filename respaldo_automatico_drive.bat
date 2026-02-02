@echo off
setlocal enabledelayedexpansion

:: Carpeta de destino en Google Drive
set "DRIVE_DEST=G:\Mi unidad\RESPALDO_COBROS_AUTO"

echo ==============================================
echo    RESPALDO AUTOMATICO A GOOGLE DRIVE
echo ==============================================
echo Destino: %DRIVE_DEST%

:: Crear carpeta si no existe
if not exist "%DRIVE_DEST%" mkdir "%DRIVE_DEST%"

:: Copiar archivos usando la lista de exclusion anterior
xcopy /s /e /y /exclude:exclude_list.txt . "%DRIVE_DEST%"

echo.
echo ==============================================
echo    RESPALDO COMPLETADO EN GOOGLE DRIVE
echo ==============================================
exit
