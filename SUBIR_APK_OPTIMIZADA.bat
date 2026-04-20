@echo off
echo ================================================
echo  SUBIR VERSION FINAL - v6.7.3
echo  Fix: APK Optimizada + Dashboard Timezone
echo ================================================
echo.
cd /d "%~dp0"
git config user.name "DDANTE1983"
git config user.email "diegocabrio1805@gmail.com"
git add .
git commit -m "feat: optimized APK v6.7.3 - final release with timezone fixes"
git push origin main
echo.
if %ERRORLEVEL% EQU 0 (
  echo EXITO! El build ha comenzado en GitHub Actions.
  echo Descarga la APK v6.7.3 en unos minutos desde:
  echo https://github.com/diegocabrio1805-arch/cobros/actions
) else (
  echo ERROR al subir a GitHub. Verifica tu conexion.
)
pause
