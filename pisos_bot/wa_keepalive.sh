#!/bin/bash
LOG="$HOME/.openclaw/workspace/filehubdef/pisos_bot/logs/wa_keepalive.log"
mkdir -p "$(dirname "$LOG")"
TG="$HOME/.openclaw/workspace/filehubdef/pisos_bot/tg_send.sh"

GATEWAY_PID=$(pgrep -f "openclaw.*gateway" 2>/dev/null)
if [ -z "$GATEWAY_PID" ]; then
    nohup openclaw gateway start > /dev/null 2>&1 &
    sleep 5
fi

WA_STATUS=$(openclaw gateway status 2>&1 | grep -i "whatsapp" || echo "unknown")
if echo "$WA_STATUS" | grep -qi "error\|closed\|mismatch\|disconnected"; then
    openclaw gateway stop > /dev/null 2>&1
    sleep 2
    openclaw gateway start > /dev/null 2>&1
    sleep 10
    WA_STATUS2=$(openclaw gateway status 2>&1 | grep -i "whatsapp" || echo "unknown")
    if ! echo "$WA_STATUS2" | grep -qi "connected"; then
        bash "$TG" "⚠️ WhatsApp desconectado. Ejecuta: openclaw channels login --channel whatsapp"
    fi
fi
