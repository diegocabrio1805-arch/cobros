@echo off
echo ========================================
echo   GENERADOR DE APK v5.4.3 - OPTIMIZADO
echo ========================================
echo.
echo IMPORTANTE: Antes de ejecutar este script:
echo 1. Cierra Android Studio completamente
echo 2. Cierra el Explorador de Archivos
echo 3. Si persisten errores, reinicia tu PC
echo.
pause

echo [1/5] Deteniendo todos los procesos Java y Gradle...
taskkill /F /IM java.exe /T 2>nul
taskkill /F /IM studio64.exe /T 2>nul
timeout /t 3 /nobreak >nul

echo [2/5] Deteniendo daemons de Gradle...
cd /d "%~dp0android"
call gradlew --stop 2>nul
timeout /t 2 /nobreak >nul

echo [3/5] Limpiando directorios bloqueados...
cd /d "%~dp0"
rmdir /s /q "node_modules\@capacitor\android\capacitor\build" 2>nul
rmdir /s /q "android\app\build\intermediates" 2>nul
rmdir /s /q "android\build" 2>nul
timeout /t 2 /nobreak >nul

echo [4/5] Sincronizando con Capacitor...
call npx cap sync android
if errorlevel 1 (
    echo ERROR: Fallo la sincronizacion de Capacitor
    pause
    exit /b 1
)

echo [5/5] Generando APK Release (esto puede tomar 2-3 minutos)...
cd android
call gradlew :app:assembleRelease --no-daemon

echo.
echo ========================================
if exist "app\build\outputs\apk\release\app-release.apk" (
    echo   ✓ APK GENERADA EXITOSAMENTE
    echo.
    echo   Version: 5.4.3 ^(543^)
    echo   Ubicacion: android\app\build\outputs\apk\release\app-release.apk
    echo.
    echo   Mejoras incluidas:
    echo   - Sincronizacion bidireccional de eliminaciones
    echo   - Bluetooth optimizado con reintentos progresivos
    echo   - Sync-lock durante impresion
    echo   - Intervalo de sync optimizado a 30s
) else (
    echo   ✗ ERROR: No se pudo generar la APK
    echo.
    echo   Solucion alternativa:
    echo   1. Reinicia tu computadora
    echo   2. Abre Android Studio
    echo   3. File -^> Invalidate Caches -^> Restart
    echo   4. Build -^> Generate Signed Bundle / APK
)
echo ========================================
pause
