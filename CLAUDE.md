# ServiçoFlix — Contexto do Projeto para IA

> Este arquivo é lido automaticamente por assistentes de IA (Claude Code, Cursor, Copilot, etc.).
> Mantenha-o atualizado sempre que houver mudanças arquiteturais relevantes.

---

## 🎯 O que é o projeto

**ServiçoFlix** é um marketplace de serviços no estilo Netflix — conecta prestadores de serviço e clientes de forma visual e imersiva. Foco em cidades do interior de Minas Gerais (ex: Diamantina), com suporte a geolocalização para exibir prestadores próximos.

**Repositório:** https://github.com/hewertonluann-pixel/servicoflix  
**Deploy:** Firebase Hosting + Vercel  
**Backend:** Firebase (Firestore + Auth + Storage + FCM + Realtime Database)

---

## 🛠️ Stack Técnica

| Camada | Tecnologia |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Estilização | Tailwind CSS v3 (mobile-first) |
| Animações | Framer Motion (`motion`, `AnimatePresence`) |
| Roteamento | React Router DOM v6 |
| Backend/DB | Firebase (Firestore, Auth, Storage, FCM) |
| Ícones | Lucide React |
| PWA | Service Worker + manifest.json |
| Funções serverless | Firebase Cloud Functions (pasta `/functions`) |

---

## 📁 Estrutura de Pastas

```
src/
  components/     # Componentes reutilizáveis
  pages/          # Páginas (uma por rota)
  hooks/          # Custom hooks React
  contexts/       # React Contexts (AuthContext, etc.)
  data/           # Dados estáticos (categorias, cidades, etc.)
  lib/            # Utilitários e configuração Firebase
  types/          # TypeScript types/interfaces
  index.css       # CSS global + variáveis Tailwind
functions/        # Firebase Cloud Functions (Node.js)
public/           # Assets estáticos, manifest.json, SW
```

---

## 🗂️ Páginas (src/pages)

| Arquivo | Rota | Descrição |
|---|---|---|
| `HomePage.tsx` | `/` | Página inicial com HeroBillboard + CategoryRow |
| `SearchPage.tsx` | `/buscar` | Busca e filtro de prestadores |
| `ProviderProfilePage.tsx` | `/prestador/:id` | Perfil público do prestador |
| `ProviderDashboardPage.tsx` | `/meu-perfil` | Dashboard do prestador logado |
| `EditProviderProfilePage.tsx` | `/editar-perfil` | Edição do perfil do prestador |
| `BecomeProviderPage.tsx` | `/tornar-se-prestador` | Cadastro como prestador |
| `ClientProfilePage.tsx` | `/meu-perfil-cliente` | Perfil do cliente |
| `MyAccountPage.tsx` | `/minha-conta` | Solicitações do cliente |
| `ProviderRequestsPage.tsx` | `/prestador/solicitacoes` | Solicitações recebidas (prestador) |
| `LoginPage.tsx` / `SimpleLoginPage.tsx` | `/entrar` | Login/cadastro |
| `ChatPage.tsx` | `/chat/:id` | Chat individual |
| `ChatsPage.tsx` | `/chats` | Lista de conversas |
| `SettingsPage.tsx` | `/configuracoes` | Configurações da conta |
| `InstallPage.tsx` | `/instalar` | Instruções de instalação PWA |
| `AdminPage.tsx` | `/admin` | Painel administrativo |
| `AdminApprovalPage.tsx` | `/admin/aprovacoes` | Aprovação de prestadores |
| `AdminRelatoriosPage.tsx` | `/admin/relatorios` | Relatórios administrativos |
| `PublicidadePage.tsx` | `/admin/publicidade` | Gerenciamento de anúncios |
| `ProviderPublicidadePage.tsx` | `/publicidade` | Compra de destaque (prestador) |
| `CompraPage.tsx` | `/comprar` | Fluxo de compra de créditos |
| `CidadePage.tsx` | `/cidade/:slug` | Prestadores por cidade |
| `UsernameProfilePage.tsx` | `/:username` | Perfil por username |

---

## 🧩 Componentes Principais (src/components)

| Componente | Descrição |
|---|---|
| `Navbar.tsx` | Navbar superior com menu sanduíche mobile via `createPortal` |
| `BottomNav.tsx` | Navegação inferior para mobile |
| `HeroBillboard.tsx` | Banner hero estilo Netflix na HomePage |
| `CategoryRow.tsx` | Linha de cards horizontais por categoria |
| `ProviderCard.tsx` | Card de prestador |
| `FilterBar.tsx` | Barra de filtros na busca |
| `CitySelectorNav.tsx` | Seletor de cidade na navbar |
| `NotificationsDropdown.tsx` | Dropdown de notificações |
| `ReviewModal.tsx` | Modal de avaliação |
| `RequestServiceModal.tsx` | Modal para solicitar serviço |
| `MediaUploader.tsx` | Upload de fotos/vídeos de portfólio |
| `WaveAudioPlayer.tsx` | Player de áudio com waveform |
| `AudioRecorder.tsx` | Gravação de áudio no chat |
| `CreditoBadge.tsx` | Badge de créditos na navbar (só prestadores) |
| `UserAvatar.tsx` | Avatar do usuário com fallback |

---

## 🪝 Hooks Customizados (src/hooks)

| Hook | Descrição |
|---|---|
| `useSimpleAuth` | **Hook principal de autenticação** — retorna `{ user, signOut, isProvider, isClient }` |
| `useAuth` | Hook de autenticação completo (Firebase Auth) |
| `useNotifications` | Contagem de notificações não lidas (`count`) |
| `useUnreadMessages` | Contagem de mensagens não lidas (`unreadCount`) |
| `useGeoLocation` / `useGeolocation` | Geolocalização do usuário |
| `useCities` | Lista de cidades disponíveis |
| `usePresence` | Status online/offline (Realtime Database) |
| `usePrestadorStatus` | Status do prestador (ativo/inativo) |
| `useReviews` | Avaliações do prestador |
| `useComments` | Comentários em mídia |
| `useAdminMetrics` | Métricas do painel admin |
| `useSeoMeta` | Gerenciamento de meta tags dinâmicas |
| `useFCM` | Push notifications via Firebase Cloud Messaging |

---

## 🔐 Autenticação e Papéis

- **Hook principal:** `useSimpleAuth` (em `src/hooks/useSimpleAuth.ts`)
- **Papéis:** um usuário pode ser `isProvider` (prestador), `isClient` (cliente) ou ambos simultaneamente
- **Admin:** verificado por UID fixo — `ADMIN_UIDS = ['Glhzl4mWRkNjttVBLaLhoUWLWxf1']`
- **Contexto de auth** disponível via `src/contexts/`

---

## 🎨 Convenções de Estilo (Tailwind)

### Breakpoints
```
mobile:  < 768px  (default, sem prefixo)
tablet:  ≥ 640px  (sm:)
desktop: ≥ 768px  (md:)
lg:      ≥ 1024px
```

### Escala de Z-index — CRÍTICO
```
z-10   — cards, elementos flutuantes comuns
z-20   — dropdowns, tooltips
z-40   — overlays de fundo (backdrops)
z-50   — Navbar (fixo, sempre)
z-[60] — Menu mobile (createPortal no body) ← IMPORTANTE
z-[70] — Modais (ReviewModal, RequestServiceModal, etc.)
z-[80] — Alertas, toasts, notificações críticas
```

> ⚠️ O menu mobile usa `createPortal(_, document.body)` e DEVE ter z-index maior que a navbar (`z-50`).
> Use sempre `z-[60]` ou superior para elementos portalizados sobre a navbar.

### Altura da Navbar
```
mobile (< 640px): h-14  = 56px  → top-14
tablet (≥ 640px): h-16  = 64px  → sm:top-16
```
Sempre use `top-14 sm:top-16` em elementos que precisam começar abaixo da navbar.

### Padrões de Classes Comuns
```tsx
// Botão primário
"bg-primary text-background font-bold rounded-xl px-4 py-3"

// Card de superfície
"bg-surface border border-border rounded-xl"

// Link de menu mobile
"flex items-center gap-3 px-4 py-3 text-muted hover:text-white hover:bg-surface rounded-xl transition-colors"

// Texto truncado
"truncate"

// Hidden mobile / visible desktop
"hidden md:block"  ou  "hidden md:flex"

// Hidden desktop / visible mobile
"md:hidden"
```

---

## ⚡ Padrões de Código

### Animações
- Sempre usar `framer-motion`: `motion.div`, `AnimatePresence`
- Menus/modais: `initial={{ opacity: 0, y: -10 }}` + `animate={{ opacity: 1, y: 0 }}`
- Menu mobile lateral: `initial={{ x: '100%' }}` + `animate={{ x: 0 }}`
- Transição padrão: `transition={{ type: 'tween', duration: 0.3 }}`

### Eventos Touch (Mobile)
- Sempre adicionar `touchstart` junto com `mousedown` em listeners de "click outside"
- Exemplo:
```tsx
document.addEventListener('mousedown', handler)
document.addEventListener('touchstart', handler)
```

### createPortal
- Usado em: menu mobile (`Navbar`), modais grandes
- Sempre renderizar em `document.body`
- Sempre aplicar z-index adequado (`z-[60]` para menu, `z-[70]` para modais)

### Componentes de ícones
- Biblioteca: **Lucide React** exclusivamente
- Tamanho padrão mobile: `w-5 h-5`
- Tamanho padrão desktop: `w-4 h-4` (menus) ou `w-5 h-5` (botões)

---

## 🔥 Firebase / Firestore

### Coleções Principais
```
users/           — dados dos usuários (clientes e prestadores)
providers/       — perfis de prestadores aprovados
serviceRequests/ — solicitações de serviço
chats/           — conversas
messages/        — mensagens por chat
notifications/   — notificações
reviews/         — avaliações
ads/             — publicidade/anúncios
cities/          — cidades disponíveis
```

### Configuração
- Arquivo de config: `src/lib/` (firebase.ts ou similar)
- Regras: `firestore.rules` e `storage.rules` na raiz
- Índices: `firestore.indexes.json`

---

## 🚀 Comandos

```bash
# Desenvolvimento
npm run dev

# Build produção
npm run build

# Preview do build
npm run preview

# Deploy Firebase
firebase deploy

# Deploy só hosting
firebase deploy --only hosting

# Deploy só Firestore rules
firebase deploy --only firestore:rules

# Deploy Cloud Functions
firebase deploy --only functions
```

---

## 🐛 Bugs Conhecidos e Correções Aplicadas

### [2026-04-28] Menu sanduíche mobile não abria
- **Causa 1:** z-index do painel mobile (`z-40`) menor que navbar (`z-50`)
- **Causa 2:** Listener `mousedown` não disparava em touch devices
- **Causa 3:** `top-14` fixo causava sobreposição em tablets (navbar tem `h-16` no `sm:`)
- **Correção:** `z-[60]` no painel, `touchstart` adicionado, `top-14 sm:top-16`
- **Commit:** `60c54bc`

---

## 📌 Decisões Arquiteturais

1. **`useSimpleAuth` é o hook de auth canônico** — não usar `useAuth` diretamente nos componentes
2. **Menu mobile sempre via `createPortal`** — evita problemas de overflow/clip em containers pai
3. **Tailwind mobile-first** — escrever o estilo base para mobile, adicionar `md:` para desktop
4. **Framer Motion obrigatório** para todas as transições visíveis ao usuário
5. **Sem bibliotecas de componentes externas** (sem shadcn, MUI, etc.) — tudo é feito com Tailwind puro
6. **Duplo papel do usuário** — um mesmo UID pode ser `isProvider` e `isClient` ao mesmo tempo
7. **Admin por UID fixo** — não há coleção de admins no Firestore, a verificação é feita no frontend pelo array `ADMIN_UIDS`

---

## 🔄 Como atualizar este arquivo

Sempre que:
- Adicionar uma nova página → atualizar a tabela de páginas
- Adicionar um novo hook → atualizar a tabela de hooks
- Criar uma nova convenção de z-index → atualizar a escala
- Resolver um bug recorrente → adicionar em "Bugs Conhecidos"
- Tomar uma decisão arquitetural → registrar em "Decisões Arquiteturais"
