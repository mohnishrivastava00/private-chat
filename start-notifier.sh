#!/bin/bash
# Background runner for Private Chat Stealth Notifier

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIDFILE="$DIR/.notifier.pid"

if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
    echo "Notifier is already running (PID: $(cat "$PIDFILE"))."
    exit 0
fi

nohup node "$DIR/desktop_notifier.js" > "$DIR/notifier.log" 2>&1 &
echo $! > "$PIDFILE"
echo "✅ Private Chat Notifier started in background (PID: $(cat "$PIDFILE"))."
echo "📝 Log: $DIR/notifier.log"
