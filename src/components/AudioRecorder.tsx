import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, Square, Play, Pause, Trash2, Check,
  Loader2, AlertCircle, MicOff
} from 'lucide-react'

const MAX_SECONDS = 60 // 1 minuto

type Phase = 'idle' | 'recording' | 'preview' | 'uploading'

interface AudioRecorderProps {
  /** Chamado com o File gravado após o usuário confirmar */
  onSave: (file: File) => Promise<void>
  /** Desabilitado quando já atingiu o limite de áudios */
  disabled?: boolean
}

export const AudioRecorder = ({ onSave, disabled = false }: AudioRecorderProps) => {
  const [phase, setPhase] = useState<Phase>('idle')
  const [seconds, setSeconds] = useState(0)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bars, setBars] = useState<number[]>(Array(20).fill(4))

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)

  // Limpa recursos ao desmontar
  useEffect(() => {
    return () => {
      stopStream()
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [])

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (timerRef.current) clearInterval(timerRef.current)
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
  }

  const animateBars = (analyser: AnalyserNode) => {
    const data = new Uint8Array(analyser.frequencyBinCount)
    const tick = () => {
      analyser.getByteFrequencyData(data)
      const step = Math.floor(data.length / 20)
      const newBars = Array.from({ length: 20 }, (_, i) => {
        const v = data[i * step] / 255
        return Math.max(4, Math.round(v * 40))
      })
      setBars(newBars)
      animFrameRef.current = requestAnimationFrame(tick)
    }
    tick()
  }

  const startRecording = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Waveform via AnalyserNode
      const ctx = new AudioContext()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser
      animateBars(analyser)

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : ''

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunksRef.current = []

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const recorded = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm'
        })
        setBlob(recorded)
        const url = URL.createObjectURL(recorded)
        setPreviewUrl(url)
        setPhase('preview')
        setBars(Array(20).fill(4))
      }

      mediaRecorderRef.current = recorder
      recorder.start(100)
      setSeconds(0)
      setPhase('recording')

      // Cronômetro com auto-stop em MAX_SECONDS
      timerRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev + 1 >= MAX_SECONDS) {
            stopRecording()
            return MAX_SECONDS
          }
          return prev + 1
        })
      }, 1000)
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Permissão de microfone negada. Verifique as configurações do navegador.')
      } else {
        setError('Não foi possível acessar o microfone.')
      }
    }
  }

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    mediaRecorderRef.current?.stop()
    stopStream()
  }, [])

  const discard = () => {
    audioRef.current?.pause()
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setBlob(null)
    setPreviewUrl(null)
    setIsPlaying(false)
    setSeconds(0)
    setPhase('idle')
  }

  const togglePreview = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const confirm = async () => {
    if (!blob) return
    setPhase('uploading')
    try {
      const ext = blob.type.includes('ogg') ? 'ogg' : 'webm'
      const file = new File(
        [blob],
        `gravacao-${Date.now()}.${ext}`,
        { type: blob.type }
      )
      await onSave(file)
      discard()
    } catch {
      setError('Erro ao salvar a gravação. Tente novamente.')
      setPhase('preview')
    }
  }

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const progress = (seconds / MAX_SECONDS) * 100

  return (
    <div className="rounded-xl border border-border bg-background p-4 space-y-3">

      {/* Erro */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* IDLE */}
      {phase === 'idle' && (
        <button
          onClick={startRecording}
          disabled={disabled}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-primary/40
            hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Mic className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-white">Gravar áudio (máx. 1 min)</span>
        </button>
      )}

      {/* RECORDING */}
      {phase === 'recording' && (
        <div className="space-y-3">
          {/* Waveform */}
          <div className="flex items-center justify-center gap-[3px] h-12">
            {bars.map((h, i) => (
              <motion.div
                key={i}
                animate={{ height: h }}
                transition={{ duration: 0.08 }}
                className="w-[3px] rounded-full bg-primary"
                style={{ minHeight: 4 }}
              />
            ))}
          </div>

          {/* Cronômetro + barra de progresso */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
                Gravando…
              </span>
              <span>{fmtTime(seconds)} / {fmtTime(MAX_SECONDS)}</span>
            </div>
            <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Botão parar */}
          <button
            onClick={stopRecording}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 border border-red-500/40
              hover:bg-red-500/20 transition-colors text-red-400 font-semibold text-sm"
          >
            <Square className="w-4 h-4" />Parar gravação
          </button>
        </div>
      )}

      {/* PREVIEW */}
      {phase === 'preview' && previewUrl && (
        <div className="space-y-3">
          <p className="text-xs text-muted text-center">Ouça antes de salvar</p>

          {/* Player simples */}
          <div className="flex items-center gap-3 px-4 py-3 bg-primary/10 border border-primary/30 rounded-xl">
            <button
              onClick={togglePreview}
              className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity"
            >
              {isPlaying
                ? <Pause className="w-4 h-4 text-background" />
                : <Play className="w-4 h-4 text-background ml-0.5" />}
            </button>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white truncate">Gravação — {fmtTime(seconds)}</p>
              <p className="text-[11px] text-green-400">Pronto para salvar</p>
            </div>
          </div>

          <audio
            ref={audioRef}
            src={previewUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />

          {/* Ações */}
          <div className="flex gap-2">
            <button
              onClick={discard}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border text-muted
                hover:border-red-500/50 hover:text-red-400 transition-colors text-sm font-semibold"
            >
              <Trash2 className="w-4 h-4" />Descartar
            </button>
            <button
              onClick={confirm}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-background
                hover:opacity-90 transition-opacity text-sm font-semibold"
            >
              <Check className="w-4 h-4" />Usar este áudio
            </button>
          </div>
        </div>
      )}

      {/* UPLOADING */}
      {phase === 'uploading' && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />Salvando gravação…
        </div>
      )}
    </div>
  )
}
