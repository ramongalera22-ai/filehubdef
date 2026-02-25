import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load .env files safely
  const env = loadEnv(mode, process.cwd(), '');

  return {
    root: '.',
    publicDir: 'public',

    server: {
      port: 3000,
      host: '0.0.0.0',
      strictPort: false,
      allowedHosts: [
        'filehub-casa.duckdns.org',
        'localhost',
      ],
    },

    plugins: [react()],

    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY ?? ''),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL ?? ''),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY ?? ''),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },

    build: {
      target: 'es2020',
      outDir: 'dist',
      chunkSizeWarningLimit: 600,
      sourcemap: mode === 'development',

      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-charts': ['recharts'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-ai': ['@google/genai'],
            'vendor-icons': ['lucide-react'],
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        },
      },

      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: true,
          pure_funcs: mode === 'production' ? ['console.log', 'console.info'] : [],
        },
      },

      cssCodeSplit: true,
    },

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
