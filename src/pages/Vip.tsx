import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { VipPlan, VipPayOrder } from '../types'
import { createVipPay, getMyPlaylists, getVipPricing } from '../api'
import { apiUrl } from '../api/client'
import { useAuth } from '../store/auth'
import { useToast } from '../store/ui'
import { useT, fmtDate } from '../i18n'
import { Icon } from '../components/Icon'
import { PageHead } from '../components/ui'

export function Vip() {
  const t = useT()
  const navigate = useNavigate()
  const token = useAuth((s) => s.token)
  const user = useAuth((s) => s.user)
  const toast = useToast((s) => s.toast)

  const [pricing, setPricing] = useState<VipPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [isVip, setIsVip] = useState(!!user?.isVip)
  const [vipExpiresAt, setVipExpiresAt] = useState<string | null>(user?.vipExpiresAt ?? null)
  const [selected, setSelected] = useState<number | null>(null)
  const [payType, setPayType] = useState<'alipay' | 'wxpay'>('alipay')
  const [order, setOrder] = useState<VipPayOrder | null>(null)
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    getVipPricing()
      .then((d) => {
        setPricing(d)
        if (d.length > 0) setSelected((s) => s ?? d[0].id)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    if (token) {
      // 会员状态以歌单列表接口根级字段为准（登录响应可能过期）
      getMyPlaylists()
        .then((r) => {
          setIsVip(!!r.isVip)
          setVipExpiresAt(r.vipExpiresAt ?? null)
        })
        .catch(() => {})
    }
  }, [token])

  const durLabel = (p: VipPlan) => {
    const parts: string[] = []
    if (p.months > 0) parts.push(`${p.months} ${t('vip.month')}`)
    if (p.days > 0) parts.push(`${p.days} ${t('vip.day')}`)
    return parts.join('+') || '—'
  }

  const buy = async () => {
    if (!token) {
      toast('common.loginRequired', 'info')
      return
    }
    if (selected == null) return
    setPaying(true)
    try {
      const o = await createVipPay(selected, payType)
      setOrder(o)
    } catch (e) {
      toast(String((e as Error).message), 'error')
    } finally {
      setPaying(false)
    }
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast('video.copyDone', 'success')
    } catch {
      toast('common.retryLater', 'info')
    }
  }

  // 后端返回的 qrcode/payurl 可能是完整 URL 也可能是相对路径
  const abs = (u: string) => (/^https?:/i.test(u) ? u : apiUrl(u))

  return (
    <div className="page">
      <PageHead title={t('vip.title')} onBack={() => navigate(-1)} />

      {/* 会员状态 */}
      <section className="vip-status">
        <span className={`vip-badge ${isVip ? 'is-vip' : ''}`}>
          <Icon name="crown" size={22} />
        </span>
        <div>
          <h3 className="vip-status-title">{isVip ? t('vip.active') : t('vip.notVip')}</h3>
          {isVip && vipExpiresAt ? (
            <p className="vip-status-sub">{t('vip.expires', { date: fmtDate(vipExpiresAt) })}</p>
          ) : (
            <p className="vip-status-sub">{t('vip.featureList')}</p>
          )}
        </div>
      </section>

      {!token ? (
        <div className="vip-login">
          <p className="sheet-note">{t('common.loginRequired')}</p>
          <button className="btn btn-primary" onClick={() => navigate('/auth')}>
            {t('auth.toLogin')}
          </button>
        </div>
      ) : (
        <>
          {/* 套餐选择 */}
          <section className="home-section">
            <div className="section-head">
              <div>
                <h3>{t('vip.pricing')}</h3>
              </div>
            </div>
            {loading ? (
              <div className="skeleton" style={{ height: 96, borderRadius: 14 }} />
            ) : pricing.length === 0 ? (
              <p className="sheet-note">{t('common.empty')}</p>
            ) : (
              <div className="vip-plans">
                {pricing.map((p) => (
                  <button
                    key={p.id}
                    className={`vip-plan ${selected === p.id ? 'active' : ''}`}
                    onClick={() => setSelected(p.id)}
                  >
                    <span className="vip-plan-dur">{durLabel(p)}</span>
                    <span className="vip-plan-price">¥{p.priceYuan}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* 支付方式 + 下单 */}
          <section className="home-section">
            <div className="section-head">
              <div>
                <h3>{t('vip.payType')}</h3>
              </div>
            </div>
            <div className="segmented vip-pay-types">
              <button
                className={`seg ${payType === 'alipay' ? 'active' : ''}`}
                onClick={() => setPayType('alipay')}
              >
                {t('vip.payAlipay')}
              </button>
              <button
                className={`seg ${payType === 'wxpay' ? 'active' : ''}`}
                onClick={() => setPayType('wxpay')}
              >
                {t('vip.payWxpay')}
              </button>
            </div>
            <button className="btn btn-primary btn-lg" onClick={buy} disabled={paying || selected == null}>
              {paying ? t('vip.payOpening') : t('vip.buy')}
            </button>
          </section>
        </>
      )}

      {/* 支付面板（二维码 + 收银台链接） */}
      {order && (
        <div className="overlay overlay-center" onClick={() => setOrder(null)}>
          <div className="dialog vip-pay" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-title">{t('vip.payTitle')}</div>
            <img
              className="vip-qrcode"
              src={abs(order.qrcode)}
              alt=""
              onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
            />
            <p className="vip-order-no">{t('vip.orderNo', { no: order.outTradeNo })}</p>
            <a className="link-btn" href={abs(order.payurl)} target="_blank" rel="noopener noreferrer">
              {t('vip.payUrlHint')}
              <Icon name="arrowRight" size={16} />
            </a>
            <div className="dialog-actions">
              <button className="btn btn-ghost" onClick={() => copy(order.payurl)}>
                {t('common.copy')}
              </button>
              <button className="btn btn-primary" onClick={() => setOrder(null)}>
                {t('common.done')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
