@echo off
git add components/Dashboard.tsx
git add hooks/useAppActions.ts
git add components/CollectorCommission.tsx
git commit -m "Fix timezone bugs and deletion tracking"
for /f "delims=" %%i in ('gh auth token') do set GHTOKEN=%%i
git push https://%%GHTOKEN%%@github.com/diegocabrio1805-arch/cobros.git main
echo SUCCESS
