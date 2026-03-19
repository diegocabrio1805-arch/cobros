@echo off
title SINCRONIZADOR DE NAVEGADORES - Cobros
color 0A
echo.
echo ===================================================
echo   SINCRONIZADOR TOTAL - MODO CACHE LIMPIO
echo ===================================================
echo.

:: Timestamp unico para forzar recarga
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "TS=%dt:~0,4%%dt:~4,2%%dt:~6,2%%dt:~8,2%%dt:~10,2%%dt:~12,2%"

set "URL_LOCAL=http://localhost:5176/?reload=%TS%"
set "URL_PROD=https://diegocabrio1805-arch.github.io/cobros/?reload=%TS%"

echo [1/4] Cerrando navegadores...
taskkill /F /IM chrome.exe /T >nul 2>&1
taskkill /F /IM msedge.exe /T >nul 2>&1
taskkill /F /IM firefox.exe /T >nul 2>&1
timeout /t 3 /nobreak >nul

echo [2/4] Limpiando cache de Chrome para el sitio...
set "CHROME_CACHE=%LOCALAPPDATA%\Google\Chrome\User Data\Default\Cache"
if exist "%CHROME_CACHE%" (
    rd /s /q "%CHROME_CACHE%" >nul 2>&1
    echo     Cache de Chrome eliminado.
) else (
    echo     No se encontro cache de Chrome.
)

echo [3/4] Limpiando cache de Edge para el sitio...
set "EDGE_CACHE=%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Cache"
if exist "%EDGE_CACHE%" (
    rd /s /q "%EDGE_CACHE%" >nul 2>&1
    echo     Cache de Edge eliminado.
) else (
    echo     No se encontro cache de Edge.
)

timeout /t 2 /nobreak >nul

echo [4/4] Abriendo navegadores con cache desactivado...

:: Chrome con --disable-cache fuerza descarga fresca de todos los assets
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" ^
    --disable-application-cache ^
    --disable-cache ^
    --new-window ^
    "%URL_LOCAL%"

timeout /t 2 /nobreak >nul

start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" ^
    --disable-application-cache ^
    --disable-cache ^
    "%URL_PROD%"

timeout /t 2 /nobreak >nul

:: Edge con InPrivate para evitar Service Worker cacheado
start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" ^
    --inprivate ^
    "%URL_LOCAL%"

timeout /t 2 /nobreak >nul

start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" ^
    --inprivate ^
    "%URL_PROD%"

echo.
echo ===================================================
echo   LISTO! Timestamp: %TS%
echo.
echo   Chrome: Cache eliminado + flags sin cache
echo   Edge:   Modo InPrivate (cache completamente fresco)
echo.
echo   Espera 15 segundos para que ambos carguen
echo   los datos frescos desde Supabase.
echo ===================================================
echo.
timeout /t 5 /nobreak >nul
