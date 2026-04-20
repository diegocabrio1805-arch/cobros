@echo off
setlocal
echo ========================================
echo   SUPER LIMPIEZA Y GENERADOR APK v5.4.5
echo ========================================

echo [1/5] Matando procesos Java y Gradle...
taskkill /F /IM java.exe /T >nul 2>&1
taskkill /F /IM studio64.exe /T >nul 2>&1
taskkill /F /IM node.exe /T >nul 2>&1
echo.

echo [2/5] Intentando renombrar directorios bloqueados (bypass)...
set DATESTR=%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%
set DATESTR=%DATESTR: =0%

if exist "android\build" move "android\build" "android\build_OLD_%DATESTR%" >nul 2>&1
if exist "android\app\build" move "android\app\build" "android\app\build_OLD_%DATESTR%" >nul 2>&1

echo [3/5] Sincronizando Capacitor...
call npx cap sync android

echo [4/5] Generando APK Release...
cd android
call gradlew assembleRelease --no-daemon --no-watch-fs

echo [5/5] Verificando resultado...
if exist "app\build\outputs\apk\release\app-release.apk" (
    echo.
    echo ✅ EXITO: APK v5.4.5 generada satisfactoriamente.
    echo Ubicacion: android\app\build\outputs\apk\release\app-release.apk
) else (
    echo.
    echo ❌ ERROR: No se pudo generar la APK.
)

pause
