#!/bin/bash
# FILEHUB — Auto-Contactar Caseros BCN
# IMPORTANTE: usa SOLO profile "openclaw" o "chrome". NUNCA "minipc".

WORKSPACE="$HOME/.openclaw/workspace/filehubdef"
mkdir -p "$WORKSPACE/pisos_bot/data" "$WORKSPACE/pisos_bot/logs"

echo "🏠 FILEHUB Auto-Contactar — $(date)"
echo "📌 Browser profile: openclaw (NOT minipc)"

# Try Python first
if command -v python3 &> /dev/null && [ -f "$WORKSPACE/pisos_bot/auto_contactar.py" ]; then
    echo "🐍 Ejecutando Python..."
    python3 "$WORKSPACE/pisos_bot/auto_contactar.py"
    exit $?
fi

# Fallback: OpenClaw agent
echo "🤖 Lanzando OpenClaw agent..."
bash "$WORKSPACE/run_pisos_agent.sh"
