@echo off
setlocal
title ACTIVADOR GENERADOR - PAGARÉS Y RECIBOS
cls
echo ===================================================
echo   ACTIVADOR GENERADOR INDEPENDIENTE (PUERTO 3334)
echo ===================================================
echo.
echo   [1/3] Iniciando aplicacion...
echo.

:: Abrir Chrome en el puerto 3334
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "http://localhost:3334"

:: Entrar en la carpeta y arrancar
cd "android\pagares-app"
call npm.cmd run dev -- --port 3334 --host

echo.
echo ===================================================
echo   EL SERVIDOR SE HA DETENIDO.
echo ===================================================
pause
