import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      // Copy manifest + icons into dist after build
      name: 'copy-extension-assets',
      closeBundle() {
        mkdirSync('dist/icons', { recursive: true });
        copyFileSync('manifest.json', 'dist/manifest.json');
        ['16', '48', '128'].forEach(s =>
          copyFileSync(`public/icons/${s}.png`, `dist/icons/${s}.png`)
        );
      },
    },
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/content.tsx'),
      output: {
        format: 'iife',
        entryFileNames: 'content.js',
        // Inline all assets (CSS gets injected via JS into shadow DOM)
        assetFileNames: '[name][extname]',
        inlineDynamicImports: true,
      },
    },
    // Don't minify so errors are readable during dev
    minify: false,
    sourcemap: false,
    cssCodeSplit: false,
  },
});
