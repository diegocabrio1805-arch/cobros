@echo off
git branch --show-current > branch.txt
git push origin main > push_out.txt 2> push_error.txt
