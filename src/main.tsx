import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

// 提前套用持久化的主题，避免首帧闪色（zustand persist key: neko-theme）
try {
  const saved = JSON.parse(localStorage.getItem('neko-theme') ?? 'null') as {
    state?: { theme?: string; style?: string; mode?: string }
  } | null
  const st = saved?.state
  let style: string | undefined
  let mode: string | undefined
  if (st?.theme) {
    // 旧格式迁移：dark/light/ios
    style = st.theme === 'ios' ? 'ios' : 'neko'
    mode = st.theme === 'ios' ? 'system' : st.theme
  } else {
    style = st?.style
    mode = st?.mode
  }
  if (
    (style === 'neko' || style === 'ios' || style === 'apple') &&
    (mode === 'light' || mode === 'dark' || mode === 'system')
  ) {
    const m = mode === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : mode
    document.documentElement.dataset.theme = `${style}-${m}`
  }
} catch {
  /* 忽略损坏的本地存储 */
}

// PWA：检测到新版本时自动刷新（缓存优先，音乐文件走运行时缓存策略）
const updateSW = registerSW({ immediate: true })

if ('serviceWorker' in navigator) {
  // 1) 新 Service Worker 激活接管时立刻刷新页面，否则已打开的页面会一直停留在旧版本
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })

  // 2) SPA 内部路由（pushState）不会触发浏览器对 sw.js 的更新检查，
  //    导致不刷新页面就永远看不到新版本。这里在「回到前台」和「定时」
  //    两个时机主动检查更新，发现新版立即接管并自动刷新。
  const check = () => updateSW()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check()
  })
  setInterval(check, 60 * 60 * 1000)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
