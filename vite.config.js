import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * WebLLM `cleanModelUrl()` always appends `resolve/main/` to `ModelRecord.model`.
 * Local weights live in `public/models/<id>/bin/` (flat). Rewrite HF-style URLs to real files.
 * @returns {import('vite').Plugin}
 */
function webllmLocalModelBinRewrite() {
  const rewrite = (req) => {
    const raw = req.url ?? '';
    const [pathname, ...restQuery] = raw.split('?');
    const query = restQuery.length ? `?${restQuery.join('?')}` : '';
    const m = pathname.match(/^(\/models\/[^/]+\/bin)\/resolve\/main\/(.*)$/);
    if (m) {
      req.url = `${m[1]}/${m[2]}${query}`;
    }
  };
  return {
    name: 'webllm-local-model-bin-resolve-rewrite',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        rewrite(req);
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        rewrite(req);
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  return {
    plugins: [
      webllmLocalModelBinRewrite(),
      react({
        babel: {
          plugins: [['babel-plugin-react-compiler']],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
      extensions: ['.js', '.ts', '.jsx', '.tsx', '.json'],
    },
    server: {
      port: 3000,
      open: true,
      strictPort: false,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
          },
        },
      },
    },
    css: {
      modules: {
        generateScopedName:
          mode === 'development' ? '[name]__[local]__[hash:base64:5]' : '[hash:base64:8]',
      },
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/styles/variables.scss";`,
        },
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    },
  };
});
