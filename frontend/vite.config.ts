import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react-swc'
import {tanstackRouter} from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import path from "path"


// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        tanstackRouter({
            target: 'react',
            autoCodeSplitting: true,
        }),
        react(),tailwindcss(),
    ],
    resolve: {
        alias: {
            "@main": path.resolve(__dirname, "./bindings/changeme"),
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'index.html'),
                connections: path.resolve(__dirname, 'connections.html'),
            },
        },
    },
})
