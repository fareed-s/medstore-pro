import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // App-wide aesthetic upgrade: every `import ... from 'react-toastify'`
      // resolves to a SweetAlert2-backed shim instead. The shim covers the
      // exact surface the codebase uses (toast.success/error/warning/info +
      // <ToastContainer />) so no per-file edits are required.
      // Regex form ensures we only match the bare package — sub-imports like
      // `react-toastify/dist/ReactToastify.css` still hit the real package.
      { find: /^react-toastify$/, replacement: path.resolve(__dirname, './src/utils/swal-shim.js') },
    ],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // Static files served by Express (avatars, store logos, etc.) live
      // under /uploads — proxy them too so <img src="/uploads/..."> works.
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
