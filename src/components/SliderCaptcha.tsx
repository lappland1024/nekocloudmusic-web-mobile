import { useEffect, useRef, useState } from 'react'
import { getCaptcha, verifyCaptcha } from '../api'
import type { CaptchaChallenge } from '../types'
import { useToast } from '../store/ui'
import { useT } from '../i18n'
import { Sheet } from './ui'
import { Icon } from './Icon'
import { Spinner } from './ui'

interface Props {
  open: boolean
  onClose: () => void
  onPass: (captchaPassToken: string) => void
}

export function SliderCaptcha({ open, onClose, onPass }: Props) {
  const t = useT()
  const toast = useToast((s) => s.toast)
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null)
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [offsetPx, setOffsetPx] = useState(0)
  const [dragging, setDragging] = useState(false)

  const bgRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const scaleRef = useRef(1)

  const load = async () => {
    setLoading(true)
    setChallenge(null)
    setOffsetPx(0)
    try {
      const c = await getCaptcha()
      setChallenge(c)
    } catch (e) {
      toast(String((e as Error).message), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const displayWidth = () => bgRef.current?.clientWidth ?? 300
  const maxOffsetPx = () => {
    if (!challenge) return 0
    const scale = displayWidth() / challenge.bgWidth
    scaleRef.current = scale
    return (challenge.bgWidth - challenge.sliderWidth) * scale
  }

  const startDrag = (e: React.PointerEvent) => {
    if (!challenge) return
    setDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const moveDrag = (e: React.PointerEvent) => {
    if (!dragging || !trackRef.current || !challenge) return
    const rect = trackRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const max = maxOffsetPx()
    setOffsetPx(Math.max(0, Math.min(max, x)))
  }

  const endDrag = async () => {
    if (!dragging || !challenge) return
    setDragging(false)
    const scale = displayWidth() / challenge.bgWidth
    const offsetBg = Math.round(offsetPx / scale)
    setVerifying(true)
    try {
      const { captchaPassToken } = await verifyCaptcha(challenge.captchaToken, offsetBg)
      toast('auth.captcha.pass', 'success')
      onPass(captchaPassToken)
      onClose()
    } catch {
      toast('auth.captcha.fail', 'error')
      await load() // 换一张重试
    } finally {
      setVerifying(false)
    }
  }

  const scale = challenge ? displayWidth() / challenge.bgWidth : 1
  const max = maxOffsetPx()

  return (
    <Sheet open={open} onClose={onClose} title={t('auth.captcha.title')}>
      <p className="captcha-hint">{t('auth.captcha.hint')}</p>
      <div className="captcha">
        {loading || !challenge ? (
          <div className="captcha-loading">
            <Spinner size={26} />
          </div>
        ) : (
          <>
            <div className="captcha-bg" ref={bgRef}>
              <img src={challenge.bgImage} alt="" draggable={false} />
              <img
                className="captcha-puzzle"
                src={challenge.sliderImage}
                alt=""
                draggable={false}
                style={{
                  left: offsetPx,
                  top: challenge.puzzleY * scale,
                  width: challenge.sliderWidth * scale,
                  height: challenge.sliderHeight * scale,
                }}
              />
              <div
                className="captcha-target"
                style={{
                  left: offsetPx,
                  top: challenge.puzzleY * scale,
                  width: challenge.sliderWidth * scale,
                  height: challenge.sliderHeight * scale,
                }}
              />
            </div>
            <div
              className="captcha-track"
              ref={trackRef}
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <div className="captcha-fill" style={{ width: offsetPx }} />
              <div className="captcha-thumb" style={{ left: offsetPx }} title={t('auth.captcha.hint')}>
                {verifying ? (
                  <Spinner size={18} />
                ) : (
                  <Icon name={dragging ? 'chevronLeft' : 'arrowRight'} size={20} />
                )}
              </div>
            </div>
            <div className="captcha-scale-note">{Math.round((offsetPx / (max || 1)) * 100)}%</div>
          </>
        )}
      </div>
    </Sheet>
  )
}
