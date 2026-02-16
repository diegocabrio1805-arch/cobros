@echo off
setlocal
title ACTIVADOR 3333 - SISTEMA COBROS

:inicio
cls
echo ===================================================
echo   ACTIVADOR SISTEMA V6 - PUERTO 3333
echo ===================================================
echo.
echo   [1/4] Cerrando procesos antiguos...
taskkill /f /im node.exe >nul 2>&1

echo   [2/4] Limpiando cache temporal...
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite" >nul 2>&1

echo   [3/4] Verificando entorno...
echo.
echo   [4/4] INICIANDO EN PUERTO 3333...
echo.
echo   SI CIERRAS EL NAVEGADOR, EL SERVIDOR SE MANTENDRA.
echo   SI EL SERVIDOR FALLA, SE REINICIARA SOLO.
echo.
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "http://localhost:3333"

:: Ejecuta Vite en puerto 3333
call npx vite --port 3333 --host --force

echo.
echo ===================================================
echo   ALERTA: EL SERVIDOR SE DETUVO O DETECTO ERROR
echo   Reiniciando en 5 segundos...
echo ===================================================
timeout /t 5
goto inicio
