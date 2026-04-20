@echo off
REM ============================================
REM APK Build Script v5.4.4 - Optimized
REM ============================================
echo.
echo ========================================
echo   GENERADOR DE APK v5.4.4
echo   Mejoras: Map Fix + AI Audit Enhanced
echo ========================================
echo.

cd /d "%~dp0"

REM Limpiar procesos Java previos
echo [1/6] Limpiando procesos Java...
taskkill /F /IM java.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul

REM Limpiar cache de Gradle
echo [2/6] Limpiando cache de Gradle...
cd android
call gradlew clean --no-daemon >nul 2>&1
cd ..

REM Sincronizar Capacitor
echo [3/6] Sincronizando Capacitor...
call npx cap sync android

REM Copiar assets
echo [4/6] Copiando assets...
xcopy /E /I /Y public android\app\src\main\assets\public >nul 2>&1

REM Generar APK Release
echo [5/6] Generando APK Release (esto puede tardar 2-3 min)...
cd android
call gradlew assembleRelease --no-daemon --warning-mode all

REM Verificar resultado
echo [6/6] Verificando APK generada...
if exist "app\build\outputs\apk\release\app-release.apk" (
    echo.
    echo ========================================
    echo   APK GENERADA EXITOSAMENTE!
    echo ========================================
    echo.
    echo Ubicacion: android\app\build\outputs\apk\release\app-release.apk
    echo Version: 5.4.4 (544)
    echo.
    echo Mejoras incluidas:
    echo  - Arreglo de parpadeo en mapa
    echo  - Deteccion de paradas optimizada (20 min)
    echo  - Auditoria IA mejorada con alertas criticas
    echo.
    start "" "%CD%\app\build\outputs\apk\release"
) else (
    echo.
    echo ========================================
    echo   ERROR: No se pudo generar la APK
    echo ========================================
    echo.
    echo Revisa los errores arriba o ejecuta manualmente:
    echo   cd android
    echo   gradlew assembleRelease
    echo.
)

cd ..
pause
