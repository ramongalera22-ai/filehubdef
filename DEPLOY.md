# 🚀 FILEHUB — Guía de Despliegue

## Arquitectura

```
┌─────────────────────────────────────────────┐
│  GitHub Pages (HTTPS)                       │
│  https://ramongalera22-ai.github.io/filehubdef │
│  ├── Frontend React (build estático)        │
│  ├── PWA + Service Worker                   │
│  └── Auto-deploy via GitHub Actions         │
├─────────────────────────────────────────────┤
│  Supabase (Backend gratuito)                │
│  ├── Auth (email/password)                  │
│  ├── PostgreSQL (20 tablas con RLS)         │
│  ├── Realtime subscriptions                 │
│  └── Row Level Security (datos por usuario) │
├─────────────────────────────────────────────┤
│  Gemini AI (opcional)                       │
│  └── Escaneo inteligente de documentos      │
└─────────────────────────────────────────────┘
```

## Paso 1: Configurar Supabase (5 min)

1. Ve a **https://supabase.com** → Sign up (gratis)
2. Click **New Project**
   - Name: `filehub`
   - Database Password: (guárdala)
   - Region: **EU West** (más cercano a España)
3. Una vez creado, ve a **SQL Editor** → **New query**
4. Copia todo el contenido de `supabase/schema.sql` y ejecútalo
5. Ve a **Settings → API** y copia:
   - `Project URL` → será tu `VITE_SUPABASE_URL`
   - `anon public` key → será tu `VITE_SUPABASE_ANON_KEY`

## Paso 2: Configurar GitHub Secrets (2 min)

1. Ve a tu repo → **Settings → Secrets and variables → Actions**
2. Añade estos 3 secrets:

| Secret | Valor |
|--------|-------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOi...` |
| `GEMINI_API_KEY` | Tu API key de Google AI Studio (opcional) |

## Paso 3: Activar GitHub Pages (1 min)

1. Ve a tu repo → **Settings → Pages**
2. Source: **GitHub Actions**
3. Eso es todo — el workflow ya está configurado

## Paso 4: Desplegar (automático)

Cada vez que hagas push a `main`, GitHub Actions:
1. Instala dependencias
2. Compila con Vite (inyectando tus secrets)
3. Despliega a GitHub Pages

Tu app estará en:
**https://ramongalera22-ai.github.io/filehubdef**

## Paso 5 (opcional): Dominio personalizado

Si quieres un dominio propio (ej: `filehub.tudominio.com`):

1. En tu proveedor DNS, añade un CNAME:
   ```
   filehub.tudominio.com → ramongalera22-ai.github.io
   ```
2. En GitHub → Settings → Pages → Custom domain → `filehub.tudominio.com`
3. Marca **Enforce HTTPS**

---

## Seguridad

- ✅ **HTTPS** automático en GitHub Pages
- ✅ **RLS** (Row Level Security) — cada usuario solo ve sus datos
- ✅ **Auth** — Supabase maneja tokens JWT
- ✅ **Secrets** — las API keys NO están en el código, solo en GitHub Secrets
- ✅ **Headers de seguridad** — X-Frame-Options, X-Content-Type-Options, XSS-Protection

## Persistencia de datos

Todos los datos se guardan en Supabase PostgreSQL:
- 20 tablas con esquema completo
- Índices optimizados para queries frecuentes
- Backup automático (plan gratuito: 7 días)
- Los datos persisten aunque se redespliegue el frontend

## Desarrollo local

```bash
cp .env.example .env
# Editar .env con tus claves
npm install
npm run dev
# → http://localhost:3000
```
