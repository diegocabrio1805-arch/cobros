@echo off
setlocal enabledelayedexpansion

:: ==============================================
:: CONFIGURACIÓN GENERAL
:: ==============================================
set "DRIVE_DEST=G:\Mi unidad\RESPALDO_COBROS_AUTO"
set "BRAIN_SRC=C:\Users\HP\.gemini\antigravity\brain"
set "TIMESTAMP=%date:~6,4%-%date:~3,2%-%date:~0,2%_%time:~0,2%-%time:~3,2%"
set "TIMESTAMP=%TIMESTAMP: =0%"

echo ===================================================
echo   SISTEMA DE RESPALDO MAESTRO (COBROS + CEREBRO)
echo ===================================================
echo Fecha y Hora: %TIMESTAMP%
echo.

:: ==============================================
:: 1. RESPALDO A GITHUB
:: ==============================================
echo [1/3] SUBIENDO CAMBIOS A LA NUBE (GITHUB)...
cd /d "c:\Users\HP\Desktop\cobros"
git add .
git commit -m "Respaldo Maestro Automático: %TIMESTAMP%"
git push origin main
if %ERRORLEVEL% EQU 0 (
    echo [OK] GitHub actualizado.
) else (
    echo [ADVERTENCIA] Error al subir a GitHub.
)
echo.

:: ==============================================
:: 2. RESPALDO A GOOGLE DRIVE (CÓDIGO)
:: ==============================================
echo [2/3] RESPALDANDO CÓDIGO A GOOGLE DRIVE...
if not exist "%DRIVE_DEST%" mkdir "%DRIVE_DEST%"
xcopy /s /e /y /exclude:exclude_list.txt "c:\Users\HP\Desktop\cobros" "%DRIVE_DEST%"
if %ERRORLEVEL% EQU 0 (
    echo [OK] Google Drive (Código) actualizado.
) else (
    echo [ADVERTENCIA] Error al copiar a Drive.
)
echo.

:: ==============================================
:: 3. RESPALDO DE CEREBRO (IA)
:: ==============================================
echo [3/3] RESPALDANDO MEMORIA DE ASISTENTE (CEREBRO)...
if not exist "%DRIVE_DEST%\CEREBRO_IA" mkdir "%DRIVE_DEST%\CEREBRO_IA"
xcopy /s /e /y "%BRAIN_SRC%" "%DRIVE_DEST%\CEREBRO_IA"
if %ERRORLEVEL% EQU 0 (
    echo [OK] Memoria IA respaldada correctamente.
) else (
    echo [ADVERTENCIA] Error al respaldar el cerebro.
)

echo.
echo ===================================================
echo   RESPALDO COMPLETADO EXITOSAMENTE!
echo ===================================================
echo Los cambios de codigo estaran en GitHub y Drive.
echo Tu "cerebro" IA tiene copia extra en Drive.
echo.
pause
