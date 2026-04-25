// Provider type local para compatibilidade com mock (campos extras: isOnline, isTopRated, isFeatured, category, isMock)
export interface MockProvider {
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
  whatsapp?: string
  isMock?: boolean // true = perfil de exemplo (exibe faixa vermelha)
}

export interface MockCategory {
  id: string
  name: string
  icon: string
  color: string
  count: number
}

// ─── SEU PERFIL REAL ──────────────────────────────────────────────────────────
export const realOwnerProvider: MockProvider = {
  id: 'real-hewerton',
  name: 'Hewerton Assunção',
  avatar: 'https://i.pravatar.cc/150?img=68',
  coverImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80',
  specialty: 'Professor de Música',
  category: 'musica',
  rating: 5.0,
  reviewCount: 12,
  priceFrom: 80,
  city: 'Diamantina',
  neighborhood: 'Centro',
  isOnline: true,
  isTopRated: true,
  isFeatured: true,
  bio: 'Professor de música em Diamantina, MG. Aulas de saxofone, piano, percussão e violino. Metodologia personalizada para iniciantes e avançados.',
  skills: ['Saxofone', 'Piano', 'Percussão', 'Violino', 'Teoria Musical'],
  completedJobs: 48,
  responseTime: '< 1h',
  whatsapp: '',
  isMock: false,
}

// ─── PERFIS DE EXEMPLO POR CATEGORIA (5 por categoria) ───────────────────────
// isMock: true → exibe faixa vermelha "EXEMPLO" no card

const musicaMocks: MockProvider[] = []
const limpezaMocks: MockProvider[] = []
const reformasMocks: MockProvider[] = []
const educacaoMocks: MockProvider[] = []
const saudeMocks: MockProvider[] = []
const casaMocks: MockProvider[] = []

// ─── EXPORTAÇÕES ──────────────────────────────────────────────────────────────

// Todos os mocks agrupados por categoria (para substituição gradual)
export const mocksByCategory: Record<string, MockProvider[]> = {
  musica: musicaMocks,
  limpeza: limpezaMocks,
  reformas: reformasMocks,
  educacao: educacaoMocks,
  saude: saudeMocks,
  casa: casaMocks,
}

// Lista plana de todos os mocks + perfil real do dono
export const mockProviders: MockProvider[] = [
  realOwnerProvider,
  ...musicaMocks,
  ...limpezaMocks,
  ...reformasMocks,
  ...educacaoMocks,
  ...saudeMocks,
  ...casaMocks,
]

export const mockCategories: MockCategory[] = [
  { id: 'musica', name: 'Música', icon: '🎵', color: '#8B5CF6', count: 6 },
  { id: 'limpeza', name: 'Limpeza', icon: '🧹', color: '#00C896', count: 5 },
  { id: 'reformas', name: 'Reformas', icon: '🏠', color: '#3B82F6', count: 5 },
  { id: 'educacao', name: 'Educação', icon: '📚', color: '#F59E0B', count: 5 },
  { id: 'saude', name: 'Saúde', icon: '💊', color: '#EF4444', count: 5 },
  { id: 'casa', name: 'Casa & Lar', icon: '🌿', color: '#10B981', count: 5 },
]
