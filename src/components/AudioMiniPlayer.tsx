import { useState, useRef, useEffect, useCallback } from 'react'

// ─── Cores ciano idênticas ao HTML de referência ───────────────────────────
const CYAN        = '#22d3ee'
const CYAN_ALPHA  = (a: number) => `rgba(34,211,238,${a})`
const BAR_COUNT   = 40

interface AudioMiniPlayerProps {
  src: string
  title?: string
  meta?: string
  onOpenGallery?: () => void
}

export const AudioMiniPlayer = ({
  src,
  title = 'Nenhum arquivo carregado',
  meta  = 'Áudio do portfólio',
  onOpenGallery,
}: AudioMiniPlayerProps) => {
  const audioRef    = useRef<HTMLAudioElement>(null)
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const animRef     = useRef<number>(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const prevVolRef  = useRef(0.8)

  const [isPlaying,   setIsPlaying]   = useState(false)
  const [progress,    setProgress]    = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration,    setDuration]    = useState(0)
  const [isMuted,     setIsMuted]     = useState(false)
  const [volume,      setVolume]      = useState(0.8)
  const [isReady,     setIsReady]     = useState(false)

  // ─── helpers ───────────────────────────────────────────────────────────────
  const fmt = (s: number) => {
    if (!isFinite(s)) return '0:00'
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
  }

  // ─── idle wave (estática, igual ao drawIdleWave do HTML) ──────────────────
  const drawIdle = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    ctx.clearRect(0, 0, W, H)
    const bw = (W / BAR_COUNT) - 1.5
    for (let i = 0; i < BAR_COUNT; i++) {
      const t = i / BAR_COUNT
      const h = (Math.sin(t * Math.PI * 2.8) * 0.28 + 0.38) * H * 0.48
      ctx.fillStyle = CYAN_ALPHA(0.16)
      ctx.fillRect(i * (bw + 1.5), (H - h) / 2, bw, Math.max(2, h))
    }
  }, [])

  // ─── loop de visualização (igual ao paintBars do HTML) ────────────────────
  const drawViz = useCallback(() => {
    animRef.current = requestAnimationFrame(drawViz)
    const canvas = canvasRef.current
    if (!canvas || !analyserRef.current) return
    const ctx  = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    const buf  = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(buf)
    ctx.clearRect(0, 0, W, H)
    const n    = BAR_COUNT
    const step = Math.floor(buf.length / n)
    const bw   = (W / n) - 1.5
    for (let i = 0; i < n; i++) {
      let sum = 0
      for (let j = 0; j < step; j++) sum += buf[i * step + j]
      const avg  = sum / step
      const barH = Math.max(2, (avg / 255) * H * 0.9)
      const alpha = 0.4 + (avg / 255) * 0.6
      ctx.fillStyle = CYAN_ALPHA(alpha)
      ctx.fillRect(i * (bw + 1.5), (H - barH) / 2, bw, barH)
    }
  }, [])

  // ─── AudioContext (criado só no primeiro gesto) ────────────────────────────
  const initCtx = useCallback(() => {
    if (audioCtxRef.current || !audioRef.current) return
    const actx     = new AudioContext()
    const analyser = actx.createAnalyser()
    analyser.fftSize = 128
    actx.createMediaElementSource(audioRef.current).connect(analyser)
    analyser.connect(actx.destination)
    audioCtxRef.current = actx
    analyserRef.current = analyser
  }, [])

  // ─── Desenha idle na montagem e troca de src ──────────────────────────────
  useEffect(() => {
    drawIdle()
  }, [drawIdle, src])

  // ─── Cleanup ──────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animRef.current)
      audioCtxRef.current?.close()
    }
  }, [])

  // ─── Eventos do <audio> ───────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume

    const onMeta  = () => { setDuration(audio.duration); setIsReady(true) }
    const onTime  = () => {
      setCurrentTime(audio.currentTime)
      setProgress(audio.duration ? audio.currentTime / audio.duration : 0)
    }
    const onPlay  = () => {
      setIsPlaying(true)
      cancelAnimationFrame(animRef.current)
      drawViz()
    }
    const onPause = () => {
      setIsPlaying(false)
      cancelAnimationFrame(animRef.current)
      animRef.current = 0
      drawIdle()
    }
    const onEnded = () => {
      setIsPlaying(false)
      setProgress(0)
      cancelAnimationFrame(animRef.current)
      animRef.current = 0
      drawIdle()
    }

    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('timeupdate',     onTime)
    audio.addEventListener('play',           onPlay)
    audio.addEventListener('pause',          onPause)
    audio.addEventListener('ended',          onEnded)

    return () => {
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('timeupdate',     onTime)
      audio.removeEventListener('play',           onPlay)
      audio.removeEventListener('pause',          onPause)
      audio.removeEventListener('ended',          onEnded)
    }
  }, [src, drawViz, drawIdle])

  // ─── Play / Pause ─────────────────────────────────────────────────────────
  const togglePlay = async () => {
    const audio = audioRef.current
    if (!audio || !isReady) return
    initCtx()
    if (audioCtxRef.current?.state === 'suspended') await audioCtxRef.current.resume()
    audio.paused ? await audio.play() : audio.pause()
  }

  // ─── Seek ─────────────────────────────────────────────────────────────────
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !isFinite(duration)) return
    const rect = e.currentTarget.getBoundingClientRect()
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * duration
  }

  // ─── Volume ───────────────────────────────────────────────────────────────
  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    setIsMuted(v === 0)
    if (audioRef.current) audioRef.current.volume = v
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return
    if (volume > 0) {
      prevVolRef.current = volume
      audio.volume = 0
      setVolume(0)
      setIsMuted(true)
    } else {
      audio.volume = prevVolRef.current
      setVolume(prevVolRef.current)
      setIsMuted(false)
    }
  }

  // ─── Estilos inline fiéis ao CSS do HTML ──────────────────────────────────
  const cardStyle: React.CSSProperties = {
    width: '100%',
    background: '#141518',
    border: `1px solid ${isPlaying ? 'rgba(34,211,238,0.28)' : 'rgba(255,255,255,0.07)'}`,
    borderRadius: '1rem',
    padding: '1.25rem 1.5rem 1.125rem',
    position: 'relative',
    overflow: 'hidden',
    transition: 'border-color 220ms cubic-bezier(0.16,1,0.3,1), box-shadow 220ms cubic-bezier(0.16,1,0.3,1)',
    boxShadow: isPlaying ? '0 0 0 1px rgba(34,211,238,0.07), 0 10px 40px rgba(0,0,0,0.45)' : 'none',
    fontFamily: "'Inter', system-ui, sans-serif",
  }

  const glowOverlay: React.CSSProperties = {
    content: '',
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(135deg, rgba(34,211,238,0.10) 0%, transparent 55%)',
    opacity: isPlaying ? 1 : 0,
    transition: 'opacity 300ms cubic-bezier(0.16,1,0.3,1)',
    pointerEvents: 'none',
  }

  const playBtnStyle: React.CSSProperties = {
    width: 44, height: 44,
    borderRadius: '50%',
    background: isPlaying ? CYAN : '#1a1c20',
    border: `1px solid ${isPlaying ? CYAN : 'rgba(255,255,255,0.07)'}`,
    color: isPlaying ? '#0e0f11' : '#e2e4e9',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: isReady ? 'pointer' : 'not-allowed',
    flexShrink: 0,
    boxShadow: isPlaying ? '0 0 18px rgba(34,211,238,0.22)' : 'none',
    transition: 'background 180ms, border-color 180ms, color 180ms',
    opacity: isReady ? 1 : 0.4,
    outline: 'none',
  }

  return (
    <div style={cardStyle}>
      {/* overlay de brilho */}
      <div style={glowOverlay} />

      <audio ref={audioRef} src={src} preload="metadata" />

      {/* ── TOP ROW: play | info | waveform ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '44px 1fr 120px',
        columnGap: '1rem',
        alignItems: 'center',
        marginBottom: '0.9rem',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Botão play */}
        <button style={playBtnStyle} onClick={togglePlay} aria-label="Play / Pause">
          {isPlaying ? (
            // Pause — dois retângulos idênticos ao SVG do HTML
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6"  y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            // Play
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}>
              <path d="M6 4l14 8-14 8V4z" />
            </svg>
          )}
        </button>

        {/* Info */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <span style={{
            fontSize: '0.9375rem', fontWeight: 500, color: '#e2e4e9',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {title}
          </span>
          <span style={{
            fontFamily: "'JetBrains Mono', 'Courier New', monospace",
            fontSize: '0.6875rem', color: '#6b7280',
            letterSpacing: '0.05em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {meta}
          </span>
        </div>

        {/* Waveform compacto 120×44 */}
        <div style={{ width: 120, height: 44, flexShrink: 0 }}>
          <canvas
            ref={canvasRef}
            width={240}
            height={88}
            style={{ display: 'block', width: '100%', height: '100%' }}
          />
        </div>
      </div>

      {/* ── PROGRESS ROW ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        marginBottom: '0.75rem', position: 'relative', zIndex: 1,
      }}>
        {/* Seek track */}
        <div
          onClick={handleSeek}
          style={{
            flex: 1, height: 3,
            background: '#374151',
            borderRadius: 9999,
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{
            height: '100%',
            background: CYAN,
            borderRadius: 9999,
            width: `${progress * 100}%`,
            transition: 'width 80ms linear',
          }} />
        </div>

        {/* Tempo */}
        <span style={{
          fontFamily: "'JetBrains Mono', 'Courier New', monospace",
          fontSize: '0.6875rem', color: '#6b7280',
          letterSpacing: '0.04em',
          flexShrink: 0, minWidth: 80, textAlign: 'right',
        }}>
          {fmt(currentTime)} / {fmt(duration)}
        </span>
      </div>

      {/* ── BOTTOM ROW: abrir + volume ── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: '1rem',
        position: 'relative', zIndex: 1,
      }}>
        {/* Botão ABRIR */}
        {onOpenGallery ? (
          <button
            onClick={onOpenGallery}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              fontFamily: "'JetBrains Mono', 'Courier New', monospace",
              fontSize: '0.6875rem', color: CYAN,
              cursor: 'pointer', letterSpacing: '0.07em',
              background: 'none', border: 'none', padding: 0,
              opacity: 0.65,
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.65')}
          >
            {/* ícone ⤢ expand */}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
            ABRIR
          </button>
        ) : (
          <span />
        )}

        {/* Volume */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <button
            onClick={toggleMute}
            style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', lineHeight: 0, padding: 0 }}
          >
            {isMuted || volume === 0 ? (
              // muted X
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              // volume on
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            )}
          </button>

          <input
            type="range"
            min={0} max={1} step={0.01}
            value={isMuted ? 0 : volume}
            onChange={handleVolume}
            style={{
              WebkitAppearance: 'none',
              appearance: 'none',
              width: 72, height: 3,
              background: '#374151',
              borderRadius: 9999,
              outline: 'none',
              cursor: 'pointer',
              accentColor: CYAN,
            }}
          />
        </div>
      </div>
    </div>
  )
}
