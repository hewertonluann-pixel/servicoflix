import { Timestamp } from 'firebase/firestore'

// ===== ROLES =====

export type UserRole = 'client' | 'provider'

// ===== PROVIDER STATUS (NOVO) =====

export type ProviderStatus = 'pendente' | 'ativo' | 'expirado' | 'bloqueado'

export type CreditoTipo = 'assinatura' | 'credito' | 'manual' | 'bonus'

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

  // ===== NOVOS CAMPOS =====
  diasScore: number                        // dias de acesso restantes
  status: ProviderStatus                   // estado atual do prestador
  stripeCustomerId?: string | null         // ID do cliente na Stripe
  stripeSubscriptionId?: string | null     // ID da assinatura mensal ativa
}

export interface ProviderProfile {
  professionalName?: string
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

  // ===== NOVOS CAMPOS =====
  diasScore?: number
  status?: ProviderStatus
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
}

// ===== HISTÓRICO DE CRÉDITOS (NOVO) =====

export interface HistoricoCredito {
  id: string
  providerId: string
  tipo: CreditoTipo
  dias: number                             // quantos dias foram adicionados
  valor: number                            // valor pago em reais
  stripePaymentId?: string | null          // referência do pagamento na Stripe
  observacao?: string | null               // ex: "Renovado pelo admin"
  createdAt: Timestamp
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
  name: string
  avatar?: string
  roles: UserRole[]
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
  clientName: string
  clientAvatar: string
  rating: number
  comment: string
  verified: boolean
  chatId?: string | null
  reviewerRole?: 'client' | 'provider'
  reply?: ReviewReply
  createdAt: Timestamp
  updatedAt?: Timestamp

  // ← legado
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
  whatsapp?: string
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
  thumbnailUrl?: string
  title?: string
  description?: string
  duration?: number
  size?: number
  uploadedAt: string
  order?: number
}

export interface ProviderMedia {
  presentation?: MediaItem
  portfolio: MediaItem[]
}

export interface MediaUploadLimits {
  photos: {
    maxSize: number
    maxCount: number
    allowedFormats: string[]
  }
  videos: {
    maxSize: number
    maxCount: number
    maxDuration: number
    allowedFormats: string[]
  }
  audios: {
    maxSize: number
    maxCount: number
    maxDuration: number
    allowedFormats: string[]
  }
}
