
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '') || {};
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: ['filehub-casa.duckdns.org', 'app-3005-dxp2800-8e1a-o128.eur11.ugdocker.link'],
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || '')
    },
    resolve: {
      alias: {
        '@': path.resolve('.'),
      }
    },

    // ============================================
    // OPTIMIZACIÓN 1: BUILD & BUNDLE SPLITTING
    // ============================================
    build: {
      // Target navegadores modernos para bundles más pequeños
      target: 'es2020',
      
      // Aumentar límite de warning (tu app es grande)
      chunkSizeWarningLimit: 600,
      
      // Habilitar source maps solo en dev
      sourcemap: mode === 'development',

      rollupOptions: {
        output: {
          // Code splitting manual - separa vendors pesados
          manualChunks: {
            // React core (cambia poco, se cachea bien)
            'vendor-react': ['react', 'react-dom'],
            
            // Recharts es pesado (~200KB) - solo lo usan Dashboard, Economy, Monthly
            'vendor-charts': ['recharts'],
            
            // Supabase client
            'vendor-supabase': ['@supabase/supabase-js'],
            
            // Gemini AI SDK
            'vendor-ai': ['@google/genai'],
            
            // Lucide icons (tree-shaken pero aún grande)
            'vendor-icons': ['lucide-react'],
          },

          // Nombres con hash para cache busting
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        },
      },

      // Minificación agresiva
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production', // Elimina console.log en prod
          drop_debugger: true,
          pure_funcs: mode === 'production' ? ['console.log', 'console.info'] : [],
        },
      },

      // CSS code splitting
      cssCodeSplit: true,
    },

    // ============================================
    // OPTIMIZACIÓN 2: DEP PRE-BUNDLING
    // ============================================
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'recharts',
        '@supabase/supabase-js',
        'lucide-react',
      ],
    },
  };
});
