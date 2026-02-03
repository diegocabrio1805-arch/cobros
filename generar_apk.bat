@echo off
echo ==========================================
echo GENERADOR AUTOMATICO DE APK - COBROS IOTA
echo ==========================================
echo.
echo 1. Compilando version Web (esto puede tardar)...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Fallo al compilar la web.
    pause
    exit /b %errorlevel%
)

echo.
echo 2. Sincronizando con Android...
call npx cap sync android
if %errorlevel% neq 0 (
    echo [ERROR] Fallo al sincronizar capacitor.
    pause
    exit /b %errorlevel%
)

echo.
echo 3. Generando APK Final (Gradle)...
cd android
call gradlew assembleRelease
if %errorlevel% neq 0 (
    echo [ERROR] Fallo al generar el APK.
    pause
    exit /b %errorlevel%
)

echo.
echo ==========================================
echo [EXITO] APK GENERADA CORRECTAMENTE
echo Ubicacion: android\app\build\outputs\apk\release\app-release.apk
echo ==========================================
pause
