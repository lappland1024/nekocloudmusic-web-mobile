import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { avatarUrl, getMyPlaylists, uploadAvatar } from '../api'
import { apiUrl } from '../api/client'
import { useAuth } from '../store/auth'
import { useToast } from '../store/ui'
import { useT, fmtDate } from '../i18n'
import { Logo } from '../components/Logo'
import { Icon } from '../components/Icon'

export function Me() {
  const t = useT()
  const navigate = useNavigate()
  const user = useAuth((s) => s.user)
  const token = useAuth((s) => s.token)
  const logout = useAuth((s) => s.logout)
  const toast = useToast((s) => s.toast)
  const askConfirm = useToast((s) => s.askConfirm)

  const [isVip, setIsVip] = useState(false)
  const [vipExpiresAt, setVipExpiresAt] = useState<string | null>(null)
  const [avatarStamp, setAvatarStamp] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!token) return
    getMyPlaylists()
      .then((r) => {
        setIsVip(!!r.isVip)
        setVipExpiresAt(r.vipExpiresAt ?? null)
      })
      .catch(() => {})
  }, [token])

  const onPickAvatar = (f: File | null) => {
    if (!f) return
    if (f.size > 10 * 1024 * 1024) {
      toast('me.avatarSize', 'info')
      return
    }
    uploadAvatar(f)
      .then(() => {
        toast('me.avatarUploaded', 'success')
        setAvatarStamp(Date.now())
      })
      .catch((e) => toast(String((e as Error).message), 'error'))
  }

  const menu: { key: string; icon: string; to: string }[] = [
    { key: 'vip.title', icon: 'crown', to: '/vip' },
    { key: 'me.favorites', icon: 'heart', to: '/favorites' },
    { key: 'me.myPlaylists', icon: 'list', to: '/my-playlists' },
    { key: 'me.uploads', icon: 'upload', to: '/uploads' },
    { key: 'me.settings', icon: 'sliders', to: '/settings' },
  ]

  if (!token || !user) {
    return (
      <div className="page">
        <div className="me-login-hero">
          <Logo size={110} />
          <h2 className="me-hero-title">{t('me.notLogin')}</h2>
          <p className="me-hero-sub">{t('me.loginPrompt')}</p>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/auth')}>
            <Icon name="chevronRight" size={18} />
            {t('auth.toLogin')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="me-header">
        <button className="me-avatar" onClick={() => fileRef.current?.click()} aria-label={t('me.avatarChange')}>
          <img
            key={avatarStamp}
            src={`${apiUrl(avatarUrl(user.id))}?t=${avatarStamp}`}
            alt=""
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
              ;(e.currentTarget.parentElement!.querySelector('.me-avatar-fallback') as HTMLElement).style.display =
                'flex'
            }}
            onLoad={(e) => {
              // 头像加载成功后复位 fallback（之前失败时可能被置为 flex，会与图片叠加）
              const fb = e.currentTarget.parentElement!.querySelector('.me-avatar-fallback') as HTMLElement | null
              if (fb) fb.style.display = ''
            }}
          />
          <span className="me-avatar-fallback">
            <Logo size={56} />
          </span>
          <span className="me-avatar-edit">
            <Icon name="edit" size={14} />
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => onPickAvatar(e.target.files?.[0] ?? null)}
        />
        <div className="me-id">
          <h2 className="me-username truncate">{user.username}</h2>
          <span className={`me-vip ${isVip ? 'is-vip' : ''}`}>
            <Icon name="crown" size={14} />
            {isVip ? t('me.vip') : t('me.notVip')}
          </span>
        </div>
        {isVip && vipExpiresAt && (
          <p className="me-vip-until">{t('me.vipUntil', { date: fmtDate(vipExpiresAt) })}</p>
        )}
      </div>

      {/* 会员中心入口 */}
      <button className="me-vip-card" onClick={() => navigate('/vip')}>
        <span className="me-vip-card-icon">
          <Icon name="crown" size={20} />
        </span>
        <span className="me-vip-card-label">{t('vip.title')}</span>
        {isVip && vipExpiresAt && (
          <span className="me-vip-card-sub">{t('vip.expires', { date: fmtDate(vipExpiresAt) })}</span>
        )}
        <Icon name="chevronRight" size={18} className="me-menu-arrow" />
      </button>

      <div className="me-menu">
        {menu.map((m) => (
          <button key={m.key} className="me-menu-row" onClick={() => navigate(m.to)}>
            <span className="me-menu-icon">
              <Icon name={m.icon} size={20} />
            </span>
            <span className="me-menu-label">{t(m.key)}</span>
            <Icon name="chevronRight" size={18} className="me-menu-arrow" />
          </button>
        ))}
        <button
          className="me-menu-row danger"
          onClick={() =>
            askConfirm({
              text: t('auth.logoutConfirm'),
              danger: true,
              okText: t('auth.logout'),
              onOk: () => {
                logout()
                navigate('/', { replace: true })
              },
            })
          }
        >
          <span className="me-menu-icon">
            <Icon name="logout" size={20} />
          </span>
          <span className="me-menu-label">{t('auth.logout')}</span>
          <Icon name="chevronRight" size={18} className="me-menu-arrow" />
        </button>
      </div>
    </div>
  )
}
