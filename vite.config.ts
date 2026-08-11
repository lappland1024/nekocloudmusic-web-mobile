import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // 挂代理（或用域名/隧道）访问时，Host 头与 localhost 不一致，
  // Vite 默认会以 403「Blocked request. This host is not allowed」拦截。
  // 这里放开 Host 白名单，代理环境下才能正常打开本地站点。
  server: { allowedHosts: true },
  preview: { allowedHosts: true },
  plugins: [
    react(),
    VitePWA({
      // 彻底禁用缓存：生成"自毁"Service Worker——已安装过 SW 的客户端拉到它后
      // 会自动注销自身并清空所有 Cache Storage，之后不再有任何离线缓存。
      // manifest 仍然生成，"添加到主屏"/standalone 显示不受影响（iOS 不依赖 SW）。
      selfDestroying: true,
      registerType: 'autoUpdate',
      injectRegister: null,
      includeAssets: [
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/icon-maskable-512.png',
        'icons/apple-touch-icon-180.png',
      ],
      manifest: {
        name: 'Neko歌姬计划',
        short_name: 'NekoMusic',
        description:
          'Neko歌姬计划 移动端 Web 版 —— 在线音乐搜索、播放、歌单与账号服务',
        lang: 'zh-CN',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#16121c',
        theme_color: '#16121c',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      // selfDestroying 模式下不做任何预缓存 / 运行时缓存
    }),
  ],
})
