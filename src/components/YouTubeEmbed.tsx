import { useState } from 'react'
import { Play } from 'lucide-react'

interface YouTubeEmbedProps {
  videoUrl: string
  autoplay?: boolean
  title?: string
  className?: string
  showThumbnail?: boolean
  forceVertical?: boolean  // Força formato vertical (para Shorts/Reels)
}

export const YouTubeEmbed = ({ 
  videoUrl, 
  autoplay = false, 
  title = 'Vídeo', 
  className = '',
  showThumbnail = false,
  forceVertical = false
}: YouTubeEmbedProps) => {
  const [playing, setPlaying] = useState(!showThumbnail)
  const videoId = extractVideoId(videoUrl)
  const isShort = isYouTubeShort(videoUrl) || forceVertical

  if (!videoId) {
    return (
      <div className={`aspect-video w-full bg-surface border border-border rounded-xl flex items-center justify-center ${className}`}>
        <p className="text-muted text-sm">Link de vídeo inválido</p>
      </div>
    )
  }

  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}&rel=0`

  // Define aspect ratio baseado no tipo de vídeo
  const aspectClass = isShort 
    ? 'aspect-[9/16] max-h-[600px] mx-auto' // Vertical (Shorts/Reels)
    : 'aspect-video' // Horizontal (vídeos normais)

  if (showThumbnail && !playing) {
    return (
      <div 
        onClick={() => setPlaying(true)}
        className={`relative ${aspectClass} w-full rounded-xl overflow-hidden cursor-pointer group ${className}`}
      >
        <img 
          src={thumbnailUrl} 
          alt={title}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback para thumbnail padrão
            e.currentTarget.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
          }}
        />
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Play className="w-8 h-8 text-background ml-1" fill="currentColor" />
          </div>
        </div>
        {isShort && (
          <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-xs text-white font-semibold">
            Short
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`${aspectClass} w-full rounded-xl overflow-hidden ${className}`}>
      <iframe
        src={embedUrl}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      />
    </div>
  )
}

// Função para extrair o ID do vídeo
export function extractVideoId(url: string): string | null {
  if (!url) return null
  
  const patterns = [
    // Vídeos normais
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\?]+)/,
    /youtube\.com\/embed\/([^&\?]+)/,
    /youtube\.com\/v\/([^&\?]+)/,
    // YouTube Shorts
    /youtube\.com\/shorts\/([^&\?]+)/,
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) return match[1]
  }
  
  return null
}

// Detecta se é um YouTube Short
export function isYouTubeShort(url: string): boolean {
  return url.includes('/shorts/')
}

// Função para validar URL do YouTube
export function isValidYouTubeUrl(url: string): boolean {
  return extractVideoId(url) !== null
}
