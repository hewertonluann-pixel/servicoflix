import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  Image as ImageIcon,
  Video,
  Music,
  X,
  Play,
  Pause,
  Loader2,
  AlertCircle,
  CheckCircle,
  Mic
} from 'lucide-react'
import type { MediaItem, MediaType, MediaUploadLimits } from '@/types'
import { AudioRecorder } from '@/components/AudioRecorder'

interface MediaUploaderProps {
  value: MediaItem[]
  onChange: (items: MediaItem[]) => void
  maxItems?: number
  allowedTypes?: MediaType[]
  limits?: MediaUploadLimits
  mode?: 'single' | 'multiple'
}

const DEFAULT_LIMITS: MediaUploadLimits = {
  photos: {
    maxSize: 5,
    maxCount: 20,
    allowedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
  },
  videos: {
    maxSize: 50,
    maxCount: 10,
    maxDuration: 300,
    allowedFormats: ['video/mp4', 'video/webm', 'video/quicktime']
  },
  audios: {
    maxSize: 10,
    maxCount: 5,
    maxDuration: 60, // 1 minuto
    allowedFormats: [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg',
      'audio/webm', 'audio/webm;codecs=opus', 'audio/ogg;codecs=opus'
    ]
  }
}

// Sub-aba do painel de áudio
type AudioTab = 'upload' | 'record'

export const MediaUploader = ({
  value,
  onChange,
  maxItems = 20,
  allowedTypes = ['photo', 'video', 'audio'],
  limits = DEFAULT_LIMITS,
  mode = 'multiple'
}: MediaUploaderProps) => {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const [audioTab, setAudioTab] = useState<AudioTab>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({})

  const getMediaType = (file: File): MediaType | null => {
    if (file.type.startsWith('image/')) return 'photo'
    if (file.type.startsWith('video/')) return 'video'
    if (file.type.startsWith('audio/')) return 'audio'
    return null
  }

  const validateFile = (file: File, type: MediaType): string | null => {
    const limit = limits[`${type}s` as keyof MediaUploadLimits] as any
    // Formatos: para webm gravado aceita sem verificar mimeType estrito
    const isRecordedAudio = type === 'audio' &&
      (file.type.includes('webm') || file.type.includes('ogg'))
    if (!isRecordedAudio && !limit.allowedFormats.includes(file.type)) {
      return `Formato ${file.type} não permitido para ${type === 'photo' ? 'fotos' : type === 'video' ? 'vídeos' : 'áudios'}`
    }
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > limit.maxSize) {
      return `Arquivo muito grande. Máximo: ${limit.maxSize}MB`
    }
    const currentCount = value.filter(item => item.type === type).length
    if (currentCount >= limit.maxCount) {
      return `Máximo de ${limit.maxCount} ${type === 'photo' ? 'fotos' : type === 'video' ? 'vídeos' : 'áudios'} atingido`
    }
    return null
  }

  const processFile = async (file: File): Promise<MediaItem | null> => {
    const type = getMediaType(file)
    if (!type || !allowedTypes.includes(type)) {
      setError(`Tipo de arquivo não permitido: ${file.name}`)
      return null
    }
    const validationError = validateFile(file, type)
    if (validationError) { setError(validationError); return null }

    const url = URL.createObjectURL(file)
    let thumbnailUrl: string | undefined
    let duration: number | undefined

    if (type === 'video') {
      const videoElement = document.createElement('video')
      videoElement.src = url
      await new Promise(resolve => {
        videoElement.onloadedmetadata = () => {
          duration = Math.floor(videoElement.duration)
          videoElement.currentTime = 1
        }
        videoElement.onseeked = () => {
          const canvas = document.createElement('canvas')
          canvas.width = videoElement.videoWidth
          canvas.height = videoElement.videoHeight
          canvas.getContext('2d')?.drawImage(videoElement, 0, 0)
          thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7)
          resolve(null)
        }
      })
    }

    if (type === 'audio') {
      const audioElement = new Audio(url)
      await new Promise(resolve => {
        audioElement.onloadedmetadata = () => {
          duration = Math.floor(audioElement.duration)
          resolve(null)
        }
        audioElement.onerror = () => resolve(null)
      })
    }

    return {
      id: `${Date.now()}-${Math.random()}`,
      type,
      url,
      thumbnailUrl,
      title: file.name,
      duration,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      order: value.length
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setError(null)
    setUploading(true)
    try {
      const newItems: MediaItem[] = []
      for (const file of files) {
        const item = await processFile(file)
        if (item) newItems.push(item)
        if (mode === 'single') break
      }
      if (mode === 'single') onChange(newItems)
      else onChange([...value, ...newItems])
    } catch { setError('Erro ao fazer upload dos arquivos') }
    finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Chamado pelo AudioRecorder após confirmação do usuário
  const handleRecordedAudio = async (file: File) => {
    setError(null)
    const item = await processFile(file)
    if (item) {
      onChange(mode === 'single' ? [item] : [...value, item])
    }
  }

  const handleRemove = (id: string) => {
    onChange(value.filter(item => item.id !== id))
    if (playingAudio === id) {
      audioRefs.current[id]?.pause()
      setPlayingAudio(null)
    }
  }

  const toggleAudio = (item: MediaItem) => {
    if (playingAudio === item.id) {
      audioRefs.current[item.id]?.pause()
      setPlayingAudio(null)
    } else {
      Object.values(audioRefs.current).forEach(a => a.pause())
      setPlayingAudio(null)
      const audio = audioRefs.current[item.id] || new Audio(item.url)
      audioRefs.current[item.id] = audio
      audio.play()
      setPlayingAudio(item.id)
      audio.onended = () => setPlayingAudio(null)
    }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return ''
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatSize = (bytes?: number) => {
    if (!bytes) return ''
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  const getAcceptString = () => {
    const accepts: string[] = []
    if (allowedTypes.includes('photo')) accepts.push('image/*')
    if (allowedTypes.includes('video')) accepts.push('video/*')
    if (allowedTypes.includes('audio')) accepts.push('audio/*')
    return accepts.join(',')
  }

  const canAddMore = mode === 'single' ? value.length === 0 : value.length < maxItems
  const audioCount = value.filter(i => i.type === 'audio').length
  const audioAtLimit = audioCount >= (limits.audios?.maxCount ?? 5)

  return (
    <div className="space-y-4">

      {/* ── Botão upload geral (fotos/vídeos) ── */}
      {canAddMore && (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-background border-2 border-dashed border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <><Loader2 className="w-5 h-5 animate-spin text-primary" /><span className="text-sm font-semibold text-muted">Enviando...</span></>
          ) : (
            <><Upload className="w-5 h-5 text-primary" /><span className="text-sm font-semibold text-white">{mode === 'single' ? 'Adicionar mídia' : `Adicionar mídias (${value.length}/${maxItems})`}</span></>
          )}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={getAcceptString()}
        multiple={mode === 'multiple'}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* ── Painel de áudio: abas Upload / Gravar ── */}
      {allowedTypes.includes('audio') && (
        <div className="rounded-xl border border-border overflow-hidden">
          {/* Cabeçalho com abas */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setAudioTab('upload')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors
                ${audioTab === 'upload'
                  ? 'bg-primary/10 text-primary border-b-2 border-primary'
                  : 'text-muted hover:text-white'}`}
            >
              <Music className="w-3.5 h-3.5" />Upload de áudio
            </button>
            <button
              onClick={() => setAudioTab('record')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors
                ${audioTab === 'record'
                  ? 'bg-primary/10 text-primary border-b-2 border-primary'
                  : 'text-muted hover:text-white'}`}
            >
              <Mic className="w-3.5 h-3.5" />Gravar agora
            </button>
          </div>

          {/* Conteúdo da aba */}
          <div className="p-3">
            {audioTab === 'upload' ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || audioAtLimit}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-xl
                  hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold text-white"
              >
                <Upload className="w-4 h-4 text-primary" />
                {audioAtLimit ? 'Limite de áudios atingido' : 'Selecionar arquivo de áudio'}
              </button>
            ) : (
              <AudioRecorder
                onSave={handleRecordedAudio}
                disabled={audioAtLimit}
              />
            )}
          </div>
        </div>
      )}

      {/* Erros */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg"
          >
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grade de mídias */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <AnimatePresence>
            {value.map(item => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative aspect-square bg-background border border-border rounded-xl overflow-hidden group"
              >
                {item.type === 'photo' && (
                  <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
                )}

                {item.type === 'video' && (
                  <div className="relative w-full h-full">
                    {item.thumbnailUrl
                      ? <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-surface flex items-center justify-center"><Video className="w-8 h-8 text-muted" /></div>}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <Play className="w-6 h-6 text-white ml-1" />
                      </div>
                    </div>
                    {item.duration && (
                      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-white">{formatDuration(item.duration)}</div>
                    )}
                  </div>
                )}

                {item.type === 'audio' && (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-green-900/30 flex flex-col items-center justify-center gap-2 p-4">
                    <Music className="w-8 h-8 text-primary" />
                    <button
                      onClick={() => toggleAudio(item)}
                      className="w-12 h-12 bg-primary rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
                    >
                      {playingAudio === item.id
                        ? <Pause className="w-5 h-5 text-background" />
                        : <Play className="w-5 h-5 text-background ml-0.5" />}
                    </button>
                    {item.duration && <span className="text-xs text-muted">{formatDuration(item.duration)}</span>}
                  </div>
                )}

                {/* Overlay remoção */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-2">
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>

                {/* Badge tipo */}
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded flex items-center gap-1">
                  {item.type === 'photo' && <ImageIcon className="w-3 h-3 text-white" />}
                  {item.type === 'video' && <Video className="w-3 h-3 text-white" />}
                  {item.type === 'audio' && <Music className="w-3 h-3 text-white" />}
                  <span className="text-[10px] text-white uppercase">
                    {item.type === 'photo' ? 'Foto' : item.type === 'video' ? 'Vídeo' : 'Áudio'}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Info */}
      <div className="flex items-start gap-2 px-4 py-3 bg-primary/5 border border-primary/20 rounded-lg">
        <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
        <div className="text-xs text-muted space-y-1">
          <p><strong className="text-white">Formatos aceitos:</strong></p>
          <ul className="list-disc list-inside space-y-0.5">
            {allowedTypes.includes('photo') && (
              <li>Fotos: JPG, PNG, WebP (máx {limits.photos.maxSize}MB cada)</li>
            )}
            {allowedTypes.includes('video') && (
              <li>Vídeos: MP4, WebM (máx {limits.videos.maxSize}MB e {limits.videos.maxDuration / 60}min)</li>
            )}
            {allowedTypes.includes('audio') && (
              <li>Áudios: MP3, WAV, OGG ou gravação direta (máx 1 min)</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
