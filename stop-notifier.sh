#!/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIDFILE="$DIR/.notifier.pid"

if [ -f "$PIDFILE" ]; then
    PID=$(cat "$PIDFILE")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        echo "🛑 Stopped notifier process (PID: $PID)."
    fi
    rm -f "$PIDFILE"
else
    pkill -f "desktop_notifier.js"
    echo "🛑 Stopped any running desktop_notifier instances."
fi
