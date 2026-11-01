#!/usr/bin/env bash
set -euo pipefail
# Deploys the build.

TARGET="${1:-staging}"
COUNT=$(ls dist | wc -l)

if [[ "$TARGET" == "production" && $COUNT -gt 0 ]]; then
  echo "Deploying $COUNT files to ${TARGET}"
  rsync -az --delete dist/ "deploy@host:/srv/app"
else
  echo 'nothing to do' >&2
fi

cat <<EOF2
Done at $(date)
EOF2
