import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { changePassword } from '../api'
import { useAuth } from '../store/auth'
import { useTheme } from '../store/theme'
import { useAppearance } from '../store/appearance'
import { useToast } from '../store/ui'
import { useLang, useT } from '../i18n'
import { Icon } from '../components/Icon'
import { Logo } from '../components/Logo'
import { PageHead } from '../components/ui'

const DOCS_URL = 'https://github.com/FantasyNetworkCN/NekoMusicDocs'
const SOURCE_URL = 'https://github.com/' // 部署前替换为你的仓库地址

export function Settings() {
  const t = useT()
  const navigate = useNavigate()
  const lang = useLang((s) => s.lang)
  const setLang = useLang((s) => s.setLang)
  const style = useTheme((s) => s.style)
  const setStyle = useTheme((s) => s.setStyle)
  const mode = useTheme((s) => s.mode)
  const setMode = useTheme((s) => s.setMode)
  const toast = useToast((s) => s.toast)
  const token = useAuth((s) => s.token)
  const bgUrl = useAppearance((s) => s.bgUrl)
  const bgOpacity = useAppearance((s) => s.bgOpacity)
  const setBgUrl = useAppearance((s) => s.setBgUrl)
  const setBgOpacity = useAppearance((s) => s.setBgOpacity)
  const clearBg = useAppearance((s) => s.clearBg)

  const [bgInput, setBgInput] = useState(bgUrl)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [busy, setBusy] = useState(false)

  const applyBg = () => {
    const u = bgInput.trim()
    if (!u) {
      clearBg()
      toast('appearance.cleared', 'success')
      return
    }
    if (!/^https?:\/\//i.test(u)) {
      toast('appearance.invalidUrl', 'info')
      return
    }
    setBgUrl(u)
    toast('appearance.applied', 'success')
  }

  const submit = async () => {
    if (newPassword.length < 6) {
      toast('auth.passwordLen', 'info')
      return
    }
    if (newPassword !== confirmPw) {
      toast('auth.passwordMismatch', 'info')
      return
    }
    setBusy(true)
    try {
      await changePassword(oldPassword, newPassword)
      toast('settings.passwordChanged', 'success')
      setOldPassword('')
      setNewPassword('')
      setConfirmPw('')
    } catch (e) {
      toast(String((e as Error).message), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <PageHead onBack={() => navigate(-1)} title={t('settings.title')} />

      <section className="list-section">
        <h3 className="list-section-title">{t('me.changePassword')}</h3>
        {token ? (
          <div className="form">
            <label className="field">
              <span>{t('settings.oldPassword')}</span>
              <input className="input" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} autoComplete="current-password" />
            </label>
            <label className="field">
              <span>{t('settings.newPassword')}</span>
              <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
            </label>
            <label className="field">
              <span>{t('auth.confirmPassword')}</span>
              <input className="input" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} autoComplete="new-password" />
            </label>
            <button className="btn btn-primary" onClick={submit} disabled={busy}>
              {t('settings.submit')}
            </button>
          </div>
        ) : (
          <p className="list-empty-note">{t('common.loginRequired')}</p>
        )}
      </section>

      <section className="list-section">
        <h3 className="list-section-title">{t('me.language')}</h3>
        <p className="settings-lang-hint">{t('settings.langHint')}</p>
        <div className="segmented">
          <button className={`seg ${lang === 'zh' ? 'active' : ''}`} onClick={() => setLang('zh')}>
            中文
          </button>
          <button className={`seg ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>
            English
          </button>
        </div>
      </section>

      <section className="list-section">
        <h3 className="list-section-title">{t('settings.style')}</h3>
        <div className="segmented">
          <button
            className={`seg ${style === 'neko' ? 'active' : ''}`}
            onClick={() => setStyle('neko')}
          >
            {t('settings.styleNeko')}
          </button>
          <button
            className={`seg ${style === 'ios' ? 'active' : ''}`}
            onClick={() => setStyle('ios')}
          >
            {t('settings.styleIos')}
          </button>
          <button
            className={`seg ${style === 'apple' ? 'active' : ''}`}
            onClick={() => setStyle('apple')}
          >
            {t('settings.styleApple')}
          </button>
        </div>
      </section>

      <section className="list-section">
        <h3 className="list-section-title">{t('settings.mode')}</h3>
        <div className="segmented">
          <button
            className={`seg ${mode === 'light' ? 'active' : ''}`}
            onClick={() => setMode('light')}
          >
            {t('settings.modeLight')}
          </button>
          <button
            className={`seg ${mode === 'dark' ? 'active' : ''}`}
            onClick={() => setMode('dark')}
          >
            {t('settings.modeDark')}
          </button>
          <button
            className={`seg ${mode === 'system' ? 'active' : ''}`}
            onClick={() => setMode('system')}
          >
            {t('settings.modeSystem')}
          </button>
        </div>
      </section>

      <section className="list-section">
        <h3 className="list-section-title">{t('appearance.title')}</h3>
        <div className="form">
          <label className="field">
            <span>{t('appearance.bgUrl')}</span>
            <input
              className="input"
              type="url"
              inputMode="url"
              value={bgInput}
              onChange={(e) => setBgInput(e.target.value)}
              placeholder={t('appearance.bgUrlPlaceholder')}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <p className="settings-lang-hint">{t('appearance.bgUrlHint')}</p>

          <label className="field">
            <span>
              {t('appearance.opacity')} · {Math.round(bgOpacity * 100)}%
            </span>
            <input
              type="range"
              className="range bg-opacity-range"
              min={0}
              max={100}
              step={1}
              value={Math.round(bgOpacity * 100)}
              onChange={(e) => setBgOpacity(Number(e.target.value) / 100)}
              style={{
                background: `linear-gradient(to right, var(--accent) ${Math.round(bgOpacity * 100)}%, var(--range-track) ${Math.round(bgOpacity * 100)}%)`,
              }}
              aria-label={t('appearance.opacity')}
            />
          </label>

          {bgInput.trim() && /^https?:\/\//i.test(bgInput.trim()) && (
            <div className="bg-preview">
              <img
                src={bgInput.trim()}
                alt={t('appearance.preview')}
                style={{ opacity: bgOpacity }}
                onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')}
                onLoad={(e) => ((e.target as HTMLImageElement).style.visibility = '')}
              />
            </div>
          )}

          <div className="bg-actions">
            <button className="btn btn-primary" onClick={applyBg}>
              {t('appearance.apply')}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setBgInput('')
                clearBg()
                toast('appearance.cleared', 'success')
              }}
              disabled={!bgUrl && !bgInput}
            >
              {t('appearance.clear')}
            </button>
          </div>
        </div>
      </section>

      <section className="list-section">
        <h3 className="list-section-title">{t('me.about')}</h3>
        <div className="about-card">
        <div className="about-brand">
          <Logo size={26} />
          <span>{t('app.name')}</span>
        </div>
          <p className="about-powered">{t('settings.poweredBy')}</p>
          <a className="about-link" href={SOURCE_URL} target="_blank" rel="noreferrer">
            <Icon name="github" size={18} />
            {t('settings.sourceCode')}
          </a>
          <a className="about-link" href={DOCS_URL} target="_blank" rel="noreferrer">
            <Icon name="book" size={18} />
            {t('settings.docs')}
          </a>
          <p className="about-license">
            {t('settings.license')}
            <br />
            {t('settings.licenseNote')}
            <br />
            <span className="about-replace">{t('settings.replaceRepo')}</span>
          </p>
        </div>
      </section>
    </div>
  )
}
