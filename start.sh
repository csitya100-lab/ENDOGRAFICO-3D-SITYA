#!/bin/bash
git config user.email "csitya100@gmail.com"
git config user.name "csitya100-lab"
git config pull.rebase false
export GIT_MERGE_AUTOEDIT=no
git merge --abort 2>/dev/null
git pull origin main --no-edit 2>/dev/null || true
npm run dev
