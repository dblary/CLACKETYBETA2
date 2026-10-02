import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    watch: {
      ignored: ['**/*.glb', '**/.tmp*', '**/dist/**', '**/*.png', '**/tmp*']
    }
  }
});
