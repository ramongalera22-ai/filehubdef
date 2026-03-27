#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# FILEHUB — Lanzar Auto-Contacto via OpenClaw
# Uso: bash run_contactar.sh
# Cron: 0 8,13,19 * * * bash ~/.openclaw/workspace/filehubdef/pisos_bot/run_contactar.sh
# ═══════════════════════════════════════════════════════════════

WORKSPACE="$HOME/.openclaw/workspace/filehubdef"
SCRIPT="$WORKSPACE/pisos_bot/auto_contactar.py"
LOG="$WORKSPACE/pisos_bot/logs/contactar_$(date +%Y%m%d_%H%M).log"

echo "🏠 FILEHUB Auto-Contactar — $(date '+%Y-%m-%d %H:%M:%S')" | tee "$LOG"

# Método 1: Ejecutar Python directamente (si Selenium disponible)
if command -v python3 &> /dev/null; then
    echo "🐍 Ejecutando auto_contactar.py..." | tee -a "$LOG"
    python3 "$SCRIPT" 2>&1 | tee -a "$LOG"
    exit $?
fi

# Método 2: Usar OpenClaw agent con browser
echo "🤖 Lanzando OpenClaw agent..." | tee -a "$LOG"

openclaw agent \
  --to +34679888148 \
  --channel whatsapp \
  --deliver \
  --message "Eres un agente de búsqueda de pisos. Ejecuta TODAS las tareas:

=== TAREA 1: BUSCAR PISOS ===
Navega con el browser a estos portales y extrae pisos de 850-1400€ en Barcelona (larga duración, sin amueblar, 2+ hab, >35m², no Raval):

1. https://www.idealista.com/alquiler-viviendas/barcelona/horta-guinardo/con-precio-hasta_1400,precio-desde_850,de-dos-dormitorios,de-tres-dormitorios/
2. https://www.idealista.com/alquiler-viviendas/barcelona/gracia/con-precio-hasta_1400,precio-desde_850,de-dos-dormitorios/
3. https://www.idealista.com/alquiler-viviendas/barcelona/eixample/con-precio-hasta_1400,precio-desde_850,de-dos-dormitorios/
4. https://www.fotocasa.es/es/alquiler/viviendas/barcelona-capital/todas-las-zonas/l?minPrice=850&maxPrice=1400&minRooms=2
5. https://www.habitaclia.com/alquiler-pisos-barcelona.htm?precioMin=850&precioMax=1400

=== TAREA 2: CONTACTAR CASEROS ===
Para CADA piso, haz clic en el anuncio, busca el formulario de contacto, y rellena:
- Nombre: Carlos Galera Román
- Email: carlosgalera2roman@gmail.com
- Teléfono: 679888148
- Mensaje: Me pongo en contacto con usted tras ver el anuncio de su vivienda, por la que estamos muy interesados. Somos una pareja de médicos que buscamos un hogar tranquilo y bien comunicado en Barcelona. Ella trabaja como facultativa en el Hospital Universitario Vall d'Hebron, y él es facultativo especialista con incorporación próxima a la ciudad. Nuestros ingresos conjuntos superan los 5.000 euros netos mensuales, acreditables mediante nóminas y contratos en vigor. Somos personas responsables, no fumadores y sin mascotas. Al trabajar ambos en el ámbito sanitario, valoramos especialmente el silencio, el descanso y el buen mantenimiento de la vivienda. Tenemos disponibilidad inmediata para realizar una visita y podemos aportar toda la documentación necesaria para formalizar el alquiler si nuestro perfil es de su interés. Quedamos a su disposición en este medio, por teléfono en el 679 888 148, o en el correo: carlosgalera2roman@gmail.com Atentamente. Carlos Galera Román.
Espera 20 segundos entre cada contacto.

=== TAREA 3: RESUMEN ===
Envía por WhatsApp: total pisos, caseros contactados, lista de los 15 mejores.

=== TAREA 4: GUARDAR ===
Guarda en ~/.openclaw/workspace/filehubdef/pisos_bot/data/dashboard.json" 2>&1 | tee -a "$LOG"
