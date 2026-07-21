#!/usr/bin/env sh

echo "Starting competitor-analyzer application scaffold..."

if [ -f /app/src/legacy-queue-runner.sh ]; then
    LEGACY_RUNNER="/app/src/legacy-queue-runner.sh"
elif [ -f src/legacy-queue-runner.sh ]; then
    LEGACY_RUNNER="src/legacy-queue-runner.sh"
else
    LEGACY_RUNNER=""
fi

if [ -n "$LEGACY_RUNNER" ] \
    && [ "${ENABLE_LEGACY_WORKER:-true}" = "true" ]; then

    echo "Starting legacy Playwright worker..."
    sh "$LEGACY_RUNNER" &
    LEGACY_PID=$!
else
    LEGACY_PID=""
    echo "Legacy Playwright worker is disabled or unavailable."
fi

if command -v node >/dev/null 2>&1 \
    && node -e "require.resolve('pg')" >/dev/null 2>&1; then

    echo "Starting Node.js application..."
    node src/index.js &
    APP_PID=$!
else
    APP_PID=""
    echo "WARNING: pg dependency is not installed in the image."
    echo "WARNING: application scaffold is not started yet."
fi

terminate() {
    if [ -n "$APP_PID" ]; then
        kill -TERM "$APP_PID" 2>/dev/null
    fi

    if [ -n "$LEGACY_PID" ]; then
        kill -TERM "$LEGACY_PID" 2>/dev/null
    fi

    wait 2>/dev/null
}

trap terminate TERM INT

if [ -n "$APP_PID" ]; then
    wait "$APP_PID"
elif [ -n "$LEGACY_PID" ]; then
    wait "$LEGACY_PID"
else
    while true; do
        sleep 3600
    done
fi
