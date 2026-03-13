@echo off
setlocal enabledelayedexpansion

echo ============================================================
echo           RESTAURADOR MAESTRO - ANEXO COBRO
echo ============================================================
echo.
echo Este script restaurara la version funcional guardada en 
echo 'App.tsx.REINCIO_DANTE' y lanzara el servidor limpiamente.
echo.

:: 1. Verificar existencia del backup
if not exist "App.tsx.REINCIO_DANTE" (
    echo [ERROR] No se encuentra el archivo 'App.tsx.REINCIO_DANTE'.
    echo No se puede restaurar.
    pause
    exit /b
)

:: 2. Confirmación
set /p "choice=Deseas restaurar el sistema ahora? (S/N): "
if /i "!choice!" neq "S" (
    echo Operacion cancelada.
    pause
    exit /b
)

:: 3. Restaurar App.tsx
echo.
echo [+] Restaurando App.tsx desde el punto de seguridad...
copy /y "App.tsx.REINCIO_DANTE" "App.tsx" > nul
if %errorlevel% neq 0 (
    echo [ERROR] No se pudo copiar el archivo. Asegurate de que no este abierto.
    pause
    exit /b
)
echo [OK] App.tsx restaurado.

:: 4. Limpiar cache de Vite (opcional pero recomendado para "limpio")
echo.
echo [+] Limpiando cache de Vite para un inicio fresco...
if exist "node_modules\.vite" (
    rd /s /q "node_modules\.vite"
    echo [OK] Cache eliminado.
)

:: 5. Iniciar servidor
echo.
echo [+] Iniciando aplicacion en puerto 3333...
echo.
npm run dev -- --port 3333

pause
