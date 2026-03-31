import { useState, useRef, useEffect, useCallback } from 'react'

// ─── Cores e tipos ────────────────────────────────────────────────────
type VisualMode = 'bars' | 'wave' | 'circle'

interface AccentColor {
  label: string
  main: string
  glow: string
}

const ACCENT_COLORS: AccentColor[] = [
  { label: 'Ciano',   main: '#00d4ff', glow: 'rgba(0,212,255,0.5)'  },
  { label: 'Verde',   main: '#00ff88', glow: 'rgba(0,255,136,0.4)'  },
  { label: 'Roxo',    main: '#a855f7', glow: 'rgba(168,85,247,0.5)' },
  { label: 'Laranja', main: '#f97316', glow: 'rgba(249,115,22,0.5)' },
]

export interface WaveAudioPlayerProps {
  src: string
  title?: string
  subtitle?: string
  autoPlay?: boolean
  onEnded?: () => void
  onPrev?: () => void
  onNext?: () => void
  hasPrev?: boolean
  hasNext?: boolean
}

// ─── helpers ──────────────────────────────────────────────────────────────
const fmtTime = (s: number) => {
  if (!s || !isFinite(s)) return '0:00'
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

const hexAlpha = (hex: string, alpha: number) => {
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0')
  return hex + a
}

// ─── Componente ──────────────────────────────────────────────────────────────
export const WaveAudioPlayer = ({
  src,
  title    = 'Nenhuma faixa carregada',
  subtitle = 'ÁUDIO DO PORTFÓLIO',
  autoPlay = false,
  onEnded,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}: WaveAudioPlayerProps) => {
  const audioRef     = useRef<HTMLAudioElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animRef      = useRef<number>(0)
  const idleTRef     = useRef(0)
  const audioCtxRef  = useRef<AudioContext | null>(null)
  const analyserRef  = useRef<AnalyserNode | null>(null)
  const gainRef      = useRef<GainNode | null>(null)
  const sourceRef    = useRef<MediaElementAudioSourceNode | null>(null) // FIX 1: rastreia o source
  const prevVolRef   = useRef(0.8)

  const [isPlaying,   setIsPlaying]   = useState(false)
  const [progress,    setProgress]    = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration,    setDuration]    = useState(0)
  const [isMuted,     setIsMuted]     = useState(false)
  const [volume,      setVolume]      = useState(0.8)
  const [isReady,     setIsReady]     = useState(false)
  const [isLoop,      setIsLoop]      = useState(false)
  const [mode,        setMode]        = useState<VisualMode>('bars')
  const [accentIdx,   setAccentIdx]   = useState(0)
  const [hovering,    setHovering]    = useState(false)

  const accent = ACCENT_COLORS[accentIdx]

  // ─── Canvas resize ──────────────────────────────────────────────────
  const resizeCanvas = useCallback(() => {
    const canvas    = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const dpr = window.devicePixelRatio || 1
    const rect = container.getBoundingClientRect()
    canvas.width  = rect.width  * dpr
    canvas.height = rect.height * dpr
    canvas.style.width  = '100%'
    canvas.style.height = '100%'
    const ctx = canvas.getContext('2d')
    ctx?.scale(dpr, dpr)
  }, [])

  useEffect(() => {
    resizeCanvas()
    const ro = new ResizeObserver(resizeCanvas)
    if (containerRef.current) ro.observe(containerRef.current)
    window.addEventListener('resize', resizeCanvas)
    return () => { ro.disconnect(); window.removeEventListener('resize', resizeCanvas) }
  }, [resizeCanvas])

  // ─── AudioContext ────────────────────────────────────────────────────
  const initAudio = useCallback(() => {
    if (!audioRef.current) return

    // FIX 2: se já existe AudioContext mas o source ainda não foi criado
    // (acontece quando o src muda e o audioEl é novo), recria o source
    if (audioCtxRef.current) {
      if (!sourceRef.current) {
        try {
          const source = audioCtxRef.current.createMediaElementSource(audioRef.current)
          source.connect(analyserRef.current!)
          sourceRef.current = source
        } catch { /* elemento já estava conectado */ }
      }
      return
    }

    const actx     = new AudioContext()
    const analyser = actx.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.82

    // FIX 3: gain.value deve ser o volume atual, não o valor de fechamento
    const gain = actx.createGain()
    gain.gain.value = prevVolRef.current

    const source = actx.createMediaElementSource(audioRef.current)
    source.connect(analyser)
    analyser.connect(gain)
    gain.connect(actx.destination)

    audioCtxRef.current = actx
    analyserRef.current = analyser
    gainRef.current     = gain
    sourceRef.current   = source
  }, [])

  // ─── Reinicia quando o src muda ───────────────────────────────────────
  useEffect(() => {
    setIsReady(false)
    setIsPlaying(false)
    setProgress(0)
    setCurrentTime(0)
    setDuration(0)
    // FIX 1 cont.: ao trocar de src o MediaElementSource anterior deixa de ser válido
    sourceRef.current = null
  }, [src])

  // ─── Draw: BARS ───────────────────────────────────────────────────────
  const drawBars = useCallback((
    ctx2: CanvasRenderingContext2D,
    data: Uint8Array,
    W: number, H: number,
    acnt: AccentColor
  ) => {
    const barCount = 90
    const gap  = 2
    const barW = (W - gap * (barCount - 1)) / barCount
    const step = Math.floor(data.length / barCount)

    ctx2.strokeStyle = 'rgba(255,255,255,0.025)'
    ctx2.lineWidth = 1
    for (let y = H; y > 0; y -= H / 5) {
      ctx2.beginPath(); ctx2.moveTo(0, y); ctx2.lineTo(W, y); ctx2.stroke()
    }

    for (let i = 0; i < barCount; i++) {
      const val  = data[i * step] / 255
      const barH = val * H * 0.88
      const x    = i * (barW + gap)
      const y    = H - barH

      const grad = ctx2.createLinearGradient(0, y, 0, H)
      grad.addColorStop(0,   acnt.main)
      grad.addColorStop(0.6, hexAlpha(acnt.main, 0.67))
      grad.addColorStop(1,   hexAlpha(acnt.main, 0.09))
      ctx2.fillStyle = grad
      ctx2.beginPath()
      ctx2.roundRect(x, y, barW, barH, [2, 2, 0, 0])
      ctx2.fill()

      if (barH > 5) {
        ctx2.shadowColor = acnt.main
        ctx2.shadowBlur  = 12
        ctx2.fillStyle   = acnt.main
        ctx2.beginPath()
        ctx2.roundRect(x, y, barW, 2, 2)
        ctx2.fill()
        ctx2.shadowBlur = 0
      }
    }

    ctx2.save()
    ctx2.globalAlpha = 0.18
    ctx2.scale(1, -1)
    ctx2.translate(0, -H * 2)
    for (let i = 0; i < barCount; i++) {
      const val  = data[i * step] / 255
      const barH = val * H * 0.88 * 0.3
      const x    = i * (barW + gap)
      const y    = H - barH
      const rg   = ctx2.createLinearGradient(0, y, 0, H)
      rg.addColorStop(0, hexAlpha(acnt.main, 0.33))
      rg.addColorStop(1, 'transparent')
      ctx2.fillStyle = rg
      ctx2.beginPath()
      ctx2.roundRect(x, y, barW, barH, [2, 2, 0, 0])
      ctx2.fill()
    }
    ctx2.restore()
  }, [])

  // ─── Draw: WAVE ───────────────────────────────────────────────────────
  const drawWave = useCallback((
    ctx2: CanvasRenderingContext2D,
    data: Uint8Array,
    W: number, H: number,
    acnt: AccentColor
  ) => {
    const sliceW = W / data.length

    ctx2.beginPath()
    ctx2.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx2.lineWidth = 1
    ctx2.moveTo(0, H / 2); ctx2.lineTo(W, H / 2); ctx2.stroke()

    ctx2.beginPath()
    let x = 0
    for (let i = 0; i < data.length; i++) {
      const y = ((data[i] / 128) * H) / 2
      i === 0 ? ctx2.moveTo(x, y) : ctx2.lineTo(x, y)
      x += sliceW
    }
    ctx2.lineTo(W, H / 2)
    const fg = ctx2.createLinearGradient(0, 0, 0, H)
    fg.addColorStop(0,   hexAlpha(acnt.main, 0.16))
    fg.addColorStop(0.5, hexAlpha(acnt.main, 0.02))
    fg.addColorStop(1,   hexAlpha(acnt.main, 0.16))
    ctx2.fillStyle = fg
    ctx2.fill()

    ctx2.beginPath()
    x = 0
    for (let i = 0; i < data.length; i++) {
      const y = ((data[i] / 128) * H) / 2
      i === 0 ? ctx2.moveTo(x, y) : ctx2.lineTo(x, y)
      x += sliceW
    }
    ctx2.lineWidth   = 2
    ctx2.strokeStyle = acnt.main
    ctx2.shadowColor = acnt.main
    ctx2.shadowBlur  = 14
    ctx2.stroke()
    ctx2.shadowBlur = 0
  }, [])

  // ─── Draw: CIRCLE ──────────────────────────────────────────────────────
  const drawCircle = useCallback((
    ctx2: CanvasRenderingContext2D,
    data: Uint8Array,
    W: number, H: number,
    acnt: AccentColor
  ) => {
    const cx = W / 2, cy = H / 2
    const R  = Math.min(W, H) * 0.3
    const bars = 140
    const step = Math.floor(data.length / bars)

    ;([[R, 0.09], [R * 0.65, 0.05], [R * 1.15, 0.04]] as [number,number][]).forEach(([r, a]) => {
      ctx2.beginPath()
      ctx2.arc(cx, cy, r, 0, Math.PI * 2)
      ctx2.strokeStyle = hexAlpha(acnt.main, a)
      ctx2.lineWidth = 1
      ctx2.stroke()
    })

    for (let i = 0; i < bars; i++) {
      const val   = data[i * step] / 255
      const angle = (i / bars) * Math.PI * 2 - Math.PI / 2
      const len   = val * R * 0.85
      ctx2.beginPath()
      ctx2.moveTo(cx + Math.cos(angle) * R,       cy + Math.sin(angle) * R)
      ctx2.lineTo(cx + Math.cos(angle) * (R+len), cy + Math.sin(angle) * (R+len))
      ctx2.lineWidth   = 2
      ctx2.strokeStyle = hexAlpha(acnt.main, val)
      ctx2.shadowColor = acnt.main
      ctx2.shadowBlur  = val * 10
      ctx2.stroke()
    }
    ctx2.shadowBlur = 0

    const avg = Array.from(data.slice(0, 100)).reduce((a, b) => a + b, 0) / 100 / 255
    const pr  = 6 + avg * 16
    const rg  = ctx2.createRadialGradient(cx, cy, 0, cx, cy, pr * 2.5)
    rg.addColorStop(0,   acnt.main)
    rg.addColorStop(0.4, hexAlpha(acnt.main, 0.6))
    rg.addColorStop(1,   'transparent')
    ctx2.beginPath()
    ctx2.arc(cx, cy, pr * 2.5, 0, Math.PI * 2)
    ctx2.fillStyle = rg
    ctx2.fill()
  }, [])

  // ─── Idle animation ──────────────────────────────────────────────────────
  const renderIdle = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx2 = canvas.getContext('2d')
    if (!ctx2) return
    const dpr = window.devicePixelRatio || 1
    const W = canvas.width / dpr
    const H = canvas.height / dpr
    ctx2.clearRect(0, 0, W, H)

    const acnt = ACCENT_COLORS[accentIdx]

    if (mode === 'circle') {
      const cx = W / 2, cy = H / 2
      const R  = Math.min(W, H) * 0.3
      ;([[R, 0.09], [R * 0.65, 0.05], [R * 1.15, 0.04]] as [number,number][]).forEach(([r, a]) => {
        ctx2.beginPath()
        ctx2.arc(cx, cy, r, 0, Math.PI * 2)
        ctx2.strokeStyle = hexAlpha(acnt.main, a)
        ctx2.lineWidth = 1
        ctx2.stroke()
      })
      const pr = 4 + Math.sin(idleTRef.current) * 2
      ctx2.beginPath()
      ctx2.arc(cx, cy, pr, 0, Math.PI * 2)
      ctx2.fillStyle = hexAlpha(acnt.main, 0.31)
      ctx2.fill()
    } else {
      ctx2.beginPath()
      ctx2.moveTo(0, H / 2)
      for (let x = 0; x < W; x++) {
        ctx2.lineTo(x, H / 2 + Math.sin((x / W) * Math.PI * 4 + idleTRef.current) * 2.5)
      }
      ctx2.strokeStyle = hexAlpha(acnt.main, 0.21)
      ctx2.lineWidth   = 1.5
      ctx2.stroke()
    }

    idleTRef.current += 0.03
  }, [mode, accentIdx])

  // ─── Visualizer loop ────────────────────────────────────────────────────
  const startVisualizer = useCallback(() => {
    cancelAnimationFrame(animRef.current)
    const loop = () => {
      const canvas = canvasRef.current
      if (!canvas || !analyserRef.current) return
      const ctx2 = canvas.getContext('2d')
      if (!ctx2) return
      const dpr  = window.devicePixelRatio || 1
      const W = canvas.width / dpr
      const H = canvas.height / dpr
      ctx2.clearRect(0, 0, W, H)

      const acnt = ACCENT_COLORS[accentIdx]

      if (mode === 'wave') {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteTimeDomainData(data)
        drawWave(ctx2, data, W, H, acnt)
      } else if (mode === 'bars') {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(data)
        drawBars(ctx2, data, W, H, acnt)
      } else {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(data)
        drawCircle(ctx2, data, W, H, acnt)
      }

      animRef.current = requestAnimationFrame(loop)
    }
    loop()
  }, [mode, accentIdx, drawBars, drawWave, drawCircle])

  // ─── Idle loop ────────────────────────────────────────────────────────────
  const startIdle = useCallback(() => {
    cancelAnimationFrame(animRef.current)
    const loop = () => {
      renderIdle()
      animRef.current = requestAnimationFrame(loop)
    }
    loop()
  }, [renderIdle])

  useEffect(() => {
    if (!isPlaying) startIdle()
    return () => cancelAnimationFrame(animRef.current)
  }, [mode, accentIdx, isPlaying, startIdle])

  useEffect(() => {
    if (isPlaying) startVisualizer()
    return () => cancelAnimationFrame(animRef.current)
  }, [isPlaying, mode, accentIdx, startVisualizer])

  // ─── Cleanup ──────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animRef.current)
      audioCtxRef.current?.close()
    }
  }, [])

  // ─── Eventos do <audio> ──────────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    // FIX 3 cont.: sincroniza volume com o estado atual
    audio.volume = volume
    const onMeta  = () => { setDuration(audio.duration); setIsReady(true) }
    const onTime  = () => {
      setCurrentTime(audio.currentTime)
      setProgress(audio.duration ? audio.currentTime / audio.duration : 0)
    }
    const onEnd   = () => {
      if (isLoop) { audio.currentTime = 0; audio.play() }
      else { setIsPlaying(false); onEnded?.() }
    }
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('timeupdate',     onTime)
    audio.addEventListener('ended',          onEnd)
    return () => {
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('timeupdate',     onTime)
      audio.removeEventListener('ended',          onEnd)
    }
  }, [src, isLoop, onEnded, volume])

  // ─── autoPlay ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!autoPlay || !isReady) return
    const play = async () => {
      initAudio()
      if (audioCtxRef.current?.state === 'suspended') await audioCtxRef.current.resume()
      await audioRef.current?.play()
      setIsPlaying(true)
    }
    play()
  }, [autoPlay, isReady, initAudio])

  // ─── Controles ──────────────────────────────────────────────────────────────
  const togglePlay = async () => {
    const audio = audioRef.current
    if (!audio || !isReady) return
    initAudio()
    // FIX 2 cont.: garante que o AudioContext não está suspenso antes de tocar
    if (audioCtxRef.current?.state === 'suspended') await audioCtxRef.current.resume()
    // FIX 3 cont.: sincroniza gain com o volume atual antes de tocar
    if (gainRef.current) gainRef.current.gain.value = volume
    if (isPlaying) { audio.pause(); setIsPlaying(false) }
    else           { await audio.play(); setIsPlaying(true) }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * duration
  }

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    prevVolRef.current = v > 0 ? v : prevVolRef.current
    setIsMuted(v === 0)
    if (gainRef.current) gainRef.current.gain.value = v
    else if (audioRef.current) audioRef.current.volume = v
  }

  const toggleMute = () => {
    if (volume > 0) {
      prevVolRef.current = volume
      setVolume(0); setIsMuted(true)
      if (gainRef.current) gainRef.current.gain.value = 0
      else if (audioRef.current) audioRef.current.volume = 0
    } else {
      const v = prevVolRef.current
      setVolume(v); setIsMuted(false)
      if (gainRef.current) gainRef.current.gain.value = v
      else if (audioRef.current) audioRef.current.volume = v
    }
  }

  const skip = (s: number) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + s))
  }

  const showOverlay = hovering || !isPlaying

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="w-full flex flex-col select-none"
      style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", background: '#0f0f0f' }}
    >
      <audio ref={audioRef} src={src} preload="metadata" loop={isLoop} />

      {/* ── Canvas area ── */}
      <div
        ref={containerRef}
        className="relative w-full cursor-pointer"
        style={{ aspectRatio: '16/9', background: '#000', borderRadius: '12px 12px 0 0', overflow: 'hidden' }}
        onClick={togglePlay}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <canvas ref={canvasRef} style={{ display: 'block', position: 'absolute', inset: 0 }} />

        {/* Scanlines */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5,
          background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.06) 2px,rgba(0,0,0,0.06) 4px)',
        }} />

        {/* Corner decorations */}
        {(['tl','tr','bl','br'] as const).map(c => (
          <div key={c} style={{
            position: 'absolute', width: 18, height: 18, pointerEvents: 'none', zIndex: 6, opacity: 0.5,
            top:    c.startsWith('t') ? 10 : undefined,
            bottom: c.startsWith('b') ? 56 : undefined,
            left:   c.endsWith('l')   ? 10 : undefined,
            right:  c.endsWith('r')   ? 10 : undefined,
            borderTop:    c.startsWith('t') ? `1.5px solid ${accent.main}` : undefined,
            borderBottom: c.startsWith('b') ? `1.5px solid ${accent.main}` : undefined,
            borderLeft:   c.endsWith('l')   ? `1.5px solid ${accent.main}` : undefined,
            borderRight:  c.endsWith('r')   ? `1.5px solid ${accent.main}` : undefined,
          }} />
        ))}

        {/* Status badge */}
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 9999, padding: '4px 12px',
          fontFamily: "'Space Mono', monospace", fontSize: '0.58rem',
          letterSpacing: '0.1em', color: '#aaa', zIndex: 10, pointerEvents: 'none',
          backdropFilter: 'blur(6px)',
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: isPlaying ? '#ff0000' : '#555',
            boxShadow: isPlaying ? '0 0 8px rgba(255,0,0,0.7)' : 'none',
            animation: isPlaying ? 'wave-pulse 1.4s ease-in-out infinite' : 'none',
          }} />
          <span>{isPlaying ? 'REPRODUZINDO' : (isReady ? 'PAUSADO' : 'AGUARDANDO ÁUDIO')}</span>
        </div>

        {/* Dark gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(to bottom, transparent 0%, transparent 50%, rgba(0,0,0,0.5) 80%, rgba(0,0,0,0.85) 100%)',
          opacity: showOverlay ? 1 : 0,
          transition: 'opacity 300ms ease',
        }} />

        {/* Center play/pause button */}
        <button
          onClick={e => { e.stopPropagation(); togglePlay() }}
          disabled={!isReady}
          style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: `translate(-50%,-50%) scale(${showOverlay ? 1 : 0.9})`,
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(0,0,0,0.72)', border: 'none', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: isReady ? 'pointer' : 'not-allowed',
            opacity: showOverlay ? 1 : 0,
            transition: 'opacity 250ms ease, transform 250ms cubic-bezier(0.16,1,0.3,1)',
            zIndex: 20, backdropFilter: 'blur(4px)',
          }}
        >
          {isPlaying ? (
            <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1"/>
              <rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
          ) : (
            <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          )}
        </button>

        {/* Mode switcher — top right */}
        <div style={{
          position: 'absolute', top: 12, right: 12, zIndex: 15,
          display: 'flex', gap: 4,
          background: '#212121', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 9999, padding: 4,
        }} onClick={e => e.stopPropagation()}>
          {(['bars', 'wave', 'circle'] as VisualMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                background: mode === m ? `rgba(0,212,255,0.15)` : 'none',
                border: 'none',
                color: mode === m ? accent.main : '#aaa',
                fontFamily: "'Space Mono', monospace",
                fontSize: '0.62rem', fontWeight: 700,
                letterSpacing: '0.08em',
                padding: '5px 14px', borderRadius: 9999,
                cursor: 'pointer',
                boxShadow: mode === m ? `0 0 10px ${accent.glow}` : 'none',
                textTransform: 'uppercase',
              }}
            >
              {m === 'circle' ? 'RADIAL' : m.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── Controls bar ── */}
      <div style={{
        background: '#181818',
        border: '1px solid rgba(255,255,255,0.1)',
        borderTop: 'none',
        borderRadius: '0 0 12px 12px',
        padding: '10px 16px 12px',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>

        {/* Progress row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: '0.65rem',
            color: '#aaa', minWidth: 38, letterSpacing: '0.04em', flexShrink: 0,
          }}>{fmtTime(currentTime)}</span>

          <div
            onClick={handleSeek}
            style={{
              flex: 1, height: 4, background: 'rgba(255,255,255,0.2)',
              borderRadius: 9999, position: 'relative', cursor: 'pointer',
            }}
          >
            <div style={{
              height: '100%', borderRadius: 9999,
              width: `${progress * 100}%`,
              background: accent.main,
              boxShadow: `0 0 6px ${accent.glow}`,
              transition: 'width 0.1s linear',
            }} />
          </div>

          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: '0.65rem',
            color: '#aaa', minWidth: 38, letterSpacing: '0.04em',
            flexShrink: 0, textAlign: 'right',
          }}>{fmtTime(duration)}</span>
        </div>

        {/* Buttons row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            disabled={!isReady}
            style={{
              background: 'none', border: 'none', color: '#fff',
              cursor: isReady ? 'pointer' : 'not-allowed',
              padding: '4px 10px 4px 6px', borderRadius: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: isReady ? 1 : 0.4,
            }}
          >
            {isPlaying ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1"/>
                <rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            )}
          </button>

          {/* Skip -10s */}
          <button onClick={() => skip(-10)} disabled={!isReady} style={ctrlBtnStyle(isReady)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 .49-3.75"/>
              <text x="7.5" y="15.5" fontSize="5.5" fill="currentColor" stroke="none" fontWeight="bold">10</text>
            </svg>
          </button>

          {/* Skip +10s */}
          <button onClick={() => skip(10)} disabled={!isReady} style={ctrlBtnStyle(isReady)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15A9 9 0 1 1 20 11.25"/>
              <text x="7.5" y="15.5" fontSize="5.5" fill="currentColor" stroke="none" fontWeight="bold">10</text>
            </svg>
          </button>

          {/* Volume */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <button onClick={toggleMute} style={ctrlBtnStyle(true)}>
              {isMuted || volume === 0 ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
                </svg>
              ) : volume < 0.5 ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </svg>
              )}
            </button>
            <input
              type="range" min={0} max={1} step={0.01}
              value={isMuted ? 0 : volume}
              onChange={handleVolume}
              style={{
                width: 64, height: 3, cursor: 'pointer',
                WebkitAppearance: 'none', appearance: 'none',
                background: 'rgba(255,255,255,0.25)', borderRadius: 9999, outline: 'none',
                accentColor: accent.main,
              }}
            />
          </div>

          {/* Right side */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 0 }}>

            {/* Loop */}
            <button
              onClick={() => setIsLoop(l => !l)}
              style={{
                ...ctrlBtnStyle(true),
                color: isLoop ? accent.main : '#aaa',
              }}
              title="Repetir"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="17 1 21 5 17 9"/>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                <polyline points="7 23 3 19 7 15"/>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
              </svg>
            </button>

            {hasPrev && (
              <button onClick={onPrev} style={ctrlBtnStyle(true)} title="Anterior">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/>
                </svg>
              </button>
            )}
            {hasNext && (
              <button onClick={onNext} style={ctrlBtnStyle(true)} title="Próximo">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>
                </svg>
              </button>
            )}

            {/* Accent dots */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '0 8px', borderLeft: '1px solid rgba(255,255,255,0.1)', marginLeft: 8,
            }}>
              {ACCENT_COLORS.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setAccentIdx(i)}
                  title={c.label}
                  style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: c.main, cursor: 'pointer',
                    border: accentIdx === i ? '2px solid #fff' : '2px solid transparent',
                    transform: accentIdx === i ? 'scale(1.25)' : 'scale(1)',
                    transition: 'all 160ms',
                    flexShrink: 0,
                    outline: 'none',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Track info (YouTube style) ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 16,
        marginTop: 16, padding: '0 4px',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 4, flexShrink: 0,
          background: '#212121', border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent.main,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="4"/>
            <circle cx="12" cy="12" r="10" strokeDasharray="2 4"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.95rem', fontWeight: 600, color: '#f1f1f1',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{title}</div>
          <div style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: '0.6rem', color: '#aaa',
            marginTop: 2, letterSpacing: '0.05em',
          }}>{subtitle}</div>
        </div>
      </div>

      {/* keyframes inline */}
      <style>{`
        @keyframes wave-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </div>
  )
}

// ─── helper de estilo de botão de controle ────────────────────────────────────────

const ctrlBtnStyle = (active: boolean): React.CSSProperties => ({
  background: 'none', border: 'none',
  color: '#aaa', cursor: active ? 'pointer' : 'not-allowed',
  padding: '6px 8px', borderRadius: 4,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  opacity: active ? 1 : 0.3,
  transition: 'color 160ms',
})
