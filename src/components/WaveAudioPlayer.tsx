import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Music,
} from 'lucide-react'

type VisualMode = 'bars' | 'wave' | 'circle'

interface WaveAudioPlayerProps {
  src: string
  title?: string
  autoPlay?: boolean
  onEnded?: () => void
  onPrev?: () => void
  onNext?: () => void
  hasPrev?: boolean
  hasNext?: boolean
}

const ACCENT_COLORS: { label: string; r: number; g: number; b: number }[] = [
  { label: 'Vermelho', r: 229, g: 57,  b: 53  },
  { label: 'Roxo',    r: 156, g: 39,  b: 176 },
  { label: 'Azul',    r: 33,  g: 150, b: 243 },
  { label: 'Verde',   r: 76,  g: 175, b: 80  },
  { label: 'Âmbar',  r: 255, g: 193, b: 7   },
]

const BAR_COUNT = 64

export const WaveAudioPlayer = ({
  src,
  title = 'Áudio',
  autoPlay = false,
  onEnded,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}: WaveAudioPlayerProps) => {
  const audioRef    = useRef<HTMLAudioElement>(null)
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animRef     = useRef<number>(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const barsRef     = useRef<number[]>(Array(BAR_COUNT).fill(0))

  const [isPlaying,   setIsPlaying]   = useState(false)
  const [progress,    setProgress]    = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration,    setDuration]    = useState(0)
  const [isMuted,     setIsMuted]     = useState(false)
  const [volume,      setVolume]      = useState(0.8)
  const [isReady,     setIsReady]     = useState(false)
  const [mode,        setMode]        = useState<VisualMode>('bars')
  const [accentIdx,   setAccentIdx]   = useState(0)

  const accent = ACCENT_COLORS[accentIdx]

  // ─── helpers ────────────────────────────────────────────────────────────
  const fmt = (s: number) => {
    if (!isFinite(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  // ─── AudioContext ────────────────────────────────────────────────────────
  const initAudioContext = useCallback(() => {
    if (audioCtxRef.current || !audioRef.current) return
    const ctx      = new AudioContext()
    const analyser = ctx.createAnalyser()
    analyser.fftSize              = 256
    analyser.smoothingTimeConstant = 0.85
    ctx.createMediaElementSource(audioRef.current).connect(analyser)
    analyser.connect(ctx.destination)
    audioCtxRef.current = ctx
    analyserRef.current = analyser
  }, [])

  // ─── Canvas resize observer ─────────────────────────────────────────────
  useEffect(() => {
    const canvas    = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ro = new ResizeObserver(() => {
      canvas.width  = container.clientWidth
      canvas.height = container.clientHeight
    })
    ro.observe(container)
    canvas.width  = container.clientWidth
    canvas.height = container.clientHeight
    return () => ro.disconnect()
  }, [])

  // ─── Draw loop ───────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width
    const H = canvas.height
    const { r, g, b } = accent

    // atualiza dados
    if (analyserRef.current) {
      const data = new Uint8Array(analyserRef.current.frequencyBinCount)
      analyserRef.current.getByteFrequencyData(data)
      const step = Math.floor(data.length / BAR_COUNT)
      for (let i = 0; i < BAR_COUNT; i++) {
        const raw = data[i * step] / 255
        barsRef.current[i] += (raw - barsRef.current[i]) * 0.25
      }
    } else {
      // idle breathing
      const t = Date.now() / 1000
      for (let i = 0; i < BAR_COUNT; i++) {
        barsRef.current[i] = 0.04 + 0.02 * Math.sin(t * 1.2 + i * 0.35)
      }
    }

    ctx.clearRect(0, 0, W, H)

    if (mode === 'bars') {
      drawBarsMode(ctx, W, H, r, g, b)
    } else if (mode === 'wave') {
      drawWaveMode(ctx, W, H, r, g, b)
    } else {
      drawCircleMode(ctx, W, H, r, g, b)
    }

    animRef.current = requestAnimationFrame(draw)
  }, [mode, accent])

  const drawBarsMode = (
    ctx: CanvasRenderingContext2D,
    W: number, H: number,
    r: number, g: number, b: number
  ) => {
    const barW = (W - (BAR_COUNT - 1) * 2) / BAR_COUNT
    for (let i = 0; i < BAR_COUNT; i++) {
      const v    = barsRef.current[i]
      const barH = Math.max(4, v * H * 0.8)
      const x    = i * (barW + 2)
      const y    = (H - barH) / 2
      const alpha = 0.35 + v * 0.65
      const grad  = ctx.createLinearGradient(x, y, x, y + barH)
      grad.addColorStop(0,   `rgba(${r},${g},${b},${alpha})`)
      grad.addColorStop(0.5, `rgba(${r},${g},${b},1)`)
      grad.addColorStop(1,   `rgba(${r},${g},${b},${alpha})`)
      ctx.fillStyle = grad
      const rad = Math.min(barW / 2, 4)
      ctx.beginPath()
      ctx.roundRect(x, y, barW, barH, rad)
      ctx.fill()
    }
  }

  const drawWaveMode = (
    ctx: CanvasRenderingContext2D,
    W: number, H: number,
    r: number, g: number, b: number
  ) => {
    const midY = H / 2
    ctx.lineWidth   = 2.5
    ctx.strokeStyle = `rgb(${r},${g},${b})`
    ctx.shadowColor  = `rgba(${r},${g},${b},0.6)`
    ctx.shadowBlur   = 12

    // fill area
    const fillGrad = ctx.createLinearGradient(0, 0, 0, H)
    fillGrad.addColorStop(0,   `rgba(${r},${g},${b},0.3)`)
    fillGrad.addColorStop(0.5, `rgba(${r},${g},${b},0.05)`)
    fillGrad.addColorStop(1,   `rgba(${r},${g},${b},0.3)`)

    ctx.beginPath()
    for (let i = 0; i < BAR_COUNT; i++) {
      const x  = (i / (BAR_COUNT - 1)) * W
      const v  = barsRef.current[i]
      const dy = v * (H * 0.45)
      if (i === 0) ctx.moveTo(x, midY - dy)
      else ctx.lineTo(x, midY - dy)
    }
    // volta pelo lado de baixo (espelho)
    for (let i = BAR_COUNT - 1; i >= 0; i--) {
      const x  = (i / (BAR_COUNT - 1)) * W
      const v  = barsRef.current[i]
      const dy = v * (H * 0.45)
      ctx.lineTo(x, midY + dy)
    }
    ctx.closePath()
    ctx.fillStyle = fillGrad
    ctx.fill()

    // linha superior
    ctx.beginPath()
    for (let i = 0; i < BAR_COUNT; i++) {
      const x  = (i / (BAR_COUNT - 1)) * W
      const v  = barsRef.current[i]
      const dy = v * (H * 0.45)
      if (i === 0) ctx.moveTo(x, midY - dy)
      else ctx.lineTo(x, midY - dy)
    }
    ctx.stroke()

    ctx.shadowBlur = 0
  }

  const drawCircleMode = (
    ctx: CanvasRenderingContext2D,
    W: number, H: number,
    r: number, g: number, b: number
  ) => {
    const cx    = W / 2
    const cy    = H / 2
    const baseR = Math.min(W, H) * 0.22

    // círculo base
    ctx.beginPath()
    ctx.arc(cx, cy, baseR, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(${r},${g},${b},0.2)`
    ctx.lineWidth   = 1.5
    ctx.stroke()

    // barras radiais
    const sliceAngle = (Math.PI * 2) / BAR_COUNT
    for (let i = 0; i < BAR_COUNT; i++) {
      const v     = barsRef.current[i]
      const angle = i * sliceAngle - Math.PI / 2
      const len   = v * baseR * 1.4 + 3
      const x1    = cx + Math.cos(angle) * baseR
      const y1    = cy + Math.sin(angle) * baseR
      const x2    = cx + Math.cos(angle) * (baseR + len)
      const y2    = cy + Math.sin(angle) * (baseR + len)

      const alpha = 0.4 + v * 0.6
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`
      ctx.lineWidth   = 2
      ctx.shadowColor  = `rgba(${r},${g},${b},0.5)`
      ctx.shadowBlur   = 6
      ctx.stroke()
    }
    ctx.shadowBlur = 0

    // ícone central
    ctx.beginPath()
    ctx.arc(cx, cy, baseR * 0.55, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${r},${g},${b},0.15)`
    ctx.fill()
  }

  // ─── Inicia / reinicia loop ao mudar mode ou accent ──────────────────────
  useEffect(() => {
    cancelAnimationFrame(animRef.current)
    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [draw])

  // ─── Cleanup ao desmontar ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animRef.current)
      const audio = audioRef.current
      if (audio) { audio.pause(); audio.src = '' }
      audioCtxRef.current?.close()
    }
  }, [])

  // ─── Eventos do <audio> ────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onLoaded = () => { setDuration(audio.duration); setIsReady(true) }
    const onTime   = () => {
      setCurrentTime(audio.currentTime)
      setProgress(audio.duration ? audio.currentTime / audio.duration : 0)
    }
    const onEnded_ = () => { setIsPlaying(false); onEnded?.() }
    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnded_)
    audio.volume = volume
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnded_)
    }
  }, [src])

  // ─── autoPlay ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!autoPlay || !isReady) return
    const play = async () => {
      initAudioContext()
      if (audioCtxRef.current?.state === 'suspended') {
        await audioCtxRef.current.resume()
      }
      await audioRef.current?.play()
      setIsPlaying(true)
    }
    play()
  }, [autoPlay, isReady])

  // ─── Controls ──────────────────────────────────────────────────────────────
  const togglePlay = async () => {
    const audio = audioRef.current
    if (!audio || !isReady) return
    if (!audioCtxRef.current) initAudioContext()
    if (audioCtxRef.current?.state === 'suspended') {
      await audioCtxRef.current.resume()
    }
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      await audio.play()
      setIsPlaying(true)
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    const rect  = e.currentTarget.getBoundingClientRect()
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * duration
  }

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    setIsMuted(v === 0)
    if (audioRef.current) audioRef.current.volume = v
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const skip = (seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds))
  }

  return (
    <div className="w-full flex flex-col bg-black rounded-2xl overflow-hidden select-none">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Canvas da visualização */}
      <div
        ref={containerRef}
        className="relative w-full"
        style={{ aspectRatio: '16/9' }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
        />

        {/* Ícone central no modo circle quando parado */}
        {mode === 'circle' && !isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Music className="w-12 h-12 text-white/20" />
          </div>
        )}

        {/* Botão play central (overlay) */}
        <button
          onClick={togglePlay}
          disabled={!isReady}
          className="absolute inset-0 flex items-center justify-center group"
        >
          <div
            className="w-20 h-20 rounded-full bg-black/40 backdrop-blur-md border border-white/20
                       flex items-center justify-center
                       opacity-0 group-hover:opacity-100 transition-opacity duration-200
                       disabled:cursor-not-allowed"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 text-white" />
            ) : (
              <Play className="w-8 h-8 text-white ml-1" />
            )}
          </div>
        </button>

        {/* Título no canto superior esquerdo */}
        {title && (
          <div className="absolute top-3 left-3 max-w-[70%] bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5 pointer-events-none">
            <p className="text-sm font-semibold text-white truncate">{title}</p>
          </div>
        )}

        {/* Seletor de modo — canto superior direito */}
        <div className="absolute top-3 right-3 flex gap-1">
          {(['bars', 'wave', 'circle'] as VisualMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors
                ${
                  mode === m
                    ? 'bg-white text-black'
                    : 'bg-black/40 text-white/60 hover:text-white'
                }`}
            >
              {m === 'bars' ? 'BARS' : m === 'wave' ? 'WAVE' : 'RADIAL'}
            </button>
          ))}
        </div>

        {/* Seletor de cor — canto inferior direito */}
        <div className="absolute bottom-3 right-3 flex gap-1.5">
          {ACCENT_COLORS.map((c, i) => (
            <button
              key={i}
              onClick={() => setAccentIdx(i)}
              title={c.label}
              className={`w-4 h-4 rounded-full transition-transform
                ${ accentIdx === i ? 'scale-125 ring-2 ring-white' : 'opacity-60 hover:opacity-100' }`}
              style={{ backgroundColor: `rgb(${c.r},${c.g},${c.b})` }}
            />
          ))}
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="px-4 pt-3">
        <div
          className="relative h-1.5 bg-white/10 rounded-full cursor-pointer group"
          onClick={handleSeek}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all"
            style={{
              width: `${progress * 100}%`,
              backgroundColor: `rgb(${accent.r},${accent.g},${accent.b})`,
            }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progress * 100}% - 6px)` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[11px] text-white/50 tabular-nums">{fmt(currentTime)}</span>
          <span className="text-[11px] text-white/50 tabular-nums">{fmt(duration)}</span>
        </div>
      </div>

      {/* Controles principais */}
      <div className="flex items-center justify-between gap-3 px-4 pb-4 pt-1">
        {/* Skip -10s */}
        <button
          onClick={() => skip(-10)}
          disabled={!isReady}
          className="text-white/50 hover:text-white transition-colors disabled:opacity-30 flex flex-col items-center gap-0.5"
          title="-10s"
        >
          <SkipBack className="w-4 h-4" />
          <span className="text-[9px] text-white/40">-10s</span>
        </button>

        {/* Prev (opcional) */}
        {hasPrev && (
          <button
            onClick={onPrev}
            className="text-white/50 hover:text-white transition-colors"
            title="Anterior"
          >
            <SkipBack className="w-5 h-5" />
          </button>
        )}

        {/* Play / Pause central */}
        <button
          onClick={togglePlay}
          disabled={!isReady}
          className="w-14 h-14 rounded-full flex items-center justify-center
                     transition-all hover:scale-105 active:scale-95 disabled:opacity-40 shadow-lg"
          style={{ backgroundColor: `rgb(${accent.r},${accent.g},${accent.b})` }}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 text-white" />
          ) : (
            <Play className="w-6 h-6 text-white ml-0.5" />
          )}
        </button>

        {/* Next (opcional) */}
        {hasNext && (
          <button
            onClick={onNext}
            className="text-white/50 hover:text-white transition-colors"
            title="Próximo"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        )}

        {/* Skip +10s */}
        <button
          onClick={() => skip(10)}
          disabled={!isReady}
          className="text-white/50 hover:text-white transition-colors disabled:opacity-30 flex flex-col items-center gap-0.5"
          title="+10s"
        >
          <SkipForward className="w-4 h-4" />
          <span className="text-[9px] text-white/40">+10s</span>
        </button>

        {/* Volume */}
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={toggleMute} className="text-white/50 hover:text-white transition-colors">
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={handleVolume}
            className="w-20 h-1 cursor-pointer"
            style={{ accentColor: `rgb(${accent.r},${accent.g},${accent.b})` }}
          />
        </div>
      </div>
    </div>
  )
}
