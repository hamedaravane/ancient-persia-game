import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    base: './',
    plugins: [
        VitePWA({
            registerType: 'prompt',
            // The game owns registration and reloads, including other open tabs.
            injectRegister: null,
            includeManifestIcons: false, // Already covered by the complete PNG precache glob.
            manifest: {
                // Manifest IDs resolve against the origin, independently of the launch path.
                id: '/ancient-persia-game/',
                name: 'ایران باستان',
                short_name: 'ایران باستان',
                description: 'بازی راهبردی محلی با دوستان، در جزیره‌ای از ایران باستان.',
                lang: 'fa',
                dir: 'rtl',
                start_url: './',
                scope: './',
                display: 'standalone',
                orientation: 'portrait-primary',
                theme_color: '#252b2d',
                background_color: '#252b2d',
                categories: ['games'],
                icons: [
                    {
                        src: 'icons/icon-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: 'icons/icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: 'icons/maskable-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
            },
            workbox: {
                cacheId: 'ancient-persia',
                globPatterns: ['**/*.{js,css,html,webp,woff2,png,svg}'],
                maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
                cleanupOutdatedCaches: true,
                clientsClaim: true,
                skipWaiting: false,
            },
        }),
    ],
    server: {
        port: 8080,
        strictPort: true,
    },
    build: {
        target: 'es2020',
    },
});
