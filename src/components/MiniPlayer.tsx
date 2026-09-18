import { usePlayer } from '../store/player'
import { useLiquidGlass } from '../hooks/useLiquidGlass'
import { Cover } from './Cover'
import { Icon } from './Icon'

export function MiniPlayer() {
  const glassRef = useLiquidGlass<HTMLDivElement>()
  const queue = usePlayer((s) => s.queue)
  const index = usePlayer((s) => s.index)
  const playing = usePlayer((s) => s.playing)
  const loading = usePlayer((s) => s.loading)
  const currentTime = usePlayer((s) => s.currentTime)
  const duration = usePlayer((s) => s.duration)
  const toggle = usePlayer((s) => s.toggle)
  const setExpanded = usePlayer((s) => s.setExpanded)
  const setShowQueue = usePlayer((s) => s.setShowQueue)

  const track = queue[index]
  if (!track) return null

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="mini-player" onClick={() => setExpanded(true)} ref={glassRef}>
      <div className="mini-progress" style={{ width: `${pct}%` }} />
      <Cover src={track.coverUrl} musicId={track.id} className="mini-cover" rounded={8} />
      <div className="mini-meta">
        <div className="mini-title truncate">{track.title}</div>
        <div className="mini-artist truncate">{track.artist}</div>
      </div>
      <button
        className="icon-btn mini-btn"
        aria-label={playing ? 'pause' : 'play'}
        onClick={(e) => {
          e.stopPropagation()
          toggle()
        }}
      >
        {loading ? (
          <span className="mini-loading" />
        ) : (
          <Icon name={playing ? 'pause' : 'play'} size={26} />
        )}
      </button>
      <button
        className="icon-btn mini-btn"
        aria-label="queue"
        onClick={(e) => {
          e.stopPropagation()
          setShowQueue(true)
        }}
      >
        <Icon name="list" size={20} />
      </button>
    </div>
  )
}
