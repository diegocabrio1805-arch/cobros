@echo off
:loop
cls
echo =========================================================
echo   GENERANDO ENLACE PUBLICO DIRECTO (SERVEO) - MODO PERSISTENTE
echo =========================================================
echo.
echo   IMPORTANTE:
echo   1. Mantener esta ventana ABIERTA.
echo   2. Tu enlace aparecera abajo (termina en .serveo.net)
echo   3. Si se cae, se reconectara automaticamente en 5 segundos.
echo.
echo   Conectando al servidor...
echo =========================================================

:: Added -o ServerAliveInterval=60 to keep connection alive
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -R 80:localhost:3001 serveo.net

echo.
echo   !!! CONEXION PERDIDA !!!
echo   Reconectando en 5 segundos...
timeout /t 5
goto loop
