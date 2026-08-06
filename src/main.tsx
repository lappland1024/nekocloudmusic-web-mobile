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
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
