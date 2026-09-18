import { NavLink } from 'react-router-dom'
import { useT } from '../i18n'
import { useLiquidGlass } from '../hooks/useLiquidGlass'
import { Icon } from './Icon'

// 主 tab：手机底部导航 / 平板侧边栏顶部
const TABS = [
  { to: '/', icon: 'home', key: 'nav.home', end: true },
  { to: '/search', icon: 'search', key: 'nav.search', end: false },
  { to: '/me', icon: 'user', key: 'nav.me', end: false },
]

// 次级导航：仅平板侧边栏显示（iPadOS Music 风格），手机隐藏
const MORE_TABS = [
  { to: '/my-playlists', icon: 'list', key: 'nav.myPlaylists', end: false },
  { to: '/favorites', icon: 'heart', key: 'nav.favorites', end: false },
  { to: '/uploads', icon: 'upload', key: 'nav.uploads', end: false },
  { to: '/settings', icon: 'sliders', key: 'nav.settings', end: false },
]

function TabLink({ to, icon, keyText, end }: { to: string; icon: string; keyText: string; end: boolean }) {
  const t = useT()
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}
    >
      <Icon name={icon} size={24} />
      <span>{t(keyText)}</span>
    </NavLink>
  )
}

export function TabBar() {
  const glassRef = useLiquidGlass<HTMLElement>()
  return (
    <nav className="tabbar" ref={glassRef}>
      {TABS.map((tab) => (
        <TabLink key={tab.to} to={tab.to} icon={tab.icon} keyText={tab.key} end={tab.end} />
      ))}
      <div className="tabbar-more">
        {MORE_TABS.map((tab) => (
          <TabLink key={tab.to} to={tab.to} icon={tab.icon} keyText={tab.key} end={tab.end} />
        ))}
      </div>
    </nav>
  )
}
