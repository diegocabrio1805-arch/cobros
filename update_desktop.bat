@echo off
cd c:\Users\HP\Desktop\cobros
git fetch origin main
git reset --hard origin/main
git log -3 --oneline
