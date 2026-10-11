import { defineConfig } from 'vite';

export default defineConfig({
    base: './',
    server: {
        port: 8080,
        strictPort: true,
    },
    build: {
        target: 'es2020',
    },
});
