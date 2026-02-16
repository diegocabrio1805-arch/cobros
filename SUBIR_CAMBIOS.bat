@echo off
echo ===================================================
echo   SUBIENDO CAMBIOS A LA NUBE (GITHUB)
echo ===================================================
echo.
echo 1. Comprobando estado...
git status
echo.
echo 2. Guardando cambios...
git add .
git commit -m "Fix: Disable Generator module to prevent white screen crash (v6.1.45)"
echo.
echo 3. Subiendo a GitHub...
git push origin main
echo.
echo ===================================================
echo   LISTO!
echo   Los cambios tardaran unos 2-5 minutos en aparecer en:
echo   https://diegocabrio1805-arch.github.io/cobros/
echo ===================================================
pause
