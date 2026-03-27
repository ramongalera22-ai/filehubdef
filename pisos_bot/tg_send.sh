#!/bin/bash
# Enviar mensaje por Telegram — canal principal FILEHUB
TOKEN="8779418734:AAE63RPFNRulPy4ZvtL8L0iZROsnKRf69kk"
CHAT_ID="596831448"
MSG="$1"
if [ -z "$MSG" ]; then MSG=$(cat); fi
curl -s -X POST "https://api.telegram.org/bot${TOKEN}/sendMessage" \
    -d "chat_id=${CHAT_ID}" \
    -d "text=${MSG}" \
    --max-time 15 > /dev/null 2>&1
