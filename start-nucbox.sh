#!/bin/bash
VERCEL_TOKEN="VERCEL_TOKEN_HERE"
VERCEL_PROJECT="filehubdef"
VERCEL_TEAM="fil"

echo "🦞 Arrancando NucBox stack..."

pkill -f "openclaw-server" 2>/dev/null
pkill -f "cloudflared" 2>/dev/null
fuser -k 3443/tcp 2>/dev/null
sleep 2

curl -s -o ~/openclaw-server.js https://raw.githubusercontent.com/ramongalera22-ai/filehubdef/main/openclaw-server.js
echo "✅ openclaw-server.js actualizado"

node ~/openclaw-server.js > /tmp/openclaw-server.log 2>&1 &
echo "✅ Servidor arrancado"
sleep 3

~/cloudflared tunnel --url http://localhost:3443 > /tmp/cloudflared.log 2>&1 &
echo "⏳ Esperando URL de Cloudflare..."
sleep 8

TUNNEL_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/cloudflared.log | head -1)

if [ -z "$TUNNEL_URL" ]; then
  echo "❌ No se pudo obtener la URL del túnel"
  exit 1
fi

echo "🌐 URL del túnel: $TUNNEL_URL"
echo "📡 Actualizando NUCBOX_URL en Vercel..."

PROJECT_DATA=$(curl -s "https://api.vercel.com/v9/projects/$VERCEL_PROJECT?teamId=$VERCEL_TEAM" \
  -H "Authorization: Bearer $VERCEL_TOKEN")
PROJECT_ID=$(echo $PROJECT_DATA | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])" 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
  echo "❌ No se pudo obtener project ID"
  echo "🌐 URL del túnel: $TUNNEL_URL — actualízala manualmente en Vercel"
else
  # Buscar y eliminar variable existente
  ENV_ID=$(curl -s "https://api.vercel.com/v9/projects/$PROJECT_ID/env?teamId=$VERCEL_TEAM" \
    -H "Authorization: Bearer $VERCEL_TOKEN" | \
    python3 -c "import json,sys; envs=json.load(sys.stdin).get('envs',[]); [print(e['id']) for e in envs if e['key']=='NUCBOX_URL']" 2>/dev/null | head -1)

  if [ -n "$ENV_ID" ]; then
    curl -s -X DELETE "https://api.vercel.com/v9/projects/$PROJECT_ID/env/$ENV_ID?teamId=$VERCEL_TEAM" \
      -H "Authorization: Bearer $VERCEL_TOKEN" > /dev/null
  fi

  curl -s -X POST "https://api.vercel.com/v9/projects/$PROJECT_ID/env?teamId=$VERCEL_TEAM" \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"key\":\"NUCBOX_URL\",\"value\":\"$TUNNEL_URL\",\"type\":\"plain\",\"target\":[\"production\",\"preview\",\"development\"]}" > /dev/null

  echo "✅ NUCBOX_URL actualizada: $TUNNEL_URL"

  # Redeploy
  curl -s -X POST "https://api.vercel.com/v13/deployments?teamId=$VERCEL_TEAM&forceNew=1" \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$VERCEL_PROJECT\",\"gitSource\":{\"type\":\"github\",\"repoId\":\"ramongalera22-ai/filehubdef\",\"ref\":\"main\"}}" > /dev/null

  echo "🚀 Redeploy en Vercel disparado"
fi

echo ""
echo "═══════════════════════════════════════"
echo "✅ Stack corriendo:"
echo "   🤖 OpenClaw: activo"
echo "   🌐 Túnel: $TUNNEL_URL"
echo "   📊 Dashboard: https://filehubdef.vercel.app"
echo "═══════════════════════════════════════"
echo "⏳ Vercel tardará ~1 min en redesplegar"

wait
