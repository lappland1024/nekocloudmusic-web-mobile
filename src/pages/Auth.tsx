import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, register, resetPassword, sendResetCode, sendVerification } from '../api'
import { useAuth } from '../store/auth'
import { useToast } from '../store/ui'
import { useT } from '../i18n'
import { Logo } from '../components/Logo'
import { SliderCaptcha } from '../components/SliderCaptcha'

type Mode = 'login' | 'register' | 'forgot'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function Auth() {
  const t = useT()
  const navigate = useNavigate()
  const setAuth = useAuth((s) => s.setAuth)
  const toast = useToast((s) => s.toast)

  const [mode, setMode] = useState<Mode>('login')

  // 登录
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [loginBusy, setLoginBusy] = useState(false)

  // 注册
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [registerBusy, setRegisterBusy] = useState(false)
  const [captchaOpen, setCaptchaOpen] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // 忘记密码
  const [resetEmail, setResetEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [resetPasswordNew, setResetPasswordNew] = useState('')
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('')
  const [resetBusy, setResetBusy] = useState(false)
  const [resetCountdown, setResetCountdown] = useState(0)

  useEffect(() => {
    if (countdown <= 0) return
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [countdown])

  useEffect(() => {
    if (resetCountdown <= 0) return
    const id = setTimeout(() => setResetCountdown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [resetCountdown])

  const doLogin = async () => {
    if (!username.trim() || !password) {
      toast('auth.usernameRequired', 'info')
      return
    }
    setLoginBusy(true)
    try {
      const r = await login(username.trim(), password)
      const d = r.data
      if (!d) throw new Error('no data')
      setAuth(d.token, d.user)
      toast('auth.loginSuccess', 'success')
      navigate('/me', { replace: true })
    } catch (e) {
      toast(String((e as Error).message), 'error')
    } finally {
      setLoginBusy(false)
    }
  }

  const requestRegisterCode = () => {
    if (!username.trim()) {
      toast('auth.usernameRequired', 'info')
      return
    }
    if (!EMAIL_RE.test(email)) {
      toast('auth.emailInvalid', 'info')
      return
    }
    setCaptchaOpen(true)
  }

  const onCaptchaPass = async (passToken: string) => {
    try {
      await sendVerification({ email, username: username.trim(), captchaPassToken: passToken })
      toast('auth.codeSent', 'success')
      setCodeSent(true)
      setCountdown(60)
    } catch (e) {
      toast(String((e as Error).message), 'error')
    }
  }

  const doRegister = async () => {
    if (!username.trim()) {
      toast('auth.usernameRequired', 'info')
      return
    }
    if (!EMAIL_RE.test(email)) {
      toast('auth.emailInvalid', 'info')
      return
    }
    if (!code.trim()) {
      toast('auth.codeRequired', 'info')
      return
    }
    if (password.length < 6) {
      toast('auth.passwordLen', 'info')
      return
    }
    if (password !== confirmPw) {
      toast('auth.passwordMismatch', 'info')
      return
    }
    setRegisterBusy(true)
    try {
      const r = await register({
        username: username.trim(),
        password,
        email: email.trim(),
        verificationCode: code.trim(),
      })
      const d = r.data
      if (!d) throw new Error('no data')
      setAuth(d.token, d.user)
      toast('auth.registerSuccess', 'success')
      navigate('/me', { replace: true })
    } catch (e) {
      toast(String((e as Error).message), 'error')
    } finally {
      setRegisterBusy(false)
    }
  }

  const requestResetCode = async () => {
    if (!EMAIL_RE.test(resetEmail)) {
      toast('auth.emailInvalid', 'info')
      return
    }
    setResetBusy(true)
    try {
      await sendResetCode(resetEmail.trim())
      toast('auth.codeSent', 'success')
      setResetCountdown(60)
    } catch (e) {
      toast(String((e as Error).message), 'error')
    } finally {
      setResetBusy(false)
    }
  }

  const doReset = async () => {
    if (!resetCode.trim()) {
      toast('auth.codeRequired', 'info')
      return
    }
    if (resetPasswordNew.length < 6) {
      toast('auth.passwordLen', 'info')
      return
    }
    if (resetPasswordNew !== resetPasswordConfirm) {
      toast('auth.passwordMismatch', 'info')
      return
    }
    setResetBusy(true)
    try {
      await resetPassword({
        email: resetEmail.trim(),
        code: resetCode.trim(),
        newPassword: resetPasswordNew,
      })
      toast('auth.resetSuccess', 'success')
      setMode('login')
    } catch (e) {
      toast(String((e as Error).message), 'error')
    } finally {
      setResetBusy(false)
    }
  }

  return (
    <div className="page auth-page">
      <div className="auth-hero">
        <Logo size={92} />
        <h2 className="auth-title">
          {mode === 'login'
            ? t('auth.loginTitle')
            : mode === 'register'
              ? t('auth.registerTitle')
              : t('auth.forgotTitle')}
        </h2>
        <p className="auth-sub">
          {mode === 'login'
            ? t('auth.loginSub')
            : mode === 'register'
              ? t('auth.registerSub')
              : t('auth.forgotSub')}
        </p>
      </div>

      <div className="segmented auth-tabs">
        <button className={`seg ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>
          {t('auth.login')}
        </button>
        <button className={`seg ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>
          {t('auth.register')}
        </button>
      </div>

      {mode === 'login' && (
        <div className="form auth-form">
          <label className="field">
            <span>{t('auth.username')}</span>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus />
          </label>
          <label className="field">
            <span>{t('auth.password')}</span>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </label>
          <button className="btn btn-primary btn-lg" onClick={doLogin} disabled={loginBusy}>
            {loginBusy ? t('common.loading') : t('auth.login')}
          </button>
          <button className="link-btn auth-forgot" onClick={() => setMode('forgot')}>
            {t('auth.forgot')}
          </button>
        </div>
      )}

      {mode === 'register' && (
        <div className="form auth-form">
          <label className="field">
            <span>{t('auth.username')}</span>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus />
          </label>
          <label className="field">
            <span>{t('auth.email')}</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
          <div className="field-row code-row">
            <label className="field">
              <span>{t('auth.code')}</span>
              <input className="input" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" />
            </label>
            <button className="btn btn-ghost code-btn" onClick={requestRegisterCode} disabled={countdown > 0}>
              {countdown > 0 ? t('auth.resend', { s: countdown }) : t('auth.sendCode')}
            </button>
          </div>
          <label className="field">
            <span>{t('auth.password')}</span>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </label>
          <label className="field">
            <span>{t('auth.confirmPassword')}</span>
            <input className="input" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} autoComplete="new-password" />
          </label>
          <button className="btn btn-primary btn-lg" onClick={doRegister} disabled={registerBusy}>
            {registerBusy ? t('common.loading') : t('auth.register')}
          </button>
          {codeSent && <p className="auth-note">{t('auth.codeSent')}</p>}
        </div>
      )}

      {mode === 'forgot' && (
        <div className="form auth-form">
          <label className="field">
            <span>{t('auth.email')}</span>
            <input className="input" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} autoComplete="email" autoFocus />
          </label>
          <div className="field-row code-row">
            <label className="field">
              <span>{t('auth.code')}</span>
              <input className="input" value={resetCode} onChange={(e) => setResetCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" />
            </label>
            <button className="btn btn-ghost code-btn" onClick={requestResetCode} disabled={resetCountdown > 0 || resetBusy}>
              {resetCountdown > 0 ? t('auth.resend', { s: resetCountdown }) : t('auth.sendCode')}
            </button>
          </div>
          <label className="field">
            <span>{t('auth.password')}</span>
            <input className="input" type="password" value={resetPasswordNew} onChange={(e) => setResetPasswordNew(e.target.value)} autoComplete="new-password" />
          </label>
          <label className="field">
            <span>{t('auth.confirmPassword')}</span>
            <input className="input" type="password" value={resetPasswordConfirm} onChange={(e) => setResetPasswordConfirm(e.target.value)} autoComplete="new-password" />
          </label>
          <button className="btn btn-primary btn-lg" onClick={doReset} disabled={resetBusy}>
            {resetBusy ? t('common.loading') : t('settings.submit')}
          </button>
          <button className="link-btn auth-forgot" onClick={() => setMode('login')}>
            {t('auth.toLogin')}
          </button>
        </div>
      )}

      {/* 账号说明：本站不存储账号，账号体系属于 music.cnmsb.xin */}
      <p className="auth-account-note">{t('auth.accountNote')}</p>

      <SliderCaptcha open={captchaOpen} onClose={() => setCaptchaOpen(false)} onPass={onCaptchaPass} />
    </div>
  )
}
