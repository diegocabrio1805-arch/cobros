@echo off
title 🔄 SINCRONIZADOR DE NAVEGADORES - Cobros
echo.
echo ===================================================
echo   SINCRONIZADOR TOTAL DE NAVEGADORES
echo   Limpia cache y fuerza recarga en todos los
echo   navegadores al mismo tiempo
echo ===================================================
echo.

:: Generar timestamp unico para forzar recarga fresca
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "TIMESTAMP=%dt:~0,4%%dt:~4,2%%dt:~6,2%%dt:~8,2%%dt:~10,2%%dt:~12,2%%dt:~15,3%"

set "URL_LOCAL=http://localhost:5176/?reload=%TIMESTAMP%"
set "URL_PROD=https://diegocabrio1805-arch.github.io/cobros/?reload=%TIMESTAMP%"

echo Timestamp de sincronizacion: %TIMESTAMP%
echo.
echo Cerrando navegadores existentes para limpiar cache...
taskkill /F /IM chrome.exe /T >nul 2>&1
taskkill /F /IM msedge.exe /T >nul 2>&1
taskkill /F /IM firefox.exe /T >nul 2>&1

echo Esperando 2 segundos para asegurar cierre completo...
timeout /t 2 /nobreak >nul

echo.
echo Abriendo Chrome (LOCAL - localhost:5176)...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --new-window "%URL_LOCAL%"
timeout /t 1 /nobreak >nul

echo Abriendo Chrome (PRODUCCION - GitHub Pages)...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "%URL_PROD%"
timeout /t 1 /nobreak >nul

echo Abriendo Edge (LOCAL - localhost:5176)...
start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --new-window "%URL_LOCAL%"
timeout /t 1 /nobreak >nul

echo Abriendo Edge (PRODUCCION - GitHub Pages)...
start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" "%URL_PROD%"

echo.
echo ===================================================
echo   LISTO! Todos los navegadores abrieron con
echo   el mismo timestamp: %TIMESTAMP%
echo   Todos veran los mismos datos frescos de Supabase.
echo ===================================================
echo.
echo IMPORTANTE: Espera 10-15 segundos a que todos
echo cargen antes de registrar pagos.
echo.
pause
