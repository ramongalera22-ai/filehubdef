#!/bin/bash
# ═══ FILEHUB — Buscar y enviar ofertas de trabajo médico por Telegram ═══

TOKEN="8779418734:AAE63RPFNRulPy4ZvtL8L0iZROsnKRf69kk"
CHAT_ID="596831448"

tg() {
    curl -s -X POST "https://api.telegram.org/bot${TOKEN}/sendMessage" \
        -d "chat_id=${CHAT_ID}" \
        -d "text=${1}" \
        --max-time 15 > /dev/null 2>&1
}

tg "🏥 OFERTAS MÉDICO BCN — $(date '+%d/%m/%Y %H:%M')

📋 Médico de Familia:

1. CAMFiC — Cobertura MF urgente
   https://camfic.cat/detallOferta.aspx?id=2699

2. CatSalut — Bolsa trabajo MF
   https://catsalut.gencat.cat/ca/coneix-catsalut/presentacio/organitzacio/recursos-humans/ofertes-treball/

3. InfoJobs — Médico familia BCN
   https://www.infojobs.net/ofertas-trabajo/barcelona/medico-de-familia

4. SemFYC — Bolsa MFyC
   https://www.semfyc.es/secciones-y-grupos/seccion-de-desarrollo-profesional/salida-profesional/bolsa-de-trabajo/

💼 Consultor / Telemedicina:

5. LinkedIn — Telemedicina España
   https://es.linkedin.com/jobs/telemedicina-empleos

6. Indeed — Telemedicina
   https://es.indeed.com/q-telemedicina-empleos.html

7. Telemedi — Médico General remoto
   https://apply.workable.com/telemedi/j/1A3F03D40A/

8. Jooble — Médico teletrabajo
   https://es.jooble.org/trabajo-m%C3%A9dico-teletrabajo

📞 679 888 148 | carlosgalera2roman@gmail.com"
