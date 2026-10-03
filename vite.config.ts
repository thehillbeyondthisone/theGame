import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig } from 'vite';

// `npm run dev` serves over HTTPS on your local network so a headset on the same
// Wi-Fi can open it. WebXR needs a secure context, and the certificate is
// self-signed, so each browser asks you to accept it once.
// `npm run dev:local` is plain http://localhost for desktop-only work.
export default defineConfig(({ command, mode }) => {
  const lan = mode !== 'localhost';
  const host = lan ? true : 'localhost';
  return {
    plugins: command === 'serve' && lan ? [basicSsl()] : [],
    // precog/ is a separate app nested in this folder: keep this server from
    // crawling its index.html for dependencies or watching its files.
    optimizeDeps: { entries: ['index.html'] },
    server: { host, port: lan ? 5173 : 5174, strictPort: true, watch: { ignored: ['**/precog/**'] } },
    preview: { host, port: 4173, strictPort: true },
    // Separate dependency caches so the LAN and local servers can run side by side.
    cacheDir: lan ? 'node_modules/.vite' : 'node_modules/.vite-local',
    build: {
      target: 'es2022',
      sourcemap: true,
      // three.js alone is ~550 KB minified; the real budgets live in `npm run size`.
      chunkSizeWarningLimit: 800,
    },
  };
});
