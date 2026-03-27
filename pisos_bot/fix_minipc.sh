#!/bin/bash
# Fix: replace all "minipc" references with "openclaw" in workspace
echo "🔧 Buscando referencias a 'minipc' en OpenClaw workspace..."

# Find and replace in all files
find ~/.openclaw/workspace -type f \( -name "*.sh" -o -name "*.py" -o -name "*.json" -o -name "*.yml" -o -name "*.yaml" -o -name "*.toml" -o -name "*.cfg" \) \
  -exec grep -l "minipc" {} \; 2>/dev/null | while read f; do
    echo "  📝 Fixing: $f"
    sed -i 's/minipc/openclaw/g' "$f"
done

# Also check openclaw config
for cfg in ~/.openclaw/config.yml ~/.openclaw/config.yaml ~/.openclaw/config.json ~/.openclaw/settings.json; do
    if [ -f "$cfg" ]; then
        if grep -q "minipc" "$cfg"; then
            echo "  📝 Fixing config: $cfg"
            sed -i 's/minipc/openclaw/g' "$cfg"
        fi
    fi
done

echo "✅ Todas las referencias a 'minipc' reemplazadas por 'openclaw'"
echo "🔄 Reinicia OpenClaw: openclaw restart"
