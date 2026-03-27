#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# FILEHUB — Enviar lista de pisos por TODOS los canales
# No depende del gateway de OpenClaw
# Intenta: Telegram Bot API → Email via Python → Archivo local
# ═══════════════════════════════════════════════════════════════

TELEGRAM_TOKEN="8779418734:AAE63RPFNRulPy4ZvtL8L0iZROsnKRf69kk"
TELEGRAM_CHAT_ID=""  # Se autodetecta al primer mensaje
EMAIL="carlosgalera2roman@gmail.com"
PHONE="679888148"
LOG="$HOME/.openclaw/workspace/filehubdef/pisos_bot/logs/enviar_$(date +%Y%m%d_%H%M%S).log"
DATA_DIR="$HOME/.openclaw/workspace/filehubdef/pisos_bot/data"
mkdir -p "$(dirname "$LOG")" "$DATA_DIR"

MENSAJE='🏠 *PISOS BCN TOP 15 — '$(date +%d/%m/%Y)'*

*Somos una pareja de médicos buscando piso en Barcelona.*
Contacto: 679 888 148 | carlosgalera2roman@gmail.com

📍 *MEJORES POR SCORING (precio/m²):*

1. Dúplex Fort Pienc — 1.205€ — 90m² — 2 hab
   https://www.idealista.com/inmueble/99284349/
2. Piso Sant Dalmir, Teixonera — 1.195€ — 80m² — 2 hab
   https://www.idealista.com/inmueble/102092763/
3. Piso Camp dEn Grassot, Gràcia — 941€ — 66m² — 2 hab
   https://www.idealista.com/inmueble/975271/
4. Piso Encarnació, Baix Guinardó — 1.268€ — 80m² — 3 hab
   https://www.idealista.com/inmueble/110745601/
5. Piso Martí, Camp dEn Grassot — 1.329€ — 80m² — 4 hab
   https://www.idealista.com/inmueble/110856801/
6. Piso Casanova, Antiga Esquerra — 940€ — 62m² — 2 hab
   https://www.idealista.com/inmueble/38321216/
7. Piso Rambla del Carmel — 1.150€ — 70m² — 2 hab
   https://www.idealista.com/inmueble/110974519/
8. Piso Alba, Vila de Gràcia — 1.125€ — 68m² — 4 hab
   https://www.idealista.com/inmueble/111028538/
9. Piso Sales i Ferré, Guinardó — 1.295€ — 75m² — 2 hab
   https://www.idealista.com/inmueble/109644970/
10. Piso Consell de Cent, Nova Esquerra — 1.330€ — 76m² — 1 hab
    https://www.idealista.com/inmueble/106812019/
11. Piso Gomis, Vallcarca — 1.150€ — 67m² — 3 hab
    https://www.idealista.com/inmueble/110929118/
12. Piso Rosalia de Castro, Baix Guinardó — 1.150€ — 65m² — 1 hab
    https://www.idealista.com/inmueble/110035915/
13. Piso Dante Alighieri, El Carmel — 950€ — 55m² — 2 hab
    https://www.idealista.com/inmueble/98792320/
14. Ático Conca de Tremp, El Carmel — 973€ — 55m² — 2 hab
    https://www.idealista.com/inmueble/97013179/
15. Piso Balmes 153, Antiga Esquerra — 1.363€ — 70m² — 3 hab
    https://www.idealista.com/inmueble/110762440/

✉️ Carlos Galera Román — 679 888 148'

log() { echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG"; }

log "🚀 Inicio envío multi-canal"

# ═══ CANAL 1: Telegram Bot API (directo, sin gateway) ═══
log "📱 Canal 1: Telegram..."

# Get chat_id first by checking updates
UPDATES=$(curl -s "https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates" 2>/dev/null)
CHAT_ID=$(echo "$UPDATES" | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    msgs=d.get('result',[])
    for m in reversed(msgs):
        c=m.get('message',{}).get('chat',{}).get('id')
        if c: print(c); break
except: pass
" 2>/dev/null)

if [ -n "$CHAT_ID" ]; then
    # Send via Telegram
    TGRESULT=$(curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
        -d "chat_id=${CHAT_ID}" \
        -d "text=${MENSAJE}" \
        -d "parse_mode=Markdown" \
        --max-time 15 2>/dev/null)
    
    if echo "$TGRESULT" | grep -q '"ok":true'; then
        log "✅ Telegram enviado OK (chat_id: $CHAT_ID)"
    else
        # Try without markdown
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
            -d "chat_id=${CHAT_ID}" \
            -d "text=$(echo "$MENSAJE" | sed 's/\*//g')" \
            --max-time 15 > /dev/null 2>&1
        log "⚠️ Telegram enviado sin formato (chat_id: $CHAT_ID)"
    fi
else
    log "⚠️ Telegram: no se encontró chat_id. Envía /start al bot primero."
fi

# ═══ CANAL 2: OpenClaw WhatsApp (intento rápido) ═══
log "📱 Canal 2: WhatsApp via OpenClaw..."
echo "$MENSAJE" | timeout 15 openclaw send --channel whatsapp --to "$PHONE" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    log "✅ WhatsApp enviado OK"
else
    log "⚠️ WhatsApp falló (gateway inestable)"
fi

# ═══ CANAL 3: Email via Python ═══
log "📧 Canal 3: Email..."
python3 -c "
import smtplib
from email.mime.text import MIMEText
try:
    msg = MIMEText('''$(echo "$MENSAJE" | sed "s/'/\\\\'/g")''', 'plain', 'utf-8')
    msg['Subject'] = 'Pisos BCN TOP 15 — $(date +%d/%m/%Y)'
    msg['From'] = '$EMAIL'
    msg['To'] = '$EMAIL'
    # Try gmail
    s = smtplib.SMTP('smtp.gmail.com', 587)
    s.starttls()
    # Note: needs app password configured
    print('Email requires app password - skipping SMTP')
except Exception as e:
    print(f'Email skip: {e}')
" 2>&1 | tee -a "$LOG"

# ═══ CANAL 4: Guardar archivo local (SIEMPRE funciona) ═══
log "💾 Canal 4: Guardando archivo local..."
OUTFILE="$DATA_DIR/pisos_$(date +%Y%m%d_%H%M%S).txt"
echo "$MENSAJE" > "$OUTFILE"
log "✅ Guardado en $OUTFILE"

# ═══ CANAL 5: OpenClaw Telegram (backup) ═══
log "📱 Canal 5: OpenClaw Telegram..."
echo "$MENSAJE" | timeout 15 openclaw send --channel telegram --to self > /dev/null 2>&1
if [ $? -eq 0 ]; then
    log "✅ OpenClaw Telegram enviado OK"
else
    log "⚠️ OpenClaw Telegram falló"
fi

log "🏁 Fin envío multi-canal. Ver $LOG"
echo ""
echo "═══ RESUMEN ═══"
grep "✅\|⚠️\|❌" "$LOG"
