#!/usr/bin/env bash
set -euo pipefail

MAX_ATTEMPTS="${MAX_ATTEMPTS:-3}"
SLEEP_SECONDS="${SLEEP_SECONDS:-10}"
WRANGLER_VERSION="${WRANGLER_VERSION:-4.83.0}"

bun run cf:build

attempt=1
while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
  echo "[deploy] Attempt ${attempt}/${MAX_ATTEMPTS} using wrangler@${WRANGLER_VERSION}"
  if npx "wrangler@${WRANGLER_VERSION}" deploy; then
    echo "[deploy] Success on attempt ${attempt}"
    exit 0
  fi

  if [ "$attempt" -lt "$MAX_ATTEMPTS" ]; then
    echo "[deploy] Attempt ${attempt} failed. Retrying in ${SLEEP_SECONDS}s..."
    sleep "$SLEEP_SECONDS"
  fi

  attempt=$((attempt + 1))
done

echo "[deploy] All ${MAX_ATTEMPTS} attempts failed."
exit 1
