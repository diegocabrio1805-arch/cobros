@echo off
chcp 65001 >nul
cls

echo =========================================================
echo   GENERANDO APK v5.4.5 - ANEXO COBROS
echo   FIX: Persistencia de Sesión + Impresora por Usuario
echo =========================================================
echo.
echo   CAMBIOS EN ESTA VERSIÓN:
echo   - ✅ Sesión NO se cierra con señal baja/nula
echo   - ✅ Impresora se guarda por usuario
echo   - ✅ Logout manual funciona correctamente
echo   - ✅ Refresh automático de token al recuperar conexión
echo.
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
echo   2. Abriendo Android Studio para generar APK...
echo.
echo   INSTRUCCIONES:
echo   - Espera a que Gradle termine de sincronizar
echo   - Ve a: Build ^> Build Bundle(s) / APK(s) ^> Build APK(s)
echo   - Espera a que termine la compilación
echo   - El APK estará en: android\app\build\outputs\apk\release\
echo.

call npx cap open android

echo.
echo =========================================================
echo   PROCESO INICIADO
echo   
echo   Versión: 5.4.5
echo   Fecha: %date% %time%
echo   
echo   NOTA: Después de generar el APK en Android Studio,
echo   cópialo desde android\app\build\outputs\apk\release\
echo =========================================================
pause
