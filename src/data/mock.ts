// src/data/mock.ts - FIX DEPLOY FINAL (17 linhas)
export interface MockProvider {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviews: number;
  price: string;
  image: string;
  isOnline: boolean;
  isTopRated: boolean;
  isFeatured: boolean;
  category: string;
  isMock: boolean;
}

// ✅ FIX CRÍTICO: HomePage.tsx linha 10 ainda importa estes
export const mockProviders: MockProvider[] = [
  {
    id: 'mock-1',
    name: 'Dr. João Silva',
    specialty: 'Dentista', 
    rating: 4.9,
    reviews: 127,
    price: 'R$ 150',
    image: 'https://i.pravatar.cc/300?u=1',
    isOnline: true,
    isTopRated: true,
    isFeatured: true,
    category: 'dentista',
    isMock: true
  }
];

export const mocksByCategory: Record<string, MockProvider[]> = {
  dentista: mockProviders,
  'clinico-geral': mockProviders,
  pediatra: mockProviders,
  psicologo: mockProviders
};
