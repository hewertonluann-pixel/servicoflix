import { useEffect, useState } from 'react'
import { CompraPage } from '@/pages/CompraPage'
import { Routes, Route, useLocation, useParams, useNavigate } from 'react-router-dom'
import { Navbar } from '@/components/Navbar'
import { HomePage } from '@/pages/HomePage'
import { ProviderProfilePage } from '@/pages/ProviderProfilePage'
import { ProviderDashboardPage } from '@/pages/ProviderDashboardPage'
import { ProviderRequestsPage } from '@/pages/ProviderRequestsPage'
import { MyAccountPage } from '@/pages/MyAccountPage'
import { ClientProfilePage } from '@/pages/ClientProfilePage'
import { BecomeProviderPage } from '@/pages/BecomeProviderPage'
import { SearchPage } from '@/pages/SearchPage'
import { SimpleLoginPage } from '@/pages/SimpleLoginPage'
import { AdminPage } from '@/pages/AdminPage'
import { AdminApprovalPage } from '@/pages/AdminApprovalPage'
import { AdminRelatoriosPage } from '@/pages/AdminRelatoriosPage'
import { PublicidadePage } from '@/pages/PublicidadePage'
import { ProviderPublicidadePage } from '@/pages/ProviderPublicidadePage'
import { DebugProvidersPage } from '@/pages/DebugProvidersPage'
import { FixProvidersPage } from '@/pages/FixProvidersPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { EditProviderProfilePage } from '@/pages/EditProviderProfilePage'
import { ChatPage } from '@/pages/ChatPage'
import { ChatsPage } from '@/pages/ChatsPage'
import { InstallPage } from '@/pages/InstallPage'
import { UsernameProfilePage } from '@/pages/UsernameProfilePage'
import { CidadePage } from '@/pages/CidadePage'
import { usePresence } from '@/hooks/usePresence'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Loader2 } from 'lucide-react'

/**
 * SlugResolver
 *
 * Componente intermediário que recebe um /:slug genérico e decide:
 *   - Se o slug bate com uma cidade ativa no Firestore → renderiza CidadePage
 *   - Caso contrário → renderiza UsernameProfilePage (comportamento anterior)
 *
 * A resolução é feita UMA única vez por slug, com cache em memória
 * para evitar consultas repetidas ao Firestore.
 */
const slugCache: Record<string, 'cidade' | 'username'> = {}

const SlugResolver = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [tipo, setTipo] = useState<'cidade' | 'username' | null>(
    slug ? (slugCache[slug.toLowerCase()] ?? null) : null
  )

  useEffect(() => {
    if (!slug) { navigate('/'); return }

    const lower = slug.toLowerCase()

    // Já resolvido antes (cache)
    if (slugCache[lower]) {
      setTipo(slugCache[lower])
      return
    }

    const resolve = async () => {
      try {
        const q = query(
          collection(db, 'cities'),
          where('slug', '==', lower),
          where('status', '==', 'ativa')
        )
        const snap = await getDocs(q)
        const resultado: 'cidade' | 'username' = snap.empty ? 'username' : 'cidade'
        slugCache[lower] = resultado
        setTipo(resultado)
      } catch {
        slugCache[lower] = 'username'
        setTipo('username')
      }
    }

    resolve()
  }, [slug])

  // Aguarda resolução
  if (tipo === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-muted text-sm">Carregando...</p>
        </div>
      </div>
    )
  }

  if (tipo === 'cidade') return <CidadePage />
  return <UsernameProfilePage />
}

function App() {
  const location = useLocation()
  const hideNavbar = location.pathname.startsWith('/admin') ||
                     location.pathname.startsWith('/debug') ||
                     location.pathname.startsWith('/fix')
  usePresence()

  return (
    <div className="min-h-screen bg-background text-white font-sans">
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<HomePage />} />

        {/* Perfil público de prestador */}
        <Route path="/profissional/:id" element={<ProviderProfilePage />} />
        <Route path="/prestador/:id" element={<ProviderProfilePage />} />

        {/* Área do prestador */}
        <Route path="/meu-perfil" element={<ProviderDashboardPage />} />
        <Route path="/meu-perfil/editar" element={<EditProviderProfilePage />} />
        <Route path="/meu-perfil/artes" element={<ProviderPublicidadePage />} />
        <Route path="/prestador/solicitacoes" element={<ProviderRequestsPage />} />

        {/* Área do cliente */}
        <Route path="/meu-perfil-cliente" element={<ClientProfilePage />} />
        <Route path="/minha-conta" element={<MyAccountPage />} />

        {/* Configurações */}
        <Route path="/configuracoes" element={<SettingsPage />} />

        {/* Onboarding */}
        <Route path="/tornar-se-prestador" element={<BecomeProviderPage />} />

        {/* Compra de créditos */}
        <Route path="/comprar" element={<CompraPage />} />

        {/* Busca */}
        <Route path="/buscar" element={<SearchPage />} />

        {/* Auth */}
        <Route path="/entrar" element={<SimpleLoginPage />} />

        {/* Chat */}
        <Route path="/chats" element={<ChatsPage />} />
        <Route path="/chat/:chatId" element={<ChatPage />} />
        <Route path="/chat" element={<ChatPage />} />

        {/* Instalação PWA */}
        <Route path="/instalar" element={<InstallPage />} />

        {/* Admin */}
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/aprovacoes" element={<AdminApprovalPage />} />
        <Route path="/admin/publicidade" element={<PublicidadePage />} />
        <Route path="/admin/relatorios" element={<AdminRelatoriosPage />} />

        {/* Utilitários (ocultos da navbar) */}
        <Route path="/debug" element={<DebugProvidersPage />} />
        <Route path="/fix" element={<FixProvidersPage />} />

        {/*
          Rota genérica — deve ser a Última.
          SlugResolver decide se é uma página de cidade (SEO) ou perfil de usuário.
        */}
        <Route path="/:slug" element={<SlugResolver />} />
      </Routes>
    </div>
  )
}

export default App
