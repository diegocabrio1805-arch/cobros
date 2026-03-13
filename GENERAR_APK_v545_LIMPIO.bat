@echo off
echo =========================================
echo   LIMPIEZA AGRESIVA Y GENERACION APK
echo =========================================
echo.

REM Matar todos los procesos Java
echo [1/5] Matando procesos Java...
taskkill /F /IM java.exe /T >nul 2>&1
timeout /t 3 /nobreak >nul

REM Eliminar directorios de build de forma agresiva
echo [2/5] Eliminando directorios de build...
powershell -Command "Get-ChildItem -Path 'android\app\build' -Recurse -Force -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue"
powershell -Command "Get-ChildItem -Path 'android\build' -Recurse -Force -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue"
powershell -Command "Get-ChildItem -Path 'node_modules\@capacitor\android\capacitor\build' -Recurse -Force -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue"
powershell -Command "Get-ChildItem -Path 'node_modules\@capacitor-community\contacts\android\build' -Recurse -Force -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue"

echo [3/5] Esperando liberacion de archivos...
timeout /t 5 /nobreak >nul

REM Sincronizar Capacitor
echo [4/5] Sincronizando Capacitor...
call npx cap sync android

REM Generar APK
echo [5/5] Generando APK v5.4.5...
cd android
call gradlew assembleRelease

REM Verificar resultado
if exist "app\build\outputs\apk\release\app-release.apk" (
    echo.
    echo =========================================
    echo   APK GENERADA EXITOSAMENTE!
    echo =========================================
    echo.
    echo Ubicacion: android\app\build\outputs\apk\release\app-release.apk
    echo Version: 5.4.5
    echo.
    echo Mejoras incluidas:
    echo  - Sesion NO se cierra con senal baja/nula
    echo  - Impresora se guarda por usuario
    echo  - Logout manual funciona correctamente
    echo  - Refresh automatico de token al recuperar conexion
    echo.
    start "" "%CD%\app\build\outputs\apk\release"
) else (
    echo.
    echo =========================================
    echo   ERROR: No se pudo generar la APK
    echo =========================================
    echo.
)

cd ..
pause
