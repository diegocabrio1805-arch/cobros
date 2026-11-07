@echo off
title Crear Acceso Directo en el Escritorio
powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([System.IO.Path]::Combine([System.Environment]::GetFolderPath('Desktop'), 'Anexo Cobros Local.lnk')); $s.TargetPath = '%~dp0ACTIVADOR_LOCAL.bat'; $s.WorkingDirectory = '%~dp0'; $s.IconLocation = 'shell32.dll,13'; $s.Save()"
echo Acceso directo creado en el Escritorio con exito.
timeout /t 3 >nul

