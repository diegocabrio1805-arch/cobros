@echo off
echo ========================================
echo  GENERANDO APK OPTIMIZADA
echo  Para dispositivos de gama baja
echo ========================================
echo.

echo [1/4] Limpiando build anterior...
if exist dist rmdir /s /q dist
if exist android\app\build rmdir /s /q android\app\build

echo [2/4] Compilando aplicacion (modo produccion)...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Fallo la compilacion
    pause
    exit /b 1
)

echo [3/4] Sincronizando con Capacitor...
call npx cap sync android
if %errorlevel% neq 0 (
    echo ERROR: Fallo la sincronizacion
    pause
    exit /b 1
)

echo [4/4] Abriendo Android Studio...
echo.
echo INSTRUCCIONES:
echo 1. Espera a que Android Studio termine de cargar
echo 2. Ve a: Build ^> Build Bundle(s) / APK(s) ^> Build APK(s)
echo 3. Espera a que termine el build
echo 4. La APK estara en: android\app\build\outputs\apk\release\
echo.
call npx cap open android

echo.
echo ========================================
echo  PROCESO COMPLETADO
echo ========================================
pause
