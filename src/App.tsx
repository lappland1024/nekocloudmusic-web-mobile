import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import { useFavorites } from './store/favorites'
import { useAuth } from './store/auth'
import { useAppearance } from './store/appearance'
import { resolveTheme, resolveMode, useTheme } from './store/theme'
import { MiniPlayer } from './components/MiniPlayer'
import { FullPlayer } from './components/FullPlayer'
import { TabBar } from './components/TabBar'
import { ConfirmDialog, ToastHost } from './components/ui'
import { PlaylistPickerSheet, TrackActionSheets } from './components/TrackList'
import { Home } from './pages/Home'
import { Search } from './pages/Search'
import { Playlist } from './pages/Playlist'
import { MyPlaylists } from './pages/MyPlaylists'
import { Favorites } from './pages/Favorites'
import { Uploads } from './pages/Uploads'
import { Artist } from './pages/Artist'
import { MusicDetail } from './pages/MusicDetail'
import { DailyRecs } from './pages/DailyRecs'
import { Me } from './pages/Me'
import { Vip } from './pages/Vip'
import { Settings } from './pages/Settings'
import { Auth } from './pages/Auth'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    // 页面容器自身滚动（整页禁滚），路由切换时滚回顶部
    const p = document.querySelector('.page')
    if (p) p.scrollTop = 0
  }, [pathname])
  return null
}

// 主 Tab 路由：Tab 间切换用轻量淡入，不做 push/pop 滑动
const TAB_PATHS = new Set(['/', '/search', '/me'])

/** 方向感知的路由过渡：push 右滑入 / pop 左滑入 / Tab 淡入（首屏不播动画） */
function AnimatedRoutes() {
  const location = useLocation()
  const navType = useNavigationType() // 'POP' | 'PUSH' | 'REPLACE'
  const [anim, setAnim] = useState<{ dir: 'forward' | 'back' | 'tab' | 'none'; key: number }>({
    dir: 'none',
    key: 0,
  })
  const first = useRef(true)
  const prevPath = useRef(location.pathname)

  useEffect(() => {
    if (first.current) {
      first.current = false
      prevPath.current = location.pathname
      return
    }
    const prev = prevPath.current
    prevPath.current = location.pathname
    if (prev === location.pathname) return
    const dir =
      TAB_PATHS.has(prev) && TAB_PATHS.has(location.pathname)
        ? 'tab'
        : navType === 'POP'
          ? 'back'
          : 'forward'
    setAnim((a) => ({ dir, key: a.key + 1 }))
  }, [location.pathname, navType])

  return (
    <div className="route-view" data-dir={anim.dir} key={anim.key}>
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/playlist/:id" element={<Playlist />} />
        <Route path="/my-playlists" element={<MyPlaylists />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/uploads" element={<Uploads />} />
        <Route path="/artist/:name" element={<Artist />} />
        <Route path="/music/:id" element={<MusicDetail />} />
        <Route path="/daily" element={<DailyRecs />} />
        <Route path="/me" element={<Me />} />
        <Route path="/vip" element={<Vip />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  const token = useAuth((s) => s.token)
  const ensureFavs = useFavorites((s) => s.ensureLoaded)
  const style = useTheme((s) => s.style)
  const mode = useTheme((s) => s.mode)
  const glassOpacity = useTheme((s) => s.glassOpacity)
  const bgUrl = useAppearance((s) => s.bgUrl)
  const bgOpacity = useAppearance((s) => s.bgOpacity)

  useEffect(() => {
    if (token) ensureFavs()
  }, [token, ensureFavs])

  useEffect(() => {
    // 组合出 data-theme（如 neko-dark / ios-light），并同步状态栏主题色
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const m = resolveMode(mode)
      document.documentElement.dataset.theme = resolveTheme(style, mode)
      // 液态玻璃表面不透明度 -> CSS 变量（--glass-alpha）
      document.documentElement.style.setProperty('--glass-alpha', glassOpacity.toFixed(2))
      const metaColor =
        style === 'ios'
          ? (m === 'dark' ? '#000000' : '#f2f2f7')
          : style === 'apple'
            ? (m === 'dark' ? '#000000' : '#ffffff')
            : m === 'dark'
              ? '#16121c'
              : '#f6f0e4'
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', metaColor)
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [style, mode, glassOpacity])

  useEffect(() => {
    // iOS 旋转屏幕 / 尺寸变化后，fixed 元素（全屏播放器等）偶发"渲染偏移"：
    // 布局位置正常但内容被渲染到视口外（头部上移、点不到收起/收藏）。
    // 除强制 reflow 外，再对 fixed 全屏层做一次合成层重置
    // （translateZ(0) → 下一帧移除），强制浏览器按新视口重新合成。
    const refresh = () => {
      requestAnimationFrame(() => {
        void document.body.offsetHeight // 强制 reflow
        document.querySelectorAll('.full-player').forEach((fp) => {
          const el = fp as HTMLElement
          el.style.willChange = 'transform'
          el.style.transform = 'translateZ(0)'
        })
        requestAnimationFrame(() => {
          document.querySelectorAll('.full-player').forEach((fp) => {
            const el = fp as HTMLElement
            el.style.transform = ''
            el.style.willChange = ''
          })
          void document.body.offsetHeight
        })
      })
    }
    window.addEventListener('orientationchange', refresh)
    window.addEventListener('resize', refresh)
    return () => {
      window.removeEventListener('orientationchange', refresh)
      window.removeEventListener('resize', refresh)
    }
  }, [])

  return (
    <BrowserRouter>
      <ScrollToTop />
      {/* 自定义背景（外部图片 URL + 透明度）：固定铺满视口，位于所有内容之下 */}
      {bgUrl && (
        <div
          className="app-bg"
          aria-hidden="true"
          style={{
            // 引号包裹 + 转义双引号，避免 URL 里的特殊字符破坏 url() 语法
            backgroundImage: `url("${bgUrl.replace(/"/g, '%22')}")`,
            opacity: bgOpacity,
          }}
        />
      )}
      {/* shell：手机时退化为块级（TabBar 仍是 fixed 底部）；平板时变为"左栏 + 内容区"两栏 */}
      <div className="shell">
        <TabBar />
        <div className="content">
          <AnimatedRoutes />
          {/* 迷你播放器：手机 fixed 贴底；平板 absolute 对齐内容区底部 */}
          <MiniPlayer />
        </div>
      </div>

      <FullPlayer />
      <ToastHost />
      <ConfirmDialog />
      <TrackActionSheets />
      <PlaylistPickerSheet />
    </BrowserRouter>
  )
}
