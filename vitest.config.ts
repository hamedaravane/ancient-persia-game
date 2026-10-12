import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
    viteConfig,
    defineConfig({
        test: {
            environment: 'node',
            include: ['tests/**/*.test.ts'],
            globals: false,
            clearMocks: true,
            restoreMocks: true,
            unstubEnvs: true,
            unstubGlobals: true,
        },
    }),
);
