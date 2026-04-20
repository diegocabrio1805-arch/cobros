@echo off
git add App.tsx services/bluetoothPrinterService.ts
git commit -m "fix: bluetooth initialization crash on A13"
git push origin main
echo DONE
