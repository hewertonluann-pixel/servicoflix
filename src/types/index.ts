export interface Provider {
  id: string
  name: string
  avatar: string
  coverImage: string
  specialty: string
  category: string
  rating: number
  reviewCount: number
  priceFrom: number
  city: string
  neighborhood: string
  isOnline: boolean
  isTopRated: boolean
  isFeatured: boolean
  bio: string
  skills: string[]
  completedJobs: number
  responseTime: string
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  count: number
}

export interface Review {
  id: string
  clientName: string
  clientAvatar: string
  rating: number
  comment: string
  date: string
  serviceType: string
}
