#!/bin/bash
# ═══ Configurar OpenClaw para comunicarse por Telegram ═══
echo "🔧 Configurando Telegram en OpenClaw..."

# Set Telegram token and enable channel
openclaw config set channels.telegram.token "8779418734:AAE63RPFNRulPy4ZvtL8L0iZROsnKRf69kk" 2>/dev/null
openclaw config set channels.telegram.enabled true 2>/dev/null

# If config set doesn't work, edit JSON directly
CONFIG="$HOME/.openclaw/openclaw.json"
if [ -f "$CONFIG" ]; then
    python3 -c "
import json
c = json.load(open('$CONFIG'))
if 'channels' not in c: c['channels'] = {}
c['channels']['telegram'] = {
    'enabled': True,
    'token': '8779418734:AAE63RPFNRulPy4ZvtL8L0iZROsnKRf69kk'
}
json.dump(c, open('$CONFIG','w'), indent=2)
print('✅ Telegram configurado en openclaw.json')
" 2>/dev/null || echo "⚠️ No se pudo editar config con Python, intentando sed..."
    
    # Fallback: use sed/jq
    if command -v jq &> /dev/null; then
        jq '.channels.telegram = {"enabled": true, "token": "8779418734:AAE63RPFNRulPy4ZvtL8L0iZROsnKRf69kk"}' "$CONFIG" > /tmp/oc_config.json && mv /tmp/oc_config.json "$CONFIG"
        echo "✅ Telegram configurado via jq"
    fi
fi

# Also try YAML config
YAML_CONFIG="$HOME/.openclaw/openclaw.yaml"
if [ -f "$YAML_CONFIG" ]; then
    if ! grep -q "telegram:" "$YAML_CONFIG"; then
        cat >> "$YAML_CONFIG" << 'YAMLEOF'

channels:
  telegram:
    enabled: true
    token: "8779418734:AAE63RPFNRulPy4ZvtL8L0iZROsnKRf69kk"
YAMLEOF
        echo "✅ Telegram añadido a openclaw.yaml"
    fi
fi

# Restart gateway
echo "🔄 Reiniciando gateway..."
openclaw gateway stop 2>/dev/null
sleep 2
openclaw gateway start 2>/dev/null
sleep 5

# Check status
echo "📊 Estado:"
openclaw gateway status 2>/dev/null | grep -i "telegram\|whatsapp\|connected"

echo ""
echo "✅ Configuración completada."
echo "Ahora puedes hablar con OpenClaw desde Telegram."
echo "Abre Telegram → busca tu bot → escribe cualquier mensaje."
