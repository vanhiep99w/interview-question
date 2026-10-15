import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Inspect dist/.vite/manifest.json after building.
    manifest: true,
    sourcemap: false,
  },
});
