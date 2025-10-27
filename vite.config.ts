import { defineConfig } from 'vite';
import eslint from 'vite-plugin-eslint';
import prettier from 'vite-plugin-prettier';

export default defineConfig({
  plugins: [eslint(), prettier()],
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Use unique names so multiple chunks don't overwrite each other
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
