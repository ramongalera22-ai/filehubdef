#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# FILEHUB — Auto-Contactar Caseros BCN
# Herramienta autónoma para OpenClaw bot
# Busca pisos en portales inmobiliarios y contacta caseros
# ═══════════════════════════════════════════════════════════════════

MENSAJE='Me pongo en contacto con usted tras ver el anuncio de su vivienda, por la que estamos muy interesados. Somos una pareja de médicos que buscamos un hogar tranquilo y bien comunicado en Barcelona. Ella trabaja como facultativa en el Hospital Universitario Vall d'\''Hebron, y él es facultativo especialista con incorporación próxima a la ciudad. Nuestros ingresos conjuntos superan los 5.000 € netos mensuales, acreditables mediante nóminas y contratos en vigor. Somos personas responsables, no fumadores y sin mascotas. Al trabajar ambos en el ámbito sanitario, valoramos especialmente el silencio, el descanso y el buen mantenimiento de la vivienda. Tenemos disponibilidad inmediata para realizar una visita y podemos aportar toda la documentación necesaria para formalizar el alquiler si nuestro perfil es de su interés. Quedamos a su disposición en este medio, por teléfono en el 679 888 148, o en el correo: carlosgalera2roman@gmail.com Atentamente. Carlos Galera Román'

PHONE="+34679888148"
EMAIL="carlosgalera2roman@gmail.com"
NAME="Carlos Galera Román"
WA_SERVER="https://whatsapp-filehub-production.up.railway.app"

WORKSPACE="$HOME/.openclaw/workspace/filehubdef"
DATA_DIR="$WORKSPACE/pisos_bot/data"
LOG_DIR="$WORKSPACE/pisos_bot/logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$DATA_DIR" "$LOG_DIR"

echo "╔══════════════════════════════════════════════════════╗"
echo "║  🏠 FILEHUB — Auto-Contactar Caseros BCN            ║"
echo "║  $(date '+%Y-%m-%d %H:%M:%S')                        ║"
echo "╚══════════════════════════════════════════════════════╝"

# ═══ FUNCIÓN: Enviar por WhatsApp ═══
send_wa() {
    local msg="$1"
    curl -s -X POST "$WA_SERVER/send" \
        -H "Content-Type: application/json" \
        -d "{\"phone\":\"34679888148\",\"message\":\"$msg\"}" \
        --max-time 10 > /dev/null 2>&1
}

# ═══ FUNCIÓN: Contactar casero via server ═══
contact_landlord() {
    local url="$1"
    local result=$(curl -s -X POST "$WA_SERVER/contact-landlord" \
        -H "Content-Type: application/json" \
        -d "{\"url\":\"$url\",\"message\":\"$MENSAJE\",\"name\":\"$NAME\",\"email\":\"$EMAIL\",\"phone\":\"679888148\"}" \
        --max-time 30 2>/dev/null)
    echo "$result"
}

# ═══ INSTRUCCIONES PARA OPENCLAW ═══
cat << 'OPENCLAW_INSTRUCTIONS'

═══ INSTRUCCIONES PARA EL AGENTE OPENCLAW ═══

Eres un agente autónomo de búsqueda de pisos. Ejecuta TODAS las tareas en orden.

🔍 TAREA 1: BUSCAR PISOS EN 5 PORTALES

Criterios estrictos:
- Barcelona ciudad
- 850-1400 €/mes
- LARGA DURACIÓN (no temporal/vacacional)  
- SIN AMUEBLAR preferiblemente
- Pisos COMPLETOS (no estudios, no habitaciones, no lofts)
- Mínimo 35m², no planta baja
- Cerca metro L3/L5 (Horta-Guinardó, Gràcia, Eixample, Sagrada Família)
- EXCLUIR: El Raval, La Mina
- Preferencia: terraza/balcón, ascensor, A/C

Navega a cada portal, acepta cookies, extrae pisos:

1. https://www.idealista.com/alquiler-viviendas/barcelona/horta-guinardo/con-precio-hasta_1400,precio-desde_850,de-dos-dormitorios,de-tres-dormitorios/
2. https://www.idealista.com/alquiler-viviendas/barcelona/gracia/con-precio-hasta_1400,precio-desde_850,de-dos-dormitorios,de-tres-dormitorios/
3. https://www.idealista.com/alquiler-viviendas/barcelona/eixample/con-precio-hasta_1400,precio-desde_850,de-dos-dormitorios,de-tres-dormitorios/
4. https://www.fotocasa.es/es/alquiler/viviendas/barcelona-capital/todas-las-zonas/l?minPrice=850&maxPrice=1400&minRooms=2
5. https://www.habitaclia.com/alquiler-pisos-barcelona.htm?precioMin=850&precioMax=1400

📧 TAREA 2: CONTACTAR CADA CASERO

Para CADA piso que cumpla los criterios:
1. Haz clic en el anuncio para ver la ficha completa
2. Busca el botón "Contactar", "Enviar mensaje", "Email", "Chat" o formulario
3. Rellena el formulario con:
   - Nombre: Carlos Galera Román
   - Email: carlosgalera2roman@gmail.com
   - Teléfono: 679888148
   - Mensaje: (el mensaje completo de abajo)
4. Acepta términos si los pide
5. Pulsa Enviar
6. Espera 15-20 segundos entre cada contacto (anti-bot)

MENSAJE PARA CASEROS:
Me pongo en contacto con usted tras ver el anuncio de su vivienda, por la que estamos muy interesados. Somos una pareja de médicos que buscamos un hogar tranquilo y bien comunicado en Barcelona. Ella trabaja como facultativa en el Hospital Universitario Vall d'Hebron, y él es facultativo especialista con incorporación próxima a la ciudad. Nuestros ingresos conjuntos superan los 5.000 € netos mensuales, acreditables mediante nóminas y contratos en vigor. Somos personas responsables, no fumadores y sin mascotas. Al trabajar ambos en el ámbito sanitario, valoramos especialmente el silencio, el descanso y el buen mantenimiento de la vivienda. Tenemos disponibilidad inmediata para realizar una visita y podemos aportar toda la documentación necesaria para formalizar el alquiler si nuestro perfil es de su interés. Quedamos a su disposición en este medio, por teléfono en el 679 888 148, o en el correo: carlosgalera2roman@gmail.com Atentamente. Carlos Galera Román

📱 TAREA 3: ENVIAR RESUMEN POR WHATSAPP

Cuando termines, envía por WhatsApp al +34679888148:
- Total pisos encontrados
- Cuántos caseros contactados
- Lista de los 15 mejores con título, precio, m², URL
- Errores si los hubo

💾 TAREA 4: GUARDAR RESULTADOS

Guarda en ~/.openclaw/workspace/filehubdef/pisos_bot/data/contactos_FECHA.json:
{
  "fecha": "2026-03-27",
  "pisos_encontrados": N,
  "caseros_contactados": N,
  "pisos": [
    {"titulo": "...", "precio": N, "m2": N, "zona": "...", "url": "...", "portal": "idealista", "contactado": true/false, "metodo": "formulario/email/fallback"}
  ]
}

OPENCLAW_INSTRUCTIONS

echo ""
echo "🚀 Lanzando búsqueda y contacto automático..."
echo "📅 $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Notificar inicio por WA
send_wa "🏠 *Auto-contacto caseros iniciado*\n📅 $(date '+%Y-%m-%d %H:%M')\n🔍 Buscando pisos BCN 850-1400€ en 5 portales\n📧 Contactando caseros automáticamente"

echo "✅ Herramienta lista. El agente OpenClaw ejecutará las instrucciones."
echo ""
echo "Para ejecutar manualmente:"
echo "  openclaw agent --to $PHONE --channel whatsapp --deliver --message \"\$(cat $WORKSPACE/pisos_bot/auto_contactar.sh)\""
echo ""
echo "Para ejecutar via cron (cada 2 horas):"
echo "  0 */2 * * * $WORKSPACE/pisos_bot/auto_contactar.sh >> $LOG_DIR/cron.log 2>&1"
