@echo off
echo =========================================================
echo   MODO "TODO EN UNO" PARA CELULAR
echo =========================================================
echo.
echo   Paso 1: Iniciando tu aplicacion web...
echo   (Se abrira una ventana aparte, NO LA CIERRES)
echo.

start "SERVIDOR WEB - NO CERRAR" c:\Users\DANIEL\Desktop\cobros\ejecutar-web.bat

echo   Esperando 10 segundos a que el servidor arranque...
timeout /t 10 /nobreak >nul

echo.
echo   Paso 2: Generando Codigo QR para tu celular...
echo.
echo   INSTRUCCIONES:
echo   1. Se mostrara un enlace y un CODIGO QR abajo.
echo   2. Abre la camara de tu celular y escanea el QR.
echo      (O copia el enlace https://...pinggy.link)
echo.
echo   NOTA: Si te pide aceptar fingerprint, escribe: yes
echo.
echo =========================================================

ssh -o StrictHostKeyChecking=no -p 443 -R0:localhost:3001 a.pinggy.io

echo.
echo   Si se cerro, intenta abrir este archivo de nuevo.
pause
