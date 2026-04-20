@echo off
echo --- INICIANDO REPARACION DE WINDOWS UPDATE ---
echo.
echo 1. Deteniendo servicios de actualizacion...
net stop wuauserv
net stop cryptSvc
net stop bits
net stop msiserver
echo.

echo 2. Renombrando carpetas corruptas (Solo si existen)...
if exist "C:\Windows\SoftwareDistribution" (
    ren "C:\Windows\SoftwareDistribution" "SoftwareDistribution.bak"
    if %errorlevel% neq 0 echo [AVISO] No se pudo renombrar SoftwareDistribution. Puede que ya exista .bak o falten permisos.
)
if exist "C:\Windows\System32\catroot2" (
    ren "C:\Windows\System32\catroot2" "catroot2.bak"
    if %errorlevel% neq 0 echo [AVISO] No se pudo renombrar catroot2. Puede que falten permisos.
)
echo.

echo 3. Reiniciando servicios...
net start wuauserv
net start cryptSvc
net start bits
net start msiserver
echo.

echo --- PROCESO TERMINADO ---
echo Por favor, ve a Configuración -> Actualización y Seguridad y busca actualizaciones nuevamente.
