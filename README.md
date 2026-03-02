# ServiçoFlix 🎬⚡

Marketplace de serviços com layout inspirado no Netflix. Conecta clientes a prestadores de serviços (faxineiras, encanadores, eletricistas, etc.) com uma experiência visual imersiva.

## Stack

- **React 18** + **TypeScript**
- **Vite** (build tool)
- **Tailwind CSS** (estilização)
- **Framer Motion** (animações)
- **React Router** (navegação)
- **TanStack Query** (estado/cache)

## Estrutura

```
src/
├── components/
│   ├── Navbar.tsx           # Navbar transparente estilo Netflix
│   ├── HeroBillboard.tsx    # Banner principal rotativo
│   ├── CategoryRow.tsx      # Carrossel de profissionais
│   ├── ProviderCard.tsx     # Card com hover expansivo
│   └── CategoryGrid.tsx     # Grid de categorias
├── pages/
│   ├── HomePage.tsx         # Página inicial
│   ├── ProviderProfilePage  # Perfil do profissional
│   ├── SearchPage.tsx       # Busca e filtros
│   └── LoginPage.tsx        # Login/Cadastro
├── data/
│   └── mock.ts              # Dados mock para desenvolvimento
├── types/
│   └── index.ts             # Interfaces TypeScript
└── lib/
    └── utils.ts             # Utilitários
```

## Como rodar

```bash
npm install
npm run dev
```

Abra [http://localhost:5173](http://localhost:5173)
