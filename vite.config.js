import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        react({
            jsxRuntime: 'automatic',
        }),
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'],
            refresh: true,
        }),
        tailwindcss(),
    ],
    resolve: {
        extensions: ['.js', '.jsx', '.json'],
    },
    optimizeDeps: {
        force: true,
    },
    build: {
        manifest: true,
        outDir: 'public/build',
    },
    server: {
        host: '0.0.0.0',
        port: 5173,
        cors: {
            origin: 'http://localhost:8000',
            credentials: true,
        },
        hmr: {
            host: process.env.VITE_HMR_HOST || 'localhost',
            port: 5173,
        },
        watch: {
            usePolling: true,
        },
    },
});
