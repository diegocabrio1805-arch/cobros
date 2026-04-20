@echo off
echo ========================================
echo   GENERADOR DE APK - ANEXO COBRO v5.4.3
echo ========================================
echo.

echo [1/4] Deteniendo procesos de Gradle...
taskkill /F /IM java.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/4] Limpiando cache de Gradle...
cd /d "%~dp0android"
call gradlew --stop
timeout /t 2 /nobreak >nul

echo [3/4] Generando APK Release...
call gradlew assembleRelease --no-daemon

echo.
echo ========================================
if exist "app\build\outputs\apk\release\app-release.apk" (
    echo   APK GENERADA EXITOSAMENTE
    echo   Ubicacion: android\app\build\outputs\apk\release\app-release.apk
) else (
    echo   ERROR: No se pudo generar la APK
)
echo ========================================
pause
