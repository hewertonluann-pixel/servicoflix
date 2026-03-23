// src/data/mock.ts - VERSÃO FINAL (12 linhas)
export interface MockProvider {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviews: number;
  price: string;
  image: string;
  isOnline: boolean;     // ← só isso
  isTopRated: boolean;   // ← ProviderCard precisa
  isFeatured: boolean;   // ← ProviderCard precisa
  category: string;
  isMock: boolean;
}
