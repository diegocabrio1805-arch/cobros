@echo off
setlocal
title ACTIVADOR INTEGRAL - ANEXO COBRO

:inicio
cls
echo ===================================================
echo   ACTIVADOR PERSISTENTE Y PREVENTIVO DE ERRORES
echo ===================================================
echo.
echo   Este script asegura que la Web este SIEMPRE activa.
echo   Previene errores de sincronizacion limpiando cache.
echo.
echo ---------------------------------------------------
echo [1/3] Limpiando cache y residuos...
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite"
del /f /s /q node_modules\.vite\deps\_metadata.json >nul 2>&1

echo [2/3] Verificando dependencias...
call npm install --force --quiet

echo [3/3] Iniciando Servidor Web...
echo.
echo   SI CIERRAS EL NAVEGADOR, EL SERVIDOR SE MANTENDRA.
echo   SI EL SERVIDOR FALLA, SE REINICIARA SOLO.
echo.
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "http://localhost:3000"

:: Ejecuta Vite y si falla o se cierra, el script continua
call npx vite --port 3000 --host

echo.
echo ===================================================
echo   ALERTA: EL SERVIDOR SE DETUVO O DETECTO ERROR
echo   Reiniciando en 5 segundos para prevenir fallos...
echo ===================================================
timeout /t 5
goto inicio
