#!/bin/bash
# Deploy usando Cloudflare Pages API

PROJECT_NAME="arditi-dashboard"
ACCOUNT_ID=""  # Se obtiene de la cuenta
API_TOKEN=""   # Token de API

# Crear archivo ZIP para subir
cd /home/carlos/.openclaw/workspace/filehubdef
zip -r deploy.zip index.html chat-dashboard.html chat-history.json pisos.html ofertas.html panel-control.html plataforma-unificada.html styles.css assets/ netlify/functions/ api/ 2>/dev/null || zip -r deploy.zip *.html *.json *.js *.css netlify/ api/ .github/ 2>/dev/null || zip -r deploy.zip * -x "*.git*" -x "node_modules/*" -x "*.zip"

echo "📦 Archivo creado: deploy.zip"
echo ""
echo "Para desplegar en Cloudflare Pages:"
echo "1. Ve a https://dash.cloudflare.com"
echo "2. Pages → Create a project → Direct Upload"
echo "3. Arrastra deploy.zip"
echo ""
echo "O usa la API:"
echo "curl -X POST 'https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects' \"
echo "  -H 'Authorization: Bearer {api_token}' \"
echo "  -F 'file=@deploy.zip'"
