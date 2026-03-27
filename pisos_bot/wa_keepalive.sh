#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# FILEHUB — WhatsApp Keep-Alive para OpenClaw
# Mantiene la sesión de WhatsApp activa y reconecta automáticamente
# 
# Uso: bash wa_keepalive.sh
# Cron: */5 * * * * bash ~/.openclaw/workspace/filehubdef/pisos_bot/wa_keepalive.sh
# ═══════════════════════════════════════════════════════════════

LOG="$HOME/.openclaw/workspace/filehubdef/pisos_bot/logs/wa_keepalive.log"
mkdir -p "$(dirname "$LOG")"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG"; }

# 1. Check if gateway is running
GATEWAY_PID=$(pgrep -f "openclaw.*gateway" 2>/dev/null)
if [ -z "$GATEWAY_PID" ]; then
    log "⚠️ Gateway no está corriendo. Arrancando..."
    nohup openclaw gateway start > /dev/null 2>&1 &
    sleep 5
    log "✅ Gateway arrancado"
fi

# 2. Check WhatsApp connection status
WA_STATUS=$(openclaw gateway status 2>&1 | grep -i "whatsapp" || echo "unknown")

if echo "$WA_STATUS" | grep -qi "connected"; then
    log "✅ WhatsApp conectado — todo OK"
    
    # 3. Send heartbeat to keep session alive
    openclaw send --channel whatsapp --to self --message "💓" > /dev/null 2>&1
    
elif echo "$WA_STATUS" | grep -qi "error\|closed\|mismatch\|disconnected"; then
    log "❌ WhatsApp desconectado: $WA_STATUS"
    log "🔄 Intentando reconexión automática..."
    
    # Try to reconnect without QR
    openclaw gateway stop > /dev/null 2>&1
    sleep 2
    openclaw gateway start > /dev/null 2>&1
    sleep 10
    
    # Check again
    WA_STATUS2=$(openclaw gateway status 2>&1 | grep -i "whatsapp" || echo "unknown")
    if echo "$WA_STATUS2" | grep -qi "connected"; then
        log "✅ Reconexión exitosa sin QR"
    else
        log "⚠️ Necesita re-escanear QR. Enviando alerta por Telegram..."
        # Alert via Telegram (doesn't need QR)
        openclaw send --channel telegram --to self --message "⚠️ WhatsApp desconectado en OpenClaw. Necesitas re-escanear QR. Ejecuta: openclaw channels login --channel whatsapp" > /dev/null 2>&1
    fi
else
    log "❓ Estado desconocido: $WA_STATUS"
fi
