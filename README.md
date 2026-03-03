# ServiçoFlix 🎬⚡

Marketplace de serviços com layout inspirado no Netflix. Conecta clientes a prestadores de serviços (faxineiras, encanadores, eletricistas, etc.) com uma experiência visual imersiva.

## 🎨 Design

- **Tema:** Dark mode com acentos verde esmeralda (#10b981)
- **Estilo:** Netflix-inspired UI
- **Responsivo:** Mobile-first, otimizado para touch

## Stack

- **React 18** + **TypeScript**
- **Vite** (build tool)
- **Tailwind CSS** (estilização)
- **Framer Motion** (animações)
- **React Router** (navegação)
- **TanStack Query** (estado/cache)
- **Firebase** (autenticação e banco de dados)

## Estrutura

```
src/
├── components/
│   ├── Navbar.tsx           # Navbar transparente estilo Netflix
│   ├── HeroBillboard.tsx    # Banner principal rotativo
│   ├── CategoryRow.tsx      # Carrossel de profissionais
│   ├── ProviderCard.tsx     # Card com hover expansivo
│   ├── CategoryGrid.tsx     # Grid de categorias
│   ├── YouTubeEmbed.tsx     # Player de vídeos YouTube/Shorts
│   └── VideoCarousel.tsx    # Carrossel horizontal de vídeos
├── pages/
│   ├── HomePage.tsx              # Página inicial
│   ├── ProviderProfilePage.tsx   # Perfil público do profissional
│   ├── ProviderDashboardPage.tsx # Dashboard para editar perfil
│   ├── SearchPage.tsx            # Busca e filtros
│   └── LoginPage.tsx             # Login/Cadastro
├── data/
│   └── mock.ts              # Dados mock para desenvolvimento
├── types/
│   └── index.ts             # Interfaces TypeScript
├── lib/
│   ├── firebase.ts          # Configuração do Firebase
│   └── utils.ts             # Utilitários
└── hooks/
    └── useAuth.ts           # Hook de autenticação
```

## Como rodar localmente

### 1. Clone o repositório
```bash
git clone https://github.com/hewertonluann-pixel/servicoflix.git
cd servicoflix
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente

Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

Edite o arquivo `.env` e adicione suas credenciais do Firebase:
```env
VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu_projeto_id
VITE_FIREBASE_STORAGE_BUCKET=seu_projeto.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id
VITE_FIREBASE_MEASUREMENT_ID=seu_measurement_id
```

### 4. Rode o projeto
```bash
npm run dev
```

Abra [http://localhost:5173](http://localhost:5173)

## Deploy no Render

### Configuração no Dashboard do Render:

**Static Site Settings:**
- **Name:** `servicoflix`
- **Branch:** `main`
- **Root Directory:** (deixe vazio)
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`

**Environment Variables:**
Adicione todas as variáveis VITE_FIREBASE_* com seus valores do Firebase.

### Configuração do Firebase para Produção

No Firebase Console, adicione o domínio do Render aos domínios autorizados:

1. Acesse **Authentication** → **Settings** → **Authorized domains**
2. Adicione: `seu-app.onrender.com`
3. Habilite **Google Sign-in** em **Sign-in method**
4. Salve

## Funcionalidades

- ✅ Cadastro e login com email/senha
- ✅ Login com Google (redirect-based)
- ✅ Dashboard do prestador para editar perfil
- ✅ Upload de vídeos via YouTube (Shorts e vídeos normais)
- ✅ Carrossel horizontal de vídeos estilo Netflix
- ✅ Visualização pública do perfil
- ✅ Busca e filtros por categoria
- ✅ Design responsivo mobile-first
- ✅ Menu fullscreen touch-friendly

## Segurança

⚠️ **NUNCA** commite o arquivo `.env` no Git!

As credenciais do Firebase devem estar apenas:
- No arquivo `.env` local (ignorado pelo Git)
- Nas variáveis de ambiente do Render

## Próximos passos

- [ ] Migrar dados mock para Firestore
- [ ] Sistema de avaliações
- [ ] Upload de fotos com Firebase Storage
- [ ] Chat entre cliente e prestador
- [ ] Sistema de agendamento
- [ ] Pagamento integrado
- [ ] Notificações push
- [ ] PWA (Progressive Web App)

## Paleta de Cores

```css
--background: #0a0f0a      /* Preto esverdeado */
--surface: #141a14          /* Cinza escuro esverdeado */
--surface-hover: #1a231a    /* Cinza hover esverdeado */
--primary: #10b981          /* Verde esmeralda */
--primary-dark: #059669     /* Verde escuro */
--muted: #94a3b8            /* Cinza azulado */
--border: #1e3a2a           /* Verde muito escuro */
```
