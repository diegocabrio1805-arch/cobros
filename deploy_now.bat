@echo off
git add .
git commit -m "fix(bt): keepalive ping and UI modal state fix"
node push.js
