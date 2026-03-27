@echo off
echo ===================================================
echo   ENVIANDO MEJORAS DE BLUETOOTH Y UI AL SERVIDOR...
echo ===================================================

cd c:\Users\HP\.gemini\antigravity\scratch\cobros

echo Agregando archivos modificados (Bluetooth y UI)...
git add package.json
git add services/bluetoothPrinterService.ts
git add components/LicenseReminder.tsx
git add package-lock.json

echo Creando punto de guardado (commit)...
git commit -m "fix(bt): Integrado ping keep-alive anti-bloqueo y arreglado Modal de Licencia (v6.6.32)"

echo Subiendo a GitHub Actions para compilar APK...
git push origin main

echo ===================================================
echo   ESTADO: ACTUALIZACIÓN ENVIADA CON EXITO.
echo ===================================================
echo Revisa tu panel en GitHub Actions, la APK se armará ahora.
pause
