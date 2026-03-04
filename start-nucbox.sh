#!/bin/bash
# start-nucbox.sh — Ejecutar una vez: bash ~/start-nucbox.sh
# Arranca OpenClaw + servidor + túnel y actualiza Vercel automáticamente

VERCEL_TOKEN="VERCEL_TOKEN_HERE"
VERCEL_PROJECT="filehubdef"
VERCEL_TEAM=""

echo "🦞 Arrancando NucBox stack..."

# 1. Matar procesos anteriores
pkill -f "openclaw-server" 2>/dev/null
pkill -f "cloudflared" 2>/dev/null
fuser -k 3443/tcp 2>/dev/null
sleep 2

# 2. Actualizar openclaw-server.js
curl -s -o ~/openclaw-server.js https://raw.githubusercontent.com/ramongalera22-ai/filehubdef/main/openclaw-server.js
echo "✅ openclaw-server.js actualizado"

# 3. Arrancar servidor en background
node ~/openclaw-server.js > /tmp/openclaw-server.log 2>&1 &
SERVER_PID=$!
echo "✅ Servidor arrancado (PID $SERVER_PID)"
sleep 3

# 4. Arrancar cloudflared y capturar URL
~/cloudflared tunnel --url http://localhost:3443 > /tmp/cloudflared.log 2>&1 &
echo "⏳ Esperando URL de Cloudflare..."
sleep 8

# 5. Extraer URL
TUNNEL_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/cloudflared.log | head -1)

if [ -z "$TUNNEL_URL" ]; then
  echo "❌ No se pudo obtener la URL del túnel. Revisa /tmp/cloudflared.log"
  exit 1
fi

echo "🌐 URL del túnel: $TUNNEL_URL"

# 6. Actualizar variable en Vercel automáticamente
echo "📡 Actualizando NUCBOX_URL en Vercel..."

# Obtener el projectId
PROJECT_DATA=$(curl -s "https://api.vercel.com/v9/projects/$VERCEL_PROJECT" \
  -H "Authorization: Bearer $VERCEL_TOKEN")
PROJECT_ID=$(echo $PROJECT_DATA | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])" 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
  echo "❌ No se pudo obtener el project ID. Verifica el token."
  echo "URL del túnel: $TUNNEL_URL — actualízala manualmente en Vercel"
  exit 1
fi

# Eliminar variable existente
curl -s -X DELETE "https://api.vercel.com/v9/projects/$PROJECT_ID/env/NUCBOX_URL" \
  -H "Authorization: Bearer $VERCEL_TOKEN" > /dev/null 2>&1

# Crear nueva variable
RESULT=$(curl -s -X POST "https://api.vercel.com/v9/projects/$PROJECT_ID/env" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"key\":\"NUCBOX_URL\",\"value\":\"$TUNNEL_URL\",\"type\":\"plain\",\"target\":[\"production\",\"preview\",\"development\"]}")

echo $RESULT | python3 -c "import json,sys; d=json.load(sys.stdin); print('✅ NUCBOX_URL actualizada en Vercel' if 'id' in d else '❌ Error: '+str(d))" 2>/dev/null

# 7. Trigger redeploy en Vercel
DEPLOY_RESULT=$(curl -s -X POST "https://api.vercel.com/v13/deployments" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$VERCEL_PROJECT\",\"gitSource\":{\"type\":\"github\",\"repoId\":\"filehubdef\",\"ref\":\"main\"}}" 2>/dev/null)

echo "🚀 Redeploy en Vercel disparado"
echo ""
echo "═══════════════════════════════════════"
echo "✅ NucBox stack corriendo:"
echo "   🤖 OpenClaw: activo"
echo "   🌐 Túnel: $TUNNEL_URL"  
echo "   📊 Dashboard: https://filehubdef.vercel.app"
echo "═══════════════════════════════════════"
echo ""
echo "⏳ Vercel tardará ~1 minuto en redesplegar con la nueva URL"
echo "Ctrl+C para parar el túnel"

# Mantener el script vivo
wait
