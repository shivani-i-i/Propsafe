#!/bin/bash
export FILTER_BRANCH_SQUELCH_WARNING=1

git filter-branch -f --tree-filter '
  if [ -f frontend/gps-survey.html ]; then
    sed -i "s/AIzaSyBVF0dYeq76DDfLKYDhdVVmANvPfLfPBMg/REDACTED_API_KEY/g" frontend/gps-survey.html
  fi
' -- --all

rm -rf .git/refs/original
git reflog expire --expire=now --all
git gc --prune=now --aggressive
