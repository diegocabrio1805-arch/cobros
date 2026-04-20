cd c:\Users\HP\Desktop\cobros
git add components/Dashboard.tsx components/CollectorCommission.tsx hooks/useAppActions.ts
git commit -m "Fix timezone bugs and restore extensive deletion tracking (payments, clients, loans)"
for /f "delims=" %%i in ('gh auth token') do set GHTOKEN=%%i
git push https://%GHTOKEN%@github.com/diegocabrio1805-arch/cobros.git main
echo SUCCESS
