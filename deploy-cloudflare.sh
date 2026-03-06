#!/bin/bash
# Script para desplegar en Cloudflare Pages
# Requiere: npx wrangler pages deploy

echo "🚀 Cloudflare Pages Deployment"
echo "─────────────────────────────────────"
echo ""
echo "Opciones de despliegue:"
echo ""
echo "1. INSTALAR WRANGLER (una vez):"
echo "   npm install -g wrangler"
echo ""
echo "2. LOGIN en Cloudflare:"
echo "   npx wrangler login"
echo ""
echo "3. DESPLEGAR:"
echo "   npx wrangler pages deploy . --project-name=filehubdef"
echo ""
echo "O usando drag & drop en:"
echo "   https://dash.cloudflare.com → Pages → Create project"
echo ""
echo "📦 Archivos listos para subir:"
ls -la /home/carlos/.openclaw/workspace/filehubdef/*.html | head -10
echo ""
