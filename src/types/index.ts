import { Timestamp } from 'firebase/firestore'

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

export interface Category {
  id: string
  name: string
  icon: string
  description: string
  providerCount: number
}

// ===== AVALIAÇÕES =====

export interface ReviewReply {
  text: string
  createdAt: Timestamp
  providerName: string
  providerAvatar: string
}

export interface Review {
  id: string
  providerId: string
  clientId: string
  clientName: string
  clientAvatar: string
  rating: number
  comment: string
  verified: boolean       // true = teve conversa com o prestador (badge "Serviço verificado")
  chatId?: string         // referência ao chat que originou a avaliação
  reply?: ReviewReply     // resposta do prestador
  createdAt: Timestamp
  updatedAt?: Timestamp
  // legado — mantidos para compatibilidade com mocks existentes
  userName?: string
  userAvatar?: string
  date?: string
  images?: string[]
}

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

// Sistema de perfil duplo
export type UserRole = 'client' | 'provider'

export interface ClientProfile {
  phone?: string
  address?: string
  city?: string
  neighborhood?: string
  preferences?: string[]
}

// ===== REDES SOCIAIS =====

export interface SocialLinks {
  instagram?: string
  facebook?: string
  youtube?: string
  whatsapp?: string // Apenas número com DDD
  tiktok?: string
  linkedin?: string
  website?: string
}

// ===== NOVO SISTEMA DE MÍDIA =====

export type MediaType = 'photo' | 'video' | 'audio'

export interface MediaItem {
  id: string
  type: MediaType
  url: string
  thumbnailUrl?: string // Para vídeos
  title?: string
  description?: string
  duration?: number // Em segundos (para vídeos e áudios)
  size?: number // Em bytes
  uploadedAt: string
  order?: number // Para ordenar itens
}

export interface ProviderMedia {
  presentation?: MediaItem // Vídeo ou áudio de apresentação
  portfolio: MediaItem[] // Mix de fotos, vídeos e áudios
}

export interface MediaUploadLimits {
  photos: {
    maxSize: number // em MB
    maxCount: number
    allowedFormats: string[]
  }
  videos: {
    maxSize: number
    maxCount: number
    maxDuration: number // em segundos
    allowedFormats: string[]
  }
  audios: {
    maxSize: number
    maxCount: number
    maxDuration: number
    allowedFormats: string[]
  }
}

export interface ProviderProfile {
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
  media?: ProviderMedia
  socialLinks?: SocialLinks
}

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  roles: UserRole[]
  createdAt: string

  // Perfis opcionais
  clientProfile?: ClientProfile
  providerProfile?: ProviderProfile
}
