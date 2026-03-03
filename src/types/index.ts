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
  videos?: {
    presentation?: string
    portfolio: string[]
  }
}

export interface Category {
  id: string
  name: string
  icon: string
  description: string
  providerCount: number
}

export interface Review {
  id: string
  providerId: string
  userName: string
  userAvatar: string
  rating: number
  comment: string
  date: string
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

// Sistema de Roles (Perfil Duplo)
export type UserRole = 'client' | 'provider'

export interface ClientProfile {
  phone?: string
  address?: string
  city?: string
  neighborhood?: string
  preferences?: string[]
}

export interface ProviderProfile {
  specialty: string
  bio: string
  city: string
  neighborhood: string
  priceFrom: number
  skills: string[]
  categories: string[]
  coverImage?: string
  phone?: string
  responseTime?: string
  completedJobs: number
  rating: number
  reviewCount: number
  verified: boolean
  videos: {
    presentation?: string
    portfolio: string[]
  }
}

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  roles: UserRole[]
  createdAt: string
  updatedAt: string
  
  // Perfis opcionais
  clientProfile?: ClientProfile
  providerProfile?: ProviderProfile
}
