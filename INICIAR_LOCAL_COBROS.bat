@echo off
title INICIADOR LOCAL - Cobros
color 0B
echo Iniciando servidor local de desarrollo...
cd "%USERPROFILE%\Desktop\cobros"
start cmd /k "npm run dev"
timeout /t 5 /nobreak >nul
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "TS=%%dt:~0,14%%"
start "" "chrome.exe" --disable-application-cache --disable-cache --incognito "http://localhost:5176/?reload=%TS%"
exit
