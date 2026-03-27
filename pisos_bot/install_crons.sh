#!/bin/bash
WORKSPACE="$HOME/.openclaw/workspace/filehubdef/pisos_bot"
TG="$WORKSPACE/tg_send.sh"

echo "🔧 Instalando crons FILEHUB..."

crontab -l 2>/dev/null | grep -v "FILEHUB\|wa_keepalive\|run_contactar\|enviar_pisos\|enviar_ofertas\|ejecutar_todo\|tg_send\|gateway" > /tmp/crontab_clean

cat >> /tmp/crontab_clean << EOF
# ═══ FILEHUB CRONS ═══
# Pisos cada 4 horas: 7h, 11h, 15h, 19h, 23h
0 7,11,15,19,23 * * * bash $WORKSPACE/ejecutar_todo.sh >> $WORKSPACE/logs/pisos.log 2>&1
# Ofertas trabajo cada 6 horas: 8h, 14h, 20h
0 8,14,20 * * * bash $WORKSPACE/enviar_ofertas.sh >> $WORKSPACE/logs/ofertas.log 2>&1
# WhatsApp keep-alive: cada 5 min
*/5 * * * * bash $WORKSPACE/wa_keepalive.sh >> $WORKSPACE/logs/wa_keepalive.log 2>&1
# Gateway watchdog: cada 10 min
*/10 * * * * pgrep -f "openclaw.*gateway" > /dev/null || (openclaw gateway start > /dev/null 2>&1)
EOF

crontab /tmp/crontab_clean
rm /tmp/crontab_clean

echo "✅ Crons instalados:"
crontab -l | grep "FILEHUB\|ejecutar_todo\|enviar_ofertas\|wa_keepalive\|gateway"
echo ""
echo "📋 Horario:"
echo "  🏠 Pisos cada 4h:    07:00, 11:00, 15:00, 19:00, 23:00"
echo "  🏥 Ofertas cada 6h:  08:00, 14:00, 20:00"
echo "  📱 WA keep-alive:    cada 5 min"
echo "  🔧 Gateway watchdog: cada 10 min"

bash "$TG" "✅ Crons FILEHUB actualizados

🏠 Pisos cada 4h: 07, 11, 15, 19, 23h
   → Busca + contacta caseros + envía por Telegram

🏥 Ofertas cada 6h: 08, 14, 20h
   → Médico familia + telemedicina

📱 WA keep-alive cada 5 min
🔧 Gateway watchdog cada 10 min

Todo automático por Telegram."

echo ""
echo "✅ Confirmación enviada por Telegram"
