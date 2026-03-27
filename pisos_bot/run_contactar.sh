#!/bin/bash
WORKSPACE="$HOME/.openclaw/workspace/filehubdef"
TG="$WORKSPACE/pisos_bot/tg_send.sh"
LOG="$WORKSPACE/pisos_bot/logs/contactar_$(date +%Y%m%d_%H%M).log"
mkdir -p "$(dirname "$LOG")"

echo "🏠 Auto-contactar — $(date)" | tee "$LOG"
bash "$TG" "🏠 Auto-contactar caseros iniciado — $(date '+%H:%M')"

# Try Python scraper
if command -v python3 &> /dev/null && [ -f "$WORKSPACE/pisos_bot/auto_contactar.py" ]; then
    python3 "$WORKSPACE/pisos_bot/auto_contactar.py" 2>&1 | tee -a "$LOG"
else
    bash "$TG" "⚠️ Python no disponible — ejecuta manualmente"
fi

bash "$TG" "✅ Auto-contactar finalizado — $(date '+%H:%M'). Ver logs en minipc."
