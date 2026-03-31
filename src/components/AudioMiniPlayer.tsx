import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize2, Music } from 'lucide-react'

interface AudioMiniPlayerProps {
  src: string
  title?: string
  meta?: string
  onOpenGallery?: () => void
}

const BAR_COUNT = 40

export const AudioMiniPlayer = ({
  src,
  title = 'Áudio',
  meta,
  onOpenGallery,
}: AudioMiniPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const barsRef = useRef<number[]>(Array(BAR_COUNT).fill(0.08))

  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [isReady, setIsReady] = useState(false)

  // ─── Formatar tempo ───────────────────────────────────────────────────────
  const fmt = (s: number) => {
    if (!isFinite(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  // ─── Inicializar AudioContext na primeira reprodução ──────────────────────
  const initAudioContext = useCallback(() => {
    if (audioCtxRef.current || !audioRef.current) return
    const ctx = new AudioContext()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.8
    const source = ctx.createMediaElementSource(audioRef.current)
    source.connect(analyser)
    analyser.connect(ctx.destination)
    audioCtxRef.current = ctx
    analyserRef.current = analyser
    sourceRef.current = source
  }, [])

  // ─── Loop de animação do waveform ─────────────────────────────────────────
  const drawBars = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    const analyser = analyserRef.current

    if (analyser) {
      const data = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteFrequencyData(data)
      const step = Math.floor(data.length / BAR_COUNT)
      for (let i = 0; i < BAR_COUNT; i++) {
        const raw = data[i * step] / 255
        // suavização exponencial
        barsRef.current[i] += (raw - barsRef.current[i]) * 0.3
      }
    } else {
      // idle — respira suavemente
      const t = Date.now() / 1000
      for (let i = 0; i < BAR_COUNT; i++) {
        barsRef.current[i] = 0.05 + 0.03 * Math.sin(t * 1.5 + i * 0.4)
      }
    }

    ctx.clearRect(0, 0, W, H)

    const barW = (W - (BAR_COUNT - 1) * 2) / BAR_COUNT
    const accentR = 229, accentG = 57, accentB = 53 // --color-primary via CSS var não acessível no canvas

    for (let i = 0; i < BAR_COUNT; i++) {
      const barH = Math.max(3, barsRef.current[i] * H * 0.85)
      const x = i * (barW + 2)
      const y = (H - barH) / 2
      const alpha = 0.4 + barsRef.current[i] * 0.6
      ctx.fillStyle = `rgba(${accentR}, ${accentG}, ${accentB}, ${alpha})`
      const radius = Math.min(barW / 2, 3)
      ctx.beginPath()
      ctx.roundRect(x, y, barW, barH, radius)
      ctx.fill()
    }

    animFrameRef.current = requestAnimationFrame(drawBars)
  }, [])

  // ─── Inicia / pausa animação conforme estado ──────────────────────────────
  useEffect(() => {
    cancelAnimationFrame(animFrameRef.current)
    drawBars()
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [drawBars])

  // ─── Cleanup ao desmontar ─────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current)
      audioCtxRef.current?.close()
    }
  }, [])

  // ─── Sync de eventos do elemento <audio> ─────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onLoaded = () => {
      setDuration(audio.duration)
      setIsReady(true)
    }
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      setProgress(audio.duration ? audio.currentTime / audio.duration : 0)
    }
    const onEnded = () => setIsPlaying(false)

    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('ended', onEnded)
    audio.volume = volume

    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('ended', onEnded)
    }
  }, [src])

  // ─── Toggle play / pause ──────────────────────────────────────────────────
  const togglePlay = async () => {
    const audio = audioRef.current
    if (!audio) return
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

  // ─── Seek por clique na barra de progresso ────────────────────────────────
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    audio.currentTime = ratio * duration
  }

  // ─── Volume ───────────────────────────────────────────────────────────────
  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    if (audioRef.current) audioRef.current.volume = v
    if (v === 0) setIsMuted(true)
    else setIsMuted(false)
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return
    const next = !isMuted
    audio.muted = next
    setIsMuted(next)
  }

  return (
    <div className="w-full bg-surface border border-border rounded-2xl overflow-hidden">
      {/* Elemento de áudio oculto */}
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Cabeçalho */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
          <Music className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{title}</p>
          {meta && <p className="text-xs text-muted">{meta}</p>}
        </div>
        {onOpenGallery && (
          <button
            onClick={onOpenGallery}
            title="Abrir na galeria"
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>ABRIR</span>
          </button>
        )}
      </div>

      {/* Waveform Canvas */}
      <div className="px-4 py-2">
        <canvas
          ref={canvasRef}
          width={600}
          height={48}
          className="w-full h-12 rounded-lg"
        />
      </div>

      {/* Barra de progresso (seek) */}
      <div className="px-4 pb-1">
        <div
          className="relative h-1.5 bg-border rounded-full cursor-pointer group"
          onClick={handleSeek}
        >
          <div
            className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
            style={{ width: `${progress * 100}%` }}
          />
          {/* thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progress * 100}% - 6px)` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted tabular-nums">{fmt(currentTime)}</span>
          <span className="text-[10px] text-muted tabular-nums">{fmt(duration)}</span>
        </div>
      </div>

      {/* Controles */}
      <div className="flex items-center gap-3 px-4 pb-4">
        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          disabled={!isReady}
          className="w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40 flex-shrink-0 shadow-md"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 text-white" />
          ) : (
            <Play className="w-4 h-4 text-white ml-0.5" />
          )}
        </button>

        {/* Volume */}
        <button
          onClick={toggleMute}
          className="flex-shrink-0 text-muted hover:text-foreground transition-colors"
        >
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
          className="flex-1 h-1 accent-primary cursor-pointer"
        />
      </div>
    </div>
  )
}
