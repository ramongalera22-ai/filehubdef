# FILEHUB 2

Dashboard personal con integración bidireccional Telegram + WhatsApp.

## 🌐 URL
**https://ramongalera22-ai.github.io/filehub-2/**

## ✨ Funcionalidades

- **Dashboard General** — Stats, eventos, últimos mensajes de bots
- **Chat Telegram** — Bidireccional con tu bot. Envía y recibe comandos
- **Chat WhatsApp** — Canal WA sincronizado. Resultados aparecen en el dashboard
- **Finanzas** — Balance, ingresos, gastos
- **Guardias** — Gestión de guardias médicas
- **Objetivos** — Seguimiento de metas
- **Cursos** — Listado de formación
- **Pisos** — Búsqueda de pisos (se añaden desde Telegram con /piso)

## 🤖 Comandos Telegram

```
/help          — Ver todos los comandos
/resumen       — Estado general del dashboard
/guardia 15 UCI 08:00-08:00+1
/evento 10:00 Reunión equipo
/gasto 50 Supermercado
/ingreso 1500 Nómina
/objetivo Estudiar ECO
/piso Calle Mayor 5 — 3hab 800€
/balance       — Ver balance económico
/guardias      — Ver todas las guardias
/objetivos     — Ver todos los objetivos
/pisos         — Ver pisos guardados
```

## 📱 WhatsApp

Los mensajes de WhatsApp se sincronizan automáticamente a través del bot de Telegram. 
Los resultados de búsquedas aparecen tanto en la pestaña WhatsApp como en el Dashboard General.

## 🚀 Deploy

Auto-desplegado en GitHub Pages via GitHub Actions en cada push a `main`.
