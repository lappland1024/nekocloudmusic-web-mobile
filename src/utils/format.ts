/** 秒 → mm:ss */
export function formatDur(sec?: number): string {
  if (!sec || !Number.isFinite(sec) || sec <= 0) return '--:--'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
