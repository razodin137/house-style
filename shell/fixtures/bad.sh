#!/usr/bin/env bash
# Deliberately broken — this is what the gate catches. Do not run.
set -euo pipefail

deploy_dir="$1"
count=1

if [[ -n "$deploy_dir" ]]; then
    echo Deploying to $deploy_dir
    echo "$missing_setting"
    echo '$count'
    total=$(($count + 1))
    echo "$total"
fi
