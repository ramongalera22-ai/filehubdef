# Telegram Webhook Setup for @Arditi2bot

## Configuración Webhook (Netlify)

### 1. URL del Webhook
```
https://phenomenal-nasturtium-5e1a1d.netlify.app/.netlify/functions/telegram-webhook
```

### 2. Configurar el Webhook en Telegram

Abre tu navegador y visita esta URL para activar el webhook:

```
https://api.telegram.org/bot8466601397:AAG4Ky7-mziSPUQbHtE6G9iyg_Gpc70WLVU/setWebhook?url=https://phenomenal-nasturtium-5e1a1d.netlify.app/.netlify/functions/telegram-webhook
```

### 3. Verificar Webhook

```
https://api.telegram.org/bot8466601397:AAG4Ky7-mziSPUQbHtE6G9iyg_Gpc70WLVU/getWebhookInfo
```

### 4. Comandos Disponibles

- `/start` - Iniciar bot
- `/help` - Ver ayuda
- `/pisos` - Dashboard de pisos
- `/ofertas` - Dashboard de ofertas médico
- `/empleo` - Buscar empleo
- `/resumen` - Resumen diario
- `/cursos` - Ver cursos
- `/status` - Estado del sistema

### 5. Variables de Entorno (Opcional)

En Netlify Dashboard → Site Settings → Environment Variables:
- `TELEGRAM_BOT_TOKEN` = `8466601397:AAG4Ky7-mziSPUQbHtE6G9iyg_Gpc70WLVU`

### 6. Deploy

```bash
git add netlify/functions/telegram-webhook.js
git commit -m "Add Telegram webhook"
git push origin master
```

Netlify deployará automáticamente la función.