@echo off
git init
git add .
git commit -m "Backup"
git remote add origin https://github.com/David12752/SpeakerBuilder.git
git branch -M main
git push -u origin main
echo DONE
