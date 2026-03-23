// src/data/mock.ts
// VERSÃO MINIMALISTA - só interface para ProviderCard (12 linhas)

export interface MockProvider {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviews: number;
  price: string;
  image: string;
  isOnline: boolean;      // ProviderCard filtra
  isTopRated: boolean;    // ProviderCard usa  
  isFeatured: boolean;    // ProviderCard usa
  category: string;
  isMock: boolean;        // ProviderCard filtra
}

// Sem categorias (Home/Search usam Firestore)
// Sem providers (não usados em lugar nenhum)
export const mockProviders: MockProvider[] = [];
