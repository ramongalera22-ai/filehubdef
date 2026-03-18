#!/bin/bash

# Script para hacer push al repositorio GitHub
# Uso: ./push-to-github.sh [token_github]

REPO_URL="https://github.com/ramongalera22-ai/filehubdef.git"
BRANCH="master"

if [ $# -eq 0 ]; then
    echo "⚠️  Script de Push a GitHub"
    echo "======================================"
    echo ""
    echo "Uso: $0 <GITHUB_TOKEN>"
    echo ""
    echo "Para generar un token:"
    echo "1. Ir a: https://github.com/settings/tokens"
    echo "2. Click en 'Generate new token'"
    echo "3. Seleccionar scopes: repo"
    echo "4. Copiar el token"
    echo ""
    echo "Ejemplo: $0 ghp_xxxxxxxxxxxxxxxxxxxxxx"
    exit 1
fi

TOKEN="$1"

echo "🚀 Iniciando push a GitHub..."
echo "Repositorio: $REPO_URL"
echo "Rama: $BRANCH"
echo ""

# Configurar credenciales temporales
git config credential.helper store

# Intentar push con token
echo "https://oauth2:${TOKEN}@github.com" | git credential approve

# Push
git push "https://${TOKEN}@github.com/ramongalera22-ai/filehubdef.git" "$BRANCH"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Push completado correctamente!"
    echo "🌐 Dashboard disponible en:"
    echo "   https://phenomenal-nasturtium-5e1a1d.netlify.app/pisos.html"
else
    echo ""
    echo "❌ Error en el push"
    exit 1
fi
