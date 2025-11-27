import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  base: '',
  plugins: [
    vue(),
  ],
  server: {
    host: '0.0.0.0',
    port: 51706,
    proxy: {
      '/api': {
        // 开发环境：将 /api/* 反代到线上 Drupal (aigraphmaker.net)
        // 这样 ?type=json&file=/api/viz/cache/... 可以直接访问远程缓存 JSON
        target: 'https://aigraphmaker.net',
        changeOrigin: true,
        // 不做 rewrite，保持 /api/viz/... 结构与线上一致
      }
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
          @import '@/assets/styles/variable.scss';
          @import '@/assets/styles/mixin.scss';
        `
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
