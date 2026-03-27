#!/bin/bash
WORKSPACE="$HOME/.openclaw/workspace/filehubdef/pisos_bot"
TG="$WORKSPACE/tg_send.sh"

echo "🔧 Instalando crons FILEHUB (Telegram principal)..."

crontab -l 2>/dev/null | grep -v "FILEHUB\|wa_keepalive\|run_contactar\|enviar_pisos\|tg_send" > /tmp/crontab_clean

cat >> /tmp/crontab_clean << EOF
# ═══ FILEHUB CRONS (Telegram principal) ═══
# Enviar pisos por Telegram: 8h, 14h, 20h
0 8,14,20 * * * bash $WORKSPACE/enviar_pisos.sh >> $WORKSPACE/logs/enviar.log 2>&1
# Auto-contactar caseros: 9h, 15h
0 9,15 * * * bash $WORKSPACE/run_contactar.sh >> $WORKSPACE/logs/contactar.log 2>&1
# WhatsApp keep-alive: cada 5 min
*/5 * * * * bash $WORKSPACE/wa_keepalive.sh >> $WORKSPACE/logs/wa_keepalive.log 2>&1
# Gateway watchdog: cada 10 min
*/10 * * * * pgrep -f "openclaw.*gateway" > /dev/null || (openclaw gateway start > /dev/null 2>&1)
EOF

crontab /tmp/crontab_clean
rm /tmp/crontab_clean

echo "✅ Crons instalados:"
crontab -l | grep "FILEHUB\|enviar_pisos\|run_contactar\|wa_keepalive\|gateway"
echo ""
echo "📋 Horario:"
echo "  08:00 — Pisos por Telegram"
echo "  09:00 — Auto-contactar caseros"
echo "  14:00 — Pisos por Telegram"
echo "  15:00 — Auto-contactar caseros"
echo "  20:00 — Pisos por Telegram"
echo "  Cada 5min — WhatsApp keep-alive"
echo "  Cada 10min — Gateway watchdog"

# Send confirmation
bash "$TG" "✅ Crons FILEHUB instalados en minipc

📋 Horario:
08:00 — Pisos por Telegram
09:00 — Auto-contactar caseros
14:00 — Pisos por Telegram
15:00 — Auto-contactar caseros
20:00 — Pisos por Telegram

Todo automático. Te aviso aquí si algo falla."

echo ""
echo "✅ Confirmación enviada por Telegram"
