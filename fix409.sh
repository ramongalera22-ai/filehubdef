#!/bin/bash
# ══════════════════════════════════════════════════
# fix409.sh — Elimina el error 409 de OpenClaw
# Edita la config para deshabilitar Telegram polling
# ══════════════════════════════════════════════════
set -e

RED='\033[0;31m'; GRN='\033[0;32m'; YLW='\033[1;33m'; NC='\033[0m'
ok()  { echo -e "${GRN}✅ $1${NC}"; }
err() { echo -e "${RED}❌ $1${NC}"; }
inf() { echo -e "${YLW}→  $1${NC}"; }

echo ""
echo "🦞 fix409.sh — Corrige el error 409 de OpenClaw Telegram"
echo "══════════════════════════════════════════════════════════"
echo ""

# 1. Encontrar config
inf "Buscando archivo de configuración..."
CONFIG=$(find "$HOME" -path "*/.openclaw*/config*" \( -name "*.yml" -o -name "*.yaml" \) 2>/dev/null | grep -v "\-dev" | head -1)
if [ -z "$CONFIG" ]; then
  CONFIG=$(find "$HOME" -path "*openclaw*" -name "config*" 2>/dev/null | head -1)
fi

if [ -z "$CONFIG" ]; then
  err "No se encontró config.yml"
  inf "Estructura de ~/.openclaw:"
  find "$HOME/.openclaw" -maxdepth 3 2>/dev/null | head -30
  exit 1
fi
ok "Config: $CONFIG"

# 2. Mostrar sección telegram actual
echo ""
inf "Sección telegram actual:"
grep -n -A10 -i "telegram" "$CONFIG" 2>/dev/null || echo "(no encontrado)"

# 3. Backup
cp "$CONFIG" "${CONFIG}.bak.$(date +%s)"
ok "Backup creado"

# 4. Editar con Python (robusto para YAML)
echo ""
inf "Deshabilitando canal Telegram..."
python3 - "$CONFIG" << 'PYEOF'
import sys, re

config_file = sys.argv[1]
with open(config_file, 'r') as f:
    content = f.read()

original = content

# Strategy 1: find telegram block and set/add enabled: false
# Handles various YAML structures OpenClaw might use

lines = content.split('\n')
new_lines = []
in_telegram = False
telegram_indent = 0
added_disabled = False
i = 0

while i < len(lines):
    line = lines[i]
    stripped = line.lstrip()
    indent = len(line) - len(stripped)

    # Detect entering telegram section
    if re.match(r'\s*telegram\s*:', line):
        in_telegram = True
        telegram_indent = indent
        new_lines.append(line)
        i += 1
        # Check next lines for enabled field
        j = i
        found_enabled = False
        while j < len(lines):
            l2 = lines[j]
            s2 = l2.lstrip()
            ind2 = len(l2) - len(s2)
            if ind2 <= telegram_indent and s2 and not s2.startswith('#'):
                break
            if re.match(r'\s*enabled\s*:', l2):
                new_lines.append(re.sub(r'enabled\s*:.*', 'enabled: false', l2))
                found_enabled = True
                i = j + 1
                break
            new_lines.append(lines[j])
            j += 1
            i = j
        if not found_enabled:
            # inject enabled: false right after the telegram: line
            new_lines.append(' ' * (telegram_indent + 2) + 'enabled: false')
            added_disabled = True
        in_telegram = False
        continue

    new_lines.append(line)
    i += 1

result = '\n'.join(new_lines)

if result == original:
    print("⚠️  No se pudo modificar automáticamente. Intentando reemplazo directo...")
    # Fallback: comment out telegram token line
    result = re.sub(
        r'(\s*)(token\s*:)',
        lambda m: m.group(1) + 'enabled: false\n' + m.group(1) + '# ' + m.group(2).lstrip(),
        result, count=1
    )

with open(config_file, 'w') as f:
    f.write(result)

print(f"Guardado: {config_file}")
PYEOF

echo ""
inf "Config tras edición (sección telegram):"
grep -n -A10 -i "telegram" "$CONFIG" 2>/dev/null

# 5. Matar y reiniciar OpenClaw
echo ""
inf "Reiniciando OpenClaw sin Telegram..."
pkill -9 -f openclaw 2>/dev/null || true
sleep 2
openclaw gateway --force > /tmp/openclaw.log 2>&1 &
GW_PID=$!
ok "Gateway iniciado (PID $GW_PID)"

# 6. Esperar y verificar
inf "Esperando 10s para verificar..."
sleep 10

if grep -q "409" /tmp/openclaw.log 2>/dev/null; then
    err "El 409 sigue. Mostrando log:"
    tail -20 /tmp/openclaw.log
    echo ""
    inf "Plan B: mostrando config completo para edición manual:"
    cat "$CONFIG"
else
    ok "¡Sin errores 409! Telegram deshabilitado correctamente."
    inf "Log del gateway:"
    tail -15 /tmp/openclaw.log
fi

echo ""
echo "══════════════════════════════════════════════════════════"
ok "Listo. Inicia el relay: node ~/whatsapp-relay.js"
