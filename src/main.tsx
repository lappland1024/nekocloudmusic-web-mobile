import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
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

// 缓存已全面禁用：主动注销任何历史 Service Worker 并清空 Cache Storage。
// 老用户此前装过 SW，若不清理会被旧缓存永久困住（"更新了也没用"）。
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((rs) => rs.forEach((r) => void r.unregister()))
    .catch(() => {})
}
if ('caches' in window) {
  caches
    .keys()
    .then((keys) => keys.forEach((k) => void caches.delete(k)))
    .catch(() => {})
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
