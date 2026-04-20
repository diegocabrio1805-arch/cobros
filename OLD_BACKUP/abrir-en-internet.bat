@echo off
echo =========================================================
echo   GENERANDO ENLACE PUBLICO DIRECTO (SERVEO)
echo =========================================================
echo.
echo   IMPORTANTE:
echo   1. Mantener esta ventana ABIERTA.
echo   2. Tu enlace aparecera abajo (termina en .serveo.net)
echo.
echo   Conectando al servidor...
echo =========================================================

ssh -o StrictHostKeyChecking=no -R 80:localhost:3001 serveo.net

echo.
echo   SI SE CERRO O FALLO:
echo   Es posible que el servicio este ocupado. Intenta de nuevo.
echo.
pause
