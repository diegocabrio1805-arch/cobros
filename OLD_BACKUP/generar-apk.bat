@echo off
echo ========================================================
echo   GENERADOR DE APK - ANEXO COBRO
echo ========================================================
echo.
echo   Paso 1: Construyendo la version Web optimizada...
echo           (Esto puede tardar unos segundos)
echo.

call npm run build

echo.
echo   Paso 2: Sincronizando codigo con Android...
echo.

call npx cap sync android

echo.
echo   Paso 3: Intentando abrir Android Studio...
echo.
echo   IMPORTANTE:
echo   1. Cuando se abra Android Studio, espera a que cargue (barra abajo).
echo   2. Ve al menu: 'Build' -> 'Build Bundle(s) / APK(s)' -> 'Build APK(s)'.
echo   3. Cuando termine, te dira "locate". Ahi estara tu archivo .apk listo.
echo.
echo   Si NO tienes Android Studio instalado, NO podremos generar el APK final
echo   automaticamente. Necesitas instalarlo primero.
echo.

call npx cap open android

pause
