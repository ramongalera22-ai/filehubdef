# ⚡ FILEHUB — Inteligencia de Gestión

Hub personal de gestión todo-en-uno con sincronización cloud, AI integrada y PWA.

## Módulos

| Módulo | Descripción |
|--------|-------------|
| Dashboard | Vista general con stats, gráficos, tareas y agenda |
| Gastos | Control de gastos con categorías y análisis |
| Tareas | Gestión de tareas con prioridades y recurrencia |
| Metas | Seguimiento de objetivos con progreso visual |
| Calendario | Eventos y planificación |
| Fitness | Sesiones de entrenamiento y planes |
| Nutrición | Control de peso y planes nutricionales |
| Trabajo | Proyectos y presentaciones |
| Viajes | Planificación de viajes con presupuesto |
| Compras | Lista de compras y seguimiento de pedidos |
| Ideas | Captura y organización de ideas |
| Archivos | Gestión de documentos con resumen AI |
| AI Hub | Configuración de Ollama y Gemini |
| Finanzas compartidas | Gastos y deudas compartidas |

## Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **Build**: Vite 6 con code splitting y terser
- **Backend**: Supabase (Auth + Database + Realtime)
- **AI**: Google Gemini (escaneo docs) + Ollama (local)
- **Deploy**: Firebase Hosting / Nginx
- **PWA**: Service Worker con cache strategies

## Setup

```bash
# 1. Clonar e instalar
git clone <repo-url>
cd filehub
npm install

# 2. Configurar entorno
cp .env.example .env
# Editar .env con tus claves de Supabase y Gemini

# 3. Desarrollo
npm run dev

# 4. Build producción
npm run build
npm run preview
```

## Despliegue

### Firebase
```bash
npm run build
firebase deploy
```

### Nginx
Copiar `nginx.conf` a tu servidor y servir el directorio `dist/`.

## Optimizaciones

- Lazy loading de todos los módulos (reducción ~75% bundle inicial)
- Carga de datos en paralelo con `Promise.all` (3 batches priorizados)
- `useCallback` / `useMemo` en todos los handlers para evitar re-renders
- Code splitting con chunks separados por vendor
- Tailwind build-time (sin CDN runtime)
- Cache agresivo para assets hasheados
- Service Worker con estrategias por tipo de recurso
