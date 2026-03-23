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

const musicaMocks: MockProvider[] = [
  {
    id: 'mock-musica-1', name: 'Carla Drummond', avatar: 'https://i.pravatar.cc/150?img=5',
    coverImage: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&q=80',
    specialty: 'Professora de Violão', category: 'musica', rating: 4.8, reviewCount: 54,
    priceFrom: 60, city: 'Diamantina', neighborhood: 'Bairro da Palha',
    isOnline: true, isTopRated: true, isFeatured: true,
    bio: 'Professora de violão com 10 anos de experiência. Aulas para todos os níveis.',
    skills: ['Violão Clássico', 'Violão Popular', 'MPB', 'Leitura Musical'],
    completedJobs: 210, responseTime: '< 1h', isMock: true,
  },
  {
    id: 'mock-musica-2', name: 'Bruno Maestro', avatar: 'https://i.pravatar.cc/150?img=13',
    coverImage: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=800&q=80',
    specialty: 'Professor de Piano', category: 'musica', rating: 4.9, reviewCount: 38,
    priceFrom: 90, city: 'Diamantina', neighborhood: 'Palácio',
    isOnline: false, isTopRated: true, isFeatured: false,
    bio: 'Pianista formado pelo Conservatório. Aulas clássicas e populares.',
    skills: ['Piano Clássico', 'Jazz', 'Harmonia', 'Improvisação'],
    completedJobs: 87, responseTime: '< 2h', isMock: true,
  },
  {
    id: 'mock-musica-3', name: 'Thais Voce', avatar: 'https://i.pravatar.cc/150?img=25',
    coverImage: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&q=80',
    specialty: 'Professora de Canto', category: 'musica', rating: 4.7, reviewCount: 29,
    priceFrom: 70, city: 'Diamantina', neighborhood: 'Alto da Cruz',
    isOnline: true, isTopRated: false, isFeatured: false,
    bio: 'Cantora lírica e professora de técnica vocal. Preparo para audições.',
    skills: ['Técnica Vocal', 'Canto Lírico', 'MPB', 'Respiração'],
    completedJobs: 63, responseTime: '< 3h', isMock: true,
  },
  {
    id: 'mock-musica-4', name: 'Rafael Percussão', avatar: 'https://i.pravatar.cc/150?img=36',
    coverImage: 'https://images.unsplash.com/photo-1471478331149-c72f17e33c73?w=800&q=80',
    specialty: 'Professor de Bateria', category: 'musica', rating: 4.6, reviewCount: 21,
    priceFrom: 75, city: 'Diamantina', neighborhood: 'Gruta',
    isOnline: false, isTopRated: false, isFeatured: false,
    bio: 'Baterista com 15 anos de palco. Aulas de bateria e percussão em geral.',
    skills: ['Bateria', 'Caixa', 'Ritmos Brasileiros', 'Leitura Rítmica'],
    completedJobs: 41, responseTime: '< 4h', isMock: true,
  },
  {
    id: 'mock-musica-5', name: 'Luana Flauta', avatar: 'https://i.pravatar.cc/150?img=44',
    coverImage: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=800&q=80',
    specialty: 'Professora de Flauta', category: 'musica', rating: 4.5, reviewCount: 17,
    priceFrom: 65, city: 'Diamantina', neighborhood: 'São Francisco',
    isOnline: true, isTopRated: false, isFeatured: false,
    bio: 'Flautista com passagem por orquestras regionais. Aulas online e presenciais.',
    skills: ['Flauta Transversal', 'Flauta Doce', 'Música Clássica', 'Popular'],
    completedJobs: 28, responseTime: '< 2h', isMock: true,
  },
]

const limpezaMocks: MockProvider[] = [
  {
    id: 'mock-limpeza-1', name: 'Ana Beatriz Silva', avatar: 'https://i.pravatar.cc/150?img=47',
    coverImage: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80',
    specialty: 'Faxineira Profissional', category: 'limpeza', rating: 4.9, reviewCount: 128,
    priceFrom: 120, city: 'Diamantina', neighborhood: 'Centro',
    isOnline: true, isTopRated: true, isFeatured: true,
    bio: 'Especialista em limpeza residencial com 8 anos de experiência.',
    skills: ['Limpeza Residencial', 'Pós-Obra', 'Organização', 'Estofados'],
    completedJobs: 342, responseTime: '< 30min', isMock: true,
  },
  {
    id: 'mock-limpeza-2', name: 'Maria Organiza', avatar: 'https://i.pravatar.cc/150?img=31',
    coverImage: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=800&q=80',
    specialty: 'Personal Organizer', category: 'limpeza', rating: 4.8, reviewCount: 76,
    priceFrom: 150, city: 'Diamantina', neighborhood: 'Bela Vista',
    isOnline: false, isTopRated: true, isFeatured: false,
    bio: 'Personal organizer certificada. Transformo a desordem em harmonia.',
    skills: ['Organização', 'Guarda-Roupa', 'Cozinha', 'Home Office'],
    completedJobs: 154, responseTime: '< 1h', isMock: true,
  },
  {
    id: 'mock-limpeza-3', name: 'Fernanda Clean', avatar: 'https://i.pravatar.cc/150?img=20',
    coverImage: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=800&q=80',
    specialty: 'Limpeza Comercial', category: 'limpeza', rating: 4.7, reviewCount: 45,
    priceFrom: 200, city: 'Diamantina', neighborhood: 'Industrial',
    isOnline: true, isTopRated: false, isFeatured: false,
    bio: 'Especialista em limpeza de escritórios e estabelecimentos comerciais.',
    skills: ['Limpeza Comercial', 'Piso Industrial', 'Vitrine', 'Banheiro'],
    completedJobs: 98, responseTime: '< 2h', isMock: true,
  },
  {
    id: 'mock-limpeza-4', name: 'João Vidros', avatar: 'https://i.pravatar.cc/150?img=57',
    coverImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    specialty: 'Limpeza de Vidros', category: 'limpeza', rating: 4.6, reviewCount: 33,
    priceFrom: 100, city: 'Diamantina', neighborhood: 'Glória',
    isOnline: false, isTopRated: false, isFeatured: false,
    bio: 'Limpeza de vidros em altura com equipamento de segurança.',
    skills: ['Vidros', 'Fachada', 'Janelas', 'Espelhos'],
    completedJobs: 67, responseTime: '< 3h', isMock: true,
  },
  {
    id: 'mock-limpeza-5', name: 'Sueli Tapetes', avatar: 'https://i.pravatar.cc/150?img=41',
    coverImage: 'https://images.unsplash.com/photo-1527515637462-cff94edd57a0?w=800&q=80',
    specialty: 'Lavagem de Tapetes', category: 'limpeza', rating: 4.5, reviewCount: 22,
    priceFrom: 80, city: 'Diamantina', neighborhood: 'Jomba',
    isOnline: true, isTopRated: false, isFeatured: false,
    bio: 'Lavagem e higienização de tapetes, sofás e carpetes.',
    skills: ['Tapetes', 'Sofás', 'Carpetes', 'Higienização'],
    completedJobs: 45, responseTime: '< 4h', isMock: true,
  },
]

const reformasMocks: MockProvider[] = [
  {
    id: 'mock-reformas-1', name: 'Carlos Eduardo Souza', avatar: 'https://i.pravatar.cc/150?img=12',
    coverImage: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800&q=80',
    specialty: 'Encanador Especialista', category: 'reformas', rating: 4.8, reviewCount: 95,
    priceFrom: 150, city: 'Diamantina', neighborhood: 'Bom Jesus',
    isOnline: true, isTopRated: true, isFeatured: true,
    bio: 'Encanador com CREA ativo, 12 anos no mercado. Atendo emergências 24h.',
    skills: ['Vazamentos', 'Instalação', 'Desentupimento', 'Aquecedor Solar'],
    completedJobs: 210, responseTime: '< 1h', isMock: true,
  },
  {
    id: 'mock-reformas-2', name: 'Roberto Eletricista', avatar: 'https://i.pravatar.cc/150?img=33',
    coverImage: 'https://images.unsplash.com/photo-1621905251189-08b45249a08a?w=800&q=80',
    specialty: 'Eletricista Residencial', category: 'reformas', rating: 4.7, reviewCount: 73,
    priceFrom: 130, city: 'Diamantina', neighborhood: 'Conselheiro',
    isOnline: false, isTopRated: false, isFeatured: true,
    bio: 'Eletricista com NR10 e NR35. Instalações, reformas e manutenção elétrica.',
    skills: ['Instalação Elétrica', 'Disjuntores', 'Iluminação', 'Ar Condicionado'],
    completedJobs: 187, responseTime: '< 2h', isMock: true,
  },
  {
    id: 'mock-reformas-3', name: 'Pedrinho Pedreiro', avatar: 'https://i.pravatar.cc/150?img=60',
    coverImage: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
    specialty: 'Pedreiro e Acabamento', category: 'reformas', rating: 4.6, reviewCount: 52,
    priceFrom: 160, city: 'Diamantina', neighborhood: 'Biribiri',
    isOnline: true, isTopRated: false, isFeatured: false,
    bio: 'Pedreiro com 20 anos de experiência. Reformas completas e acabamento.',
    skills: ['Alvenaria', 'Revestimento', 'Reboco', 'Acabamento'],
    completedJobs: 134, responseTime: '< 3h', isMock: true,
  },
  {
    id: 'mock-reformas-4', name: 'Sergio Marceneiro', avatar: 'https://i.pravatar.cc/150?img=65',
    coverImage: 'https://images.unsplash.com/photo-1565361456789-4b0e5e4e6b2c?w=800&q=80',
    specialty: 'Marceneiro', category: 'reformas', rating: 4.9, reviewCount: 41,
    priceFrom: 200, city: 'Diamantina', neighborhood: 'Escola Técnica',
    isOnline: false, isTopRated: true, isFeatured: false,
    bio: 'Marceneiro artesanal. Móveis sob medida e restauração de peças antigas.',
    skills: ['Móveis Planejados', 'Restauração', 'Portas', 'Armários'],
    completedJobs: 89, responseTime: '< 4h', isMock: true,
  },
  {
    id: 'mock-reformas-5', name: 'Vera Pintora', avatar: 'https://i.pravatar.cc/150?img=23',
    coverImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    specialty: 'Pintora de Interiores', category: 'reformas', rating: 4.9, reviewCount: 61,
    priceFrom: 200, city: 'Diamantina', neighborhood: 'Pinheiros',
    isOnline: true, isTopRated: true, isFeatured: false,
    bio: 'Pintora especializada em interiores com técnicas decorativas e texturas.',
    skills: ['Pintura Residencial', 'Textura', 'Grafiato', 'Efeitos Especiais'],
    completedJobs: 98, responseTime: '< 3h', isMock: true,
  },
]

const educacaoMocks: MockProvider[] = [
  {
    id: 'mock-edu-1', name: 'Prof. Lucas Matemática', avatar: 'https://i.pravatar.cc/150?img=14',
    coverImage: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&q=80',
    specialty: 'Professor de Matemática', category: 'educacao', rating: 4.9, reviewCount: 87,
    priceFrom: 70, city: 'Diamantina', neighborhood: 'UFVJM',
    isOnline: true, isTopRated: true, isFeatured: true,
    bio: 'Mestrando em Matemática. Aulas para ensino médio, ENEM e vestibulares.',
    skills: ['Álgebra', 'Geometria', 'ENEM', 'Cálculo Básico'],
    completedJobs: 312, responseTime: '< 1h', isMock: true,
  },
  {
    id: 'mock-edu-2', name: 'Camila Inglês', avatar: 'https://i.pravatar.cc/150?img=39',
    coverImage: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800&q=80',
    specialty: 'Professora de Inglês', category: 'educacao', rating: 4.8, reviewCount: 63,
    priceFrom: 65, city: 'Diamantina', neighborhood: 'Santo Antônio',
    isOnline: true, isTopRated: false, isFeatured: false,
    bio: 'Certificada Cambridge. Aulas de inglês para negócios, viagem e vestibular.',
    skills: ['Inglês Básico', 'Business English', 'TOEFL', 'Conversação'],
    completedJobs: 178, responseTime: '< 2h', isMock: true,
  },
  {
    id: 'mock-edu-3', name: 'Dr. Paulo Física', avatar: 'https://i.pravatar.cc/150?img=51',
    coverImage: 'https://images.unsplash.com/photo-1532619675605-1ede6c2ed2b0?w=800&q=80',
    specialty: 'Professor de Física', category: 'educacao', rating: 4.7, reviewCount: 44,
    priceFrom: 80, city: 'Diamantina', neighborhood: 'UFVJM',
    isOnline: false, isTopRated: false, isFeatured: false,
    bio: 'Doutor em Física pela UFMG. Aulas presenciais e online para universitários.',
    skills: ['Mecânica', 'Eletromagnetismo', 'Termodinâmica', 'Óptica'],
    completedJobs: 95, responseTime: '< 3h', isMock: true,
  },
  {
    id: 'mock-edu-4', name: 'Bianca Português', avatar: 'https://i.pravatar.cc/150?img=18',
    coverImage: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&q=80',
    specialty: 'Professora de Português', category: 'educacao', rating: 4.8, reviewCount: 56,
    priceFrom: 60, city: 'Diamantina', neighborhood: 'Palácio',
    isOnline: true, isTopRated: true, isFeatured: false,
    bio: 'Especialista em redação ENEM. Aprovados em UFMG e UFVJM.',
    skills: ['Gramática', 'Redação', 'Literatura', 'Interpretação'],
    completedJobs: 143, responseTime: '< 1h', isMock: true,
  },
  {
    id: 'mock-edu-5', name: 'Felipe Informática', avatar: 'https://i.pravatar.cc/150?img=59',
    coverImage: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80',
    specialty: 'Aulas de Informática', category: 'educacao', rating: 4.5, reviewCount: 29,
    priceFrom: 55, city: 'Diamantina', neighborhood: 'Mercês',
    isOnline: true, isTopRated: false, isFeatured: false,
    bio: 'Técnico em TI. Aulas básicas e avançadas de informática para todas as idades.',
    skills: ['Word', 'Excel', 'Internet', 'Design Básico'],
    completedJobs: 62, responseTime: '< 2h', isMock: true,
  },
]

const saudeMocks: MockProvider[] = [
  {
    id: 'mock-saude-1', name: 'Juliana Cuidadora', avatar: 'https://i.pravatar.cc/150?img=9',
    coverImage: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80',
    specialty: 'Cuidadora de Idosos', category: 'saude', rating: 5.0, reviewCount: 38,
    priceFrom: 180, city: 'Diamantina', neighborhood: 'Serra',
    isOnline: false, isTopRated: true, isFeatured: false,
    bio: 'Técnica em enfermagem com especialização em gerontologia.',
    skills: ['Cuidados Básicos', 'Medicação', 'Fisioterapia Leve', 'Companhia'],
    completedJobs: 55, responseTime: '< 2h', isMock: true,
  },
  {
    id: 'mock-saude-2', name: 'Dr. André Fisio', avatar: 'https://i.pravatar.cc/150?img=67',
    coverImage: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
    specialty: 'Fisioterapeuta', category: 'saude', rating: 4.9, reviewCount: 47,
    priceFrom: 120, city: 'Diamantina', neighborhood: 'Hospital',
    isOnline: true, isTopRated: true, isFeatured: false,
    bio: 'Fisioterapeuta CREFITO ativo. Atendimento domiciliar e na clínica.',
    skills: ['Ortopedia', 'Neurologia', 'Pós-Operatório', 'RPG'],
    completedJobs: 120, responseTime: '< 1h', isMock: true,
  },
  {
    id: 'mock-saude-3', name: 'Tatiane Nutrição', avatar: 'https://i.pravatar.cc/150?img=27',
    coverImage: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80',
    specialty: 'Nutricionista', category: 'saude', rating: 4.8, reviewCount: 34,
    priceFrom: 150, city: 'Diamantina', neighborhood: 'UFVJM',
    isOnline: true, isTopRated: false, isFeatured: false,
    bio: 'Nutricionista CRN ativo. Planos alimentares personalizados.',
    skills: ['Emagrecimento', 'Hipertrofia', 'Diabetes', 'Vegetariano'],
    completedJobs: 78, responseTime: '< 3h', isMock: true,
  },
  {
    id: 'mock-saude-4', name: 'Igor Personal', avatar: 'https://i.pravatar.cc/150?img=53',
    coverImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    specialty: 'Personal Trainer', category: 'saude', rating: 4.7, reviewCount: 59,
    priceFrom: 100, city: 'Diamantina', neighborhood: 'Conselheiro',
    isOnline: false, isTopRated: false, isFeatured: false,
    bio: 'Personal trainer CREF ativo. Treinos funcionais e musculação.',
    skills: ['Musculação', 'Funcional', 'HIIT', 'Reabilitação'],
    completedJobs: 143, responseTime: '< 2h', isMock: true,
  },
  {
    id: 'mock-saude-5', name: 'Renata Psico', avatar: 'https://i.pravatar.cc/150?img=38',
    coverImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80',
    specialty: 'Psicóloga', category: 'saude', rating: 4.9, reviewCount: 26,
    priceFrom: 130, city: 'Diamantina', neighborhood: 'Santo Antônio',
    isOnline: true, isTopRated: true, isFeatured: false,
    bio: 'Psicóloga CRP ativo. Atendimento presencial e online.',
    skills: ['Ansiedade', 'Depressão', 'TCC', 'Autoestima'],
    completedJobs: 64, responseTime: '< 4h', isMock: true,
  },
]

const casaMocks: MockProvider[] = [
  {
    id: 'mock-casa-1', name: 'Marcos Jardins', avatar: 'https://i.pravatar.cc/150?img=55',
    coverImage: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80',
    specialty: 'Jardineiro Paisagista', category: 'casa', rating: 4.6, reviewCount: 44,
    priceFrom: 100, city: 'Diamantina', neighborhood: 'Conselheiro',
    isOnline: true, isTopRated: false, isFeatured: false,
    bio: 'Jardineiro com formação em paisagismo. Cuido do seu verde com amor.',
    skills: ['Paisagismo', 'Poda', 'Plantio', 'Irrigação'],
    completedJobs: 76, responseTime: '< 4h', isMock: true,
  },
  {
    id: 'mock-casa-2', name: 'Célia Babá', avatar: 'https://i.pravatar.cc/150?img=32',
    coverImage: 'https://images.unsplash.com/photo-1587560699334-cc4ff634909a?w=800&q=80',
    specialty: 'Babá e Cuidadora', category: 'casa', rating: 4.9, reviewCount: 72,
    priceFrom: 90, city: 'Diamantina', neighborhood: 'Palácio',
    isOnline: true, isTopRated: true, isFeatured: false,
    bio: 'Babá com pedagogia. Cuido com carinho e segurança.',
    skills: ['Bebês', 'Crianças', 'Reforço Escolar', 'Brincadeiras Educativas'],
    completedJobs: 189, responseTime: '< 1h', isMock: true,
  },
  {
    id: 'mock-casa-3', name: 'Davi Dedetizador', avatar: 'https://i.pravatar.cc/150?img=62',
    coverImage: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
    specialty: 'Dedetização', category: 'casa', rating: 4.7, reviewCount: 31,
    priceFrom: 250, city: 'Diamantina', neighborhood: 'Industrial',
    isOnline: false, isTopRated: false, isFeatured: false,
    bio: 'Dedetização e controle de pragas com produtos certificados ANVISA.',
    skills: ['Baratas', 'Ratos', 'Cupins', 'Dengue'],
    completedJobs: 67, responseTime: '< 3h', isMock: true,
  },
  {
    id: 'mock-casa-4', name: 'Luiz Mudanças', avatar: 'https://i.pravatar.cc/150?img=49',
    coverImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    specialty: 'Fretes e Mudanças', category: 'casa', rating: 4.5, reviewCount: 88,
    priceFrom: 300, city: 'Diamantina', neighborhood: 'Estrada Real',
    isOnline: true, isTopRated: false, isFeatured: false,
    bio: 'Fretes e mudanças residenciais e comerciais com cuidado.',
    skills: ['Mudança Residencial', 'Carga Geral', 'Embalagem', 'Montagem'],
    completedJobs: 234, responseTime: '< 2h', isMock: true,
  },
  {
    id: 'mock-casa-5', name: 'Alessandra Chef', avatar: 'https://i.pravatar.cc/150?img=3',
    coverImage: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
    specialty: 'Chef em Domicílio', category: 'casa', rating: 4.8, reviewCount: 39,
    priceFrom: 200, city: 'Diamantina', neighborhood: 'Centro',
    isOnline: false, isTopRated: true, isFeatured: false,
    bio: 'Chef formada pelo SENAC. Jantares especiais e eventos corporativos.',
    skills: ['Cozinha Mineira', 'Italiana', 'Japonesa', 'Confeitaria'],
    completedJobs: 93, responseTime: '< 3h', isMock: true,
  },
]

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
