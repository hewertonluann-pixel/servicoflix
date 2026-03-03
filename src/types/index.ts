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
