import { Timestamp } from 'firebase/firestore'

// ===== ROLES =====

export type UserRole = 'client' | 'provider'

// ===== PROVIDER =====

export interface Provider {
  id: string
  name: string
  specialty: string
  avatar: string
  coverImage?: string
  rating: number
  reviewCount: number
  priceFrom: number
  city: string
  neighborhood: string
  verified: boolean
  bio: string
  skills: string[]
  categories: string[]
  availability: string[]
  responseTime: string
  completedJobs: number
  media?: ProviderMedia
  socialLinks?: SocialLinks
}

export interface ProviderProfile {
  professionalName?: string       // nome profissional (pode diferir do name pessoal)
  specialty: string
  bio: string
  city: string
  neighborhood: string
  priceFrom: number
  skills: string[]
  categories: string[]
  availability?: string[]
  responseTime?: string
  completedJobs?: number
  verified?: boolean
  coverImage?: string
  phone?: string
  media?: ProviderMedia
  socialLinks?: SocialLinks
  videos?: {
    presentation?: string
    portfolio?: string[]
  }
}

// ===== CLIENT =====

export interface ClientProfile {
  phone?: string
  address?: string
  city?: string
  neighborhood?: string
  preferences?: string[]
}

// ===== USER =====

export interface User {
  id: string
  email: string
  name: string              // nome PESSOAL — sempre presente, nunca substituir por professionalName
  avatar?: string           // foto PESSOAL — usada em chats, avaliações, comentários
  roles: UserRole[]         // ['client'] por padrão; ['client','provider'] se for prestador
  createdAt: string

  clientProfile?: ClientProfile
  providerProfile?: ProviderProfile
}

// ===== AVALIAÇÕES =====

export interface ReviewReply {
  text: string
  createdAt: Timestamp
}

export interface Review {
  id: string
  providerId: string
  clientId: string
  clientName: string        // nome do perfil escolhido (pessoal ou profissional)
  clientAvatar: string      // avatar do perfil escolhido
  rating: number
  comment: string
  verified: boolean         // true = teve conversa no chat (badge "Serviço verificado")
  chatId?: string | null    // referência ao chat que originou a avaliação
  reviewerRole?: 'client' | 'provider'  // qual perfil assinou a avaliação
  reply?: ReviewReply       // resposta do prestador
  createdAt: Timestamp
  updatedAt?: Timestamp

  // ← legado: mantidos para compatibilidade com mocks existentes
  userName?: string
  userAvatar?: string
  date?: string
  images?: string[]
}

// ===== CATEGORIAS =====

export interface Category {
  id: string
  name: string
  icon: string
  description: string
  providerCount: number
}

// ===== SERVIÇOS =====

export type ServiceStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'

export interface ServiceRequest {
  id: string
  providerId: string
  providerName: string
  providerAvatar: string
  service: string
  description: string
  status: ServiceStatus
  price: number
  scheduledDate: string
  createdAt: string
  updatedAt: string
}

export interface ServiceHistory {
  id: string
  providerId: string
  providerName: string
  providerAvatar: string
  service: string
  completedAt: string
  rating?: number
  review?: string
  price: number
  duration: string
}

// ===== REDES SOCIAIS =====

export interface SocialLinks {
  instagram?: string
  facebook?: string
  youtube?: string
  whatsapp?: string   // apenas número com DDD, ex: "38999999999"
  tiktok?: string
  linkedin?: string
  website?: string
}

// ===== MÍDIA =====

export type MediaType = 'photo' | 'video' | 'audio'

export interface MediaItem {
  id: string
  type: MediaType
  url: string
  thumbnailUrl?: string   // para vídeos
  title?: string
  description?: string
  duration?: number       // em segundos (vídeos e áudios)
  size?: number           // em bytes
  uploadedAt: string
  order?: number          // para ordenação manual
}

export interface ProviderMedia {
  presentation?: MediaItem    // vídeo ou áudio de apresentação
  portfolio: MediaItem[]      // mix de fotos, vídeos e áudios
}

export interface MediaUploadLimits {
  photos: {
    maxSize: number           // em MB
    maxCount: number
    allowedFormats: string[]
  }
  videos: {
    maxSize: number
    maxCount: number
    maxDuration: number       // em segundos
    allowedFormats: string[]
  }
  audios: {
    maxSize: number
    maxCount: number
    maxDuration: number
    allowedFormats: string[]
  }
}
