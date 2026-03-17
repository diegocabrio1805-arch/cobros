cd /d "C:\Users\HP\Desktop\cobros"
git init
git remote add origin https://github.com/diegocabrio1805-arch/cobros.git
git fetch origin
git reset --mixed origin/main
git branch --set-upstream-to=origin/main main
