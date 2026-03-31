import { useState, useRef, useEffect, useCallback } from 'react'

// ─── Paleta verde — alinhada ao primary da página ────────────────────────────────
const GREEN       = '#22c55e'          // green-500 — mesma família do primary
const GREEN_DIM   = '#16a34a'          // green-600 — botão hover / borda ativa
const GREEN_A     = (a: number) => `rgba(34,197,94,${a})`
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
  const gainRef     = useRef<GainNode | null>(null)
  const sourceRef   = useRef<MediaElementAudioSourceNode | null>(null)
  const prevVolRef  = useRef(0.8)

  const [isPlaying,   setIsPlaying]   = useState(false)
  const [progress,    setProgress]    = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration,    setDuration]    = useState(0)
  const [isMuted,     setIsMuted]     = useState(false)
  const [volume,      setVolume]      = useState(0.8)
  const [isReady,     setIsReady]     = useState(false)

  const fmt = (s: number) => {
    if (!isFinite(s)) return '0:00'
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
  }

  // ─── Idle wave ─────────────────────────────────────────────────────────────────────
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
      ctx.fillStyle = GREEN_A(0.18)
      ctx.fillRect(i * (bw + 1.5), (H - h) / 2, bw, Math.max(2, h))
    }
  }, [])

  // ─── Visualizer loop ────────────────────────────────────────────────────────
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
      const avg   = sum / step
      const barH  = Math.max(2, (avg / 255) * H * 0.9)
      const alpha = 0.35 + (avg / 255) * 0.65
      ctx.fillStyle = GREEN_A(alpha)
      ctx.fillRect(i * (bw + 1.5), (H - barH) / 2, bw, barH)
    }
  }, [])

  // ─── AudioContext ───────────────────────────────────────────────────────────────
  const initCtx = useCallback(() => {
    if (!audioRef.current) return
    if (audioCtxRef.current) {
      if (!sourceRef.current) {
        try {
          const source = audioCtxRef.current.createMediaElementSource(audioRef.current)
          source.connect(gainRef.current!)
          source.connect(analyserRef.current!)
          sourceRef.current = source
        } catch (err) {
          console.error('[AudioMiniPlayer] createMediaElementSource (reconnect) falhou:', err)
        }
      }
      return
    }
    const actx     = new AudioContext()
    const analyser = actx.createAnalyser()
    analyser.fftSize = 128
    const gain = actx.createGain()
    gain.gain.value = prevVolRef.current
    gain.connect(actx.destination)
    try {
      const source = actx.createMediaElementSource(audioRef.current)
      source.connect(gain)
      source.connect(analyser)
      sourceRef.current = source
    } catch (err) {
      console.error('[AudioMiniPlayer] createMediaElementSource falhou:', err)
    }
    audioCtxRef.current = actx
    analyserRef.current = analyser
    gainRef.current     = gain
  }, [])

  // ─── Reinicia ao trocar src ─────────────────────────────────────────────────────
  useEffect(() => {
    setIsReady(false); setIsPlaying(false)
    setProgress(0); setCurrentTime(0); setDuration(0)
    sourceRef.current = null
    drawIdle()
  }, [src, drawIdle])

  useEffect(() => {
    return () => { cancelAnimationFrame(animRef.current); audioCtxRef.current?.close() }
  }, [])

  // ─── Eventos do <audio> ──────────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume
    const onMeta  = () => { setDuration(audio.duration); setIsReady(true) }
    const onTime  = () => {
      setCurrentTime(audio.currentTime)
      setProgress(audio.duration ? audio.currentTime / audio.duration : 0)
    }
    const onPlay  = () => { setIsPlaying(true);  cancelAnimationFrame(animRef.current); drawViz() }
    const onPause = () => { setIsPlaying(false); cancelAnimationFrame(animRef.current); animRef.current = 0; drawIdle() }
    const onEnded = () => { setIsPlaying(false); setProgress(0); cancelAnimationFrame(animRef.current); animRef.current = 0; drawIdle() }
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
  }, [src, drawViz, drawIdle, volume])

  // ─── Controles ────────────────────────────────────────────────────────────────────
  const togglePlay = async () => {
    const audio = audioRef.current
    if (!audio || !isReady) return
    initCtx()
    if (audioCtxRef.current?.state === 'suspended') await audioCtxRef.current.resume()
    if (gainRef.current) gainRef.current.gain.value = volume
    audio.paused ? await audio.play() : audio.pause()
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !isFinite(duration)) return
    const rect = e.currentTarget.getBoundingClientRect()
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * duration
  }

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    setVolume(v); prevVolRef.current = v > 0 ? v : prevVolRef.current; setIsMuted(v === 0)
    if (gainRef.current) gainRef.current.gain.value = v
    else if (audioRef.current) audioRef.current.volume = v
  }

  const toggleMute = () => {
    if (volume > 0) {
      prevVolRef.current = volume; setVolume(0); setIsMuted(true)
      if (gainRef.current) gainRef.current.gain.value = 0
      else if (audioRef.current) audioRef.current.volume = 0
    } else {
      const v = prevVolRef.current; setVolume(v); setIsMuted(false)
      if (gainRef.current) gainRef.current.gain.value = v
      else if (audioRef.current) audioRef.current.volume = v
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{
      width: '100%',
      background: '#0f1a12',  // verde-escuro profundo
      border: `1px solid ${isPlaying ? GREEN_A(0.35) : 'rgba(255,255,255,0.07)'}`,
      borderRadius: '1rem',
      padding: '1.25rem 1.5rem 1.125rem',
      position: 'relative',
      overflow: 'hidden',
      transition: 'border-color 220ms cubic-bezier(0.16,1,0.3,1), box-shadow 220ms cubic-bezier(0.16,1,0.3,1)',
      boxShadow: isPlaying
        ? `0 0 0 1px ${GREEN_A(0.08)}, 0 10px 40px rgba(0,0,0,0.5)`
        : 'none',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* brilho de fundo quando tocando */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `linear-gradient(135deg, ${GREEN_A(0.08)} 0%, transparent 55%)`,
        opacity: isPlaying ? 1 : 0,
        transition: 'opacity 300ms cubic-bezier(0.16,1,0.3,1)',
      }} />

      <audio ref={audioRef} src={src} preload="metadata" crossOrigin="anonymous" />

      {/* ── TOP ROW: play | info | waveform ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '44px 1fr 120px',
        columnGap: '1rem',
        alignItems: 'center',
        marginBottom: '0.9rem',
        position: 'relative', zIndex: 1,
      }}>

        {/* Botão Play */}
        <button
          style={{
            width: 44, height: 44, borderRadius: '50%',
            background: isPlaying ? GREEN : '#162316',
            border: `1px solid ${isPlaying ? GREEN_DIM : GREEN_A(0.2)}`,
            color: isPlaying ? '#0a1a0a' : '#86efac',   // verde muito escuro / verde-claro
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: isReady ? 'pointer' : 'not-allowed',
            flexShrink: 0,
            boxShadow: isPlaying ? `0 0 20px ${GREEN_A(0.3)}` : 'none',
            transition: 'background 180ms, border-color 180ms, color 180ms, box-shadow 180ms',
            opacity: isReady ? 1 : 0.4,
            outline: 'none',
          }}
          onClick={togglePlay}
          aria-label="Play / Pause"
        >
          {isPlaying ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6"  y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
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
            fontSize: '0.6875rem', color: '#4ade80',  // green-400 — detalhe verde suave
            letterSpacing: '0.05em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {meta}
          </span>
        </div>

        {/* Waveform */}
        <div style={{ width: 120, height: 44, flexShrink: 0 }}>
          <canvas ref={canvasRef} width={240} height={88}
            style={{ display: 'block', width: '100%', height: '100%' }} />
        </div>
      </div>

      {/* ── PROGRESS ROW ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        marginBottom: '0.75rem', position: 'relative', zIndex: 1,
      }}>
        <div
          onClick={handleSeek}
          style={{
            flex: 1, height: 3,
            background: GREEN_A(0.15),
            borderRadius: 9999, cursor: 'pointer',
            position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{
            height: '100%',
            background: `linear-gradient(90deg, ${GREEN_DIM}, ${GREEN})`,
            borderRadius: 9999,
            width: `${progress * 100}%`,
            transition: 'width 80ms linear',
            boxShadow: `0 0 6px ${GREEN_A(0.5)}`,
          }} />
        </div>

        <span style={{
          fontFamily: "'JetBrains Mono', 'Courier New', monospace",
          fontSize: '0.6875rem', color: '#4ade80',
          letterSpacing: '0.04em',
          flexShrink: 0, minWidth: 80, textAlign: 'right',
        }}>
          {fmt(currentTime)} / {fmt(duration)}
        </span>
      </div>

      {/* ── BOTTOM ROW ── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: '1rem',
        position: 'relative', zIndex: 1,
      }}>
        {onOpenGallery ? (
          <button
            onClick={onOpenGallery}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              fontFamily: "'JetBrains Mono', 'Courier New', monospace",
              fontSize: '0.6875rem', color: GREEN,
              cursor: 'pointer', letterSpacing: '0.07em',
              background: 'none', border: 'none', padding: 0,
              opacity: 0.7,
              transition: 'opacity 150ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
          >
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
            style={{ background: 'none', border: 'none', color: GREEN_A(0.7), cursor: 'pointer', lineHeight: 0, padding: 0 }}
          >
            {isMuted || volume === 0 ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            )}
          </button>

          <input
            type="range" min={0} max={1} step={0.01}
            value={isMuted ? 0 : volume}
            onChange={handleVolume}
            style={{
              WebkitAppearance: 'none', appearance: 'none',
              width: 72, height: 3,
              background: GREEN_A(0.2),
              borderRadius: 9999, outline: 'none', cursor: 'pointer',
              accentColor: GREEN,
            }}
          />
        </div>
      </div>
    </div>
  )
}
