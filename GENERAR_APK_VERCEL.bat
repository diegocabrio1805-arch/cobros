@echo off
chcp 65001 >nul
cls

echo =========================================================
echo   GENERANDO APK ESPEJO (VERCEL) - ANEXO COBROS
echo   URL: https://cobros-kqwbje37o-diego-villalbas-projects-829483ce.vercel.app
echo =========================================================
echo.
echo   1. Sincronizando archivos con Android...
call npx cap sync android
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error en la sincronización
    pause
    exit /b 1
)

echo.
echo   2. Abriendo Android Studio...
echo.
echo   INSTRUCCIONES:
echo   - Espera a que Gradle termine de sincronizar
echo   - Ve a: Build ^> Build Bundle(s) / APK(s) ^> Build APK(s)
echo   - El APK estará en: android\app\build\outputs\apk\release\
echo.

call npx cap open android

echo.
echo =========================================================
echo   PROCESO INICIADO
echo =========================================================
pause
