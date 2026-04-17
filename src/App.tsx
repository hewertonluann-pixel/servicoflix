import { useEffect, useState } from 'react'
import { CompraPage } from '@/pages/CompraPage'
import { Routes, Route, useLocation, useParams, useNavigate } from 'react-router-dom'
import { Navbar } from '@/components/Navbar'
import { BottomNav } from '@/components/BottomNav'
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
    if (slugCache[lower]) { setTipo(slugCache[lower]); return }

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
        <Route path="/profissional/:id" element={<ProviderProfilePage />} />
        <Route path="/prestador/:id" element={<ProviderProfilePage />} />
        <Route path="/meu-perfil" element={<ProviderDashboardPage />} />
        <Route path="/meu-perfil/editar" element={<EditProviderProfilePage />} />
        <Route path="/meu-perfil/artes" element={<ProviderPublicidadePage />} />
        <Route path="/prestador/solicitacoes" element={<ProviderRequestsPage />} />
        <Route path="/meu-perfil-cliente" element={<ClientProfilePage />} />
        <Route path="/minha-conta" element={<MyAccountPage />} />
        <Route path="/configuracoes" element={<SettingsPage />} />
        <Route path="/tornar-se-prestador" element={<BecomeProviderPage />} />
        <Route path="/comprar" element={<CompraPage />} />
        <Route path="/buscar" element={<SearchPage />} />
        <Route path="/entrar" element={<SimpleLoginPage />} />
        <Route path="/chats" element={<ChatsPage />} />
        <Route path="/chat/:chatId" element={<ChatPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/instalar" element={<InstallPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/aprovacoes" element={<AdminApprovalPage />} />
        <Route path="/admin/publicidade" element={<PublicidadePage />} />
        <Route path="/admin/relatorios" element={<AdminRelatoriosPage />} />
        <Route path="/debug" element={<DebugProvidersPage />} />
        <Route path="/fix" element={<FixProvidersPage />} />
        <Route path="/:slug" element={<SlugResolver />} />
      </Routes>
      {!hideNavbar && <BottomNav />}
    </div>
  )
}

export default App
