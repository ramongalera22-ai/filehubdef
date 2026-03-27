#!/bin/bash
# Instala crons para mantener WhatsApp vivo y contactar pisos
WORKSPACE="$HOME/.openclaw/workspace/filehubdef/pisos_bot"

echo "🔧 Instalando crons de FILEHUB..."

# Remove old FILEHUB crons
crontab -l 2>/dev/null | grep -v "FILEHUB\|wa_keepalive\|run_contactar" > /tmp/crontab_clean

# Add new crons
cat >> /tmp/crontab_clean << EOF
# ═══ FILEHUB CRONS ═══
# WhatsApp keep-alive: cada 5 minutos
*/5 * * * * bash $WORKSPACE/wa_keepalive.sh >> $WORKSPACE/logs/wa_keepalive.log 2>&1
# Auto-contactar pisos: 8h, 13h, 19h
0 8,13,19 * * * bash $WORKSPACE/run_contactar.sh >> $WORKSPACE/logs/contactar.log 2>&1
# Gateway watchdog: cada 10 minutos
*/10 * * * * pgrep -f "openclaw.*gateway" > /dev/null || (openclaw gateway start > /dev/null 2>&1)
EOF

crontab /tmp/crontab_clean
rm /tmp/crontab_clean

echo "✅ Crons instalados:"
crontab -l | grep "FILEHUB\|wa_keepalive\|run_contactar\|gateway"
echo ""
echo "📋 Resumen:"
echo "  • WhatsApp keep-alive: cada 5 min"
echo "  • Auto-contactar pisos: 8h, 13h, 19h"  
echo "  • Gateway watchdog: cada 10 min"
echo ""
echo "Para ver logs: tail -f $WORKSPACE/logs/wa_keepalive.log"
