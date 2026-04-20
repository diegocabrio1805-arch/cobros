@echo off
echo =======================================================
echo   HABILITANDO ACCESO DESDE CELULAR (PUERTO 3001)
echo =======================================================
echo.
echo Intentando abrir puerto en Firewall de Windows...
echo (Si pide permisos de Administrador, acepte por favor)
echo.

powershell -Command "New-NetFirewallRule -DisplayName 'Anexo Cobro Web' -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow"

echo.
echo =======================================================
echo   LISTO!
echo   Para ver en tu celular, conecta el movil al WIFI
echo   y entra a esta direccion en Chrome/Safari:
echo.
echo   http://192.168.100.150:3001
echo =======================================================
echo.
pause
