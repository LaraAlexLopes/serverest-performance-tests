#!/usr/bin/env bash
set -euo pipefail

TEST="$1"
shift
NAME="$(basename "$TEST" .ts)"
mkdir -p reports

docker run --rm -i \
  --network host \
  --user "$(id -u):$(id -g)" \
  -v "$PWD":/work -w /work \
  -e BASE_URL="${BASE_URL:-http://localhost:3000}" \
  -e K6_WEB_DASHBOARD=true \
  -e K6_WEB_DASHBOARD_EXPORT="reports/${NAME}.html" \
  -e K6_WEB_DASHBOARD_PERIOD=2s \
  -e TEST_NAME="$NAME" \
  grafana/k6:2.3.0 run --summary-export="reports/${NAME}-summary.json" "$TEST" "$@"
