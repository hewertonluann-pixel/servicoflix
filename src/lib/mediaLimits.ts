import type { MediaUploadLimits } from '@/types'

// Limites de upload por tipo de plano
export const MEDIA_LIMITS_BY_PLAN = {
  free: {
    photos: {
      maxSize: 3, // 3MB
      maxCount: 3,
      allowedFormats: ['image/jpeg', 'image/png', 'image/webp']
    },
    videos: {
      maxSize: 20, // 20MB
      maxCount: 0, // Sem vídeos no plano grátis
      maxDuration: 0,
      allowedFormats: []
    },
    audios: {
      maxSize: 5, // 5MB
      maxCount: 0, // Sem áudios no plano grátis
      maxDuration: 0,
      allowedFormats: []
    }
  },

  basic: {
    photos: {
      maxSize: 5, // 5MB
      maxCount: 10,
      allowedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    },
    videos: {
      maxSize: 30, // 30MB
      maxCount: 3,
      maxDuration: 120, // 2 minutos
      allowedFormats: ['video/mp4', 'video/webm']
    },
    audios: {
      maxSize: 5, // 5MB
      maxCount: 2,
      maxDuration: 180, // 3 minutos
      allowedFormats: ['audio/mpeg', 'audio/mp3']
    }
  },

  professional: {
    photos: {
      maxSize: 10, // 10MB
      maxCount: 30,
      allowedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    },
    videos: {
      maxSize: 100, // 100MB
      maxCount: 10,
      maxDuration: 300, // 5 minutos
      allowedFormats: ['video/mp4', 'video/webm', 'video/quicktime']
    },
    audios: {
      maxSize: 15, // 15MB
      maxCount: 5,
      maxDuration: 600, // 10 minutos
      allowedFormats: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg']
    }
  },

  premium: {
    photos: {
      maxSize: 20, // 20MB
      maxCount: -1, // Ilimitado
      allowedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/heic']
    },
    videos: {
      maxSize: 200, // 200MB
      maxCount: -1, // Ilimitado
      maxDuration: 900, // 15 minutos
      allowedFormats: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
    },
    audios: {
      maxSize: 30, // 30MB
      maxCount: -1, // Ilimitado
      maxDuration: 1800, // 30 minutos
      allowedFormats: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/flac']
    }
  }
} as const

export type PlanType = keyof typeof MEDIA_LIMITS_BY_PLAN

// Função para obter limites do plano
export const getMediaLimits = (plan: PlanType): MediaUploadLimits => {
  return MEDIA_LIMITS_BY_PLAN[plan] as MediaUploadLimits
}

// Função para validar se pode fazer upload
export const canUpload = (
  plan: PlanType,
  mediaType: 'photos' | 'videos' | 'audios',
  currentCount: number
): boolean => {
  const limits = MEDIA_LIMITS_BY_PLAN[plan]
  const typeLimit = limits[mediaType].maxCount
  
  if (typeLimit === -1) return true // Ilimitado
  if (typeLimit === 0) return false // Não permitido
  return currentCount < typeLimit
}

// Descritor de recursos por plano (para exibição)
export const PLAN_MEDIA_FEATURES = {
  free: {
    name: 'Gratuito',
    description: 'Apenas fotos básicas',
    features: [
      'Até 3 fotos',
      'Máximo 3MB por foto',
      'Sem vídeos',
      'Sem áudios'
    ]
  },
  basic: {
    name: 'Básico',
    description: 'Fotos e vídeos curtos',
    features: [
      'Até 10 fotos (5MB cada)',
      'Até 3 vídeos (30MB, 2min)',
      'Até 2 áudios (5MB, 3min)',
      'Formatos básicos'
    ]
  },
  professional: {
    name: 'Profissional',
    description: 'Portfólio completo',
    features: [
      'Até 30 fotos (10MB cada)',
      'Até 10 vídeos (100MB, 5min)',
      'Até 5 áudios (15MB, 10min)',
      'Todos os formatos'
    ]
  },
  premium: {
    name: 'Premium',
    description: 'Sem limites',
    features: [
      'Fotos ilimitadas (20MB cada)',
      'Vídeos ilimitados (200MB, 15min)',
      'Áudios ilimitados (30MB, 30min)',
      'Formatos premium (HEIC, FLAC)'
    ]
  }
} as const

// Casos de uso por categoria de serviço
export const MEDIA_USE_CASES = {
  visual_services: {
    name: 'Serviços Visuais',
    examples: ['Pintura', 'Marcenaria', 'Design', 'Fotografia', 'Arquitetura'],
    recommendedMedia: ['photos', 'videos'],
    description: 'Fotos de trabalhos anteriores e vídeos curtos do processo'
  },
  audio_services: {
    name: 'Serviços de Áudio',
    examples: ['Locutor', 'Músico', 'Professor de música', 'Podcast', 'Dublagem'],
    recommendedMedia: ['audios', 'photos'],
    description: 'Áudios de demos, samples de trabalhos e fotos do estúdio/equipamentos'
  },
  performance_services: {
    name: 'Serviços de Performance',
    examples: ['Personal Trainer', 'Dança', 'Teatro', 'Apresentador', 'Coaching'],
    recommendedMedia: ['videos', 'photos'],
    description: 'Vídeos de demonstração e fotos de eventos/sessões'
  },
  technical_services: {
    name: 'Serviços Técnicos',
    examples: ['Eletrônica', 'Encanamento', 'Elétrica', 'Mecânica', 'Informática'],
    recommendedMedia: ['photos', 'videos'],
    description: 'Fotos antes/depois e vídeos tutoriais curtos'
  }
} as const

// Função helper para formatar tamanho de arquivo
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

// Função helper para formatar duração
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}
