import { useEffect, type ReactNode } from 'react'
import { useToast } from '../store/ui'
import { useBodyLock } from '../hooks/useBodyLock'
import { Icon } from './Icon'
import { Logo } from './Logo'
import { useT } from '../i18n'

// ---------- Toast ----------

export function ToastHost() {
  const toasts = useToast((s) => s.toasts)
  return (
    <div className="toast-host">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`} role="status">
          {t.type === 'success' ? (
            <Icon name="check" size={16} />
          ) : t.type === 'error' ? (
            <Icon name="alert" size={16} />
          ) : (
            <Icon name="info" size={16} />
          )}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  )
}

// ---------- 确认对话框 ----------

export function ConfirmDialog() {
  const confirm = useToast((s) => s.confirm)
  const close = useToast((s) => s.closeConfirm)
  const t = useT()

  useBodyLock(!!confirm)

  useEffect(() => {
    if (!confirm) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirm, close])

  if (!confirm) return null

  const run = async () => {
    close()
    await confirm.onOk?.()
  }

  return (
    <div className="overlay overlay-center" onClick={close}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        {confirm.title && <div className="dialog-title">{confirm.title}</div>}
        <div className="dialog-text">{confirm.text}</div>
        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={close}>
            {t('common.cancel')}
          </button>
          <button className={`btn ${confirm.danger ? 'btn-danger' : 'btn-primary'}`} onClick={run}>
            {confirm.okText ?? t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------- 底部弹层 ----------

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  /** 标题栏右侧额外操作（关闭按钮左侧） */
  right?: ReactNode
  /** 是否从底部滑入（默认 true） */
  bottom?: boolean
}

export function Sheet({ open, onClose, title, right, children, bottom = true }: SheetProps) {
  useBodyLock(open)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={`overlay ${bottom ? 'overlay-bottom' : 'overlay-center'}`} onClick={onClose}>
      <div
        className={bottom ? 'sheet' : 'dialog'}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        {title != null && (
          <div className="sheet-head">
            <span className="sheet-title">{title}</span>
            <div className="sheet-head-actions">
              {right}
              <button className="icon-btn" onClick={onClose} aria-label="close">
                <Icon name="x" size={20} />
              </button>
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

// ---------- 骨架屏 ----------

export function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton ${className ?? ''}`} />
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="skeleton-row" key={i}>
          <Skeleton className="skeleton-cover" />
          <div className="skeleton-lines">
            <Skeleton className="skeleton-line w70" />
            <Skeleton className="skeleton-line w40" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------- 空状态 ----------

interface EmptyProps {
  text?: string
  sub?: string
  action?: ReactNode
}

export function EmptyState({ text, sub, action }: EmptyProps) {
  return (
    <div className="empty">
      <Logo size={96} />
      {text && <p className="empty-text">{text}</p>}
      {sub && <p className="empty-sub">{sub}</p>}
      {action}
    </div>
  )
}

// ---------- 页面头部 ----------

interface PageHeadProps {
  title?: ReactNode
  onBack?: () => void
  right?: ReactNode
  transparent?: boolean
}

export function PageHead({ title, onBack, right, transparent }: PageHeadProps) {
  return (
    <div className={`page-head ${transparent ? 'transparent' : ''}`}>
      {onBack ? (
        <button className="icon-btn" onClick={onBack} aria-label="back">
          <Icon name="chevronLeft" size={24} />
        </button>
      ) : (
        <span className="page-head-spacer" />
      )}
      <div className="page-head-title truncate">{title}</div>
      <div className="page-head-right">{right ?? <span className="page-head-spacer" />}</div>
    </div>
  )
}

// ---------- 加载按钮内的小转圈 ----------

export function Spinner({ size = 18 }: { size?: number }) {
  return <span className="spinner" style={{ width: size, height: size }} aria-hidden="true" />
}
