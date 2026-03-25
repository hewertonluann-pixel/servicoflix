import { CompraPage } from '@/pages/CompraPage'
import { Routes, Route, useLocation } from 'react-router-dom'
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
import { PublicidadePage } from '@/pages/PublicidadePage'
import { DebugProvidersPage } from '@/pages/DebugProvidersPage'
import { FixProvidersPage } from '@/pages/FixProvidersPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { EditProviderProfilePage } from '@/pages/EditProviderProfilePage'
import { ChatPage } from '@/pages/ChatPage'
import { ChatsPage } from '@/pages/ChatsPage'
import { InstallPage } from '@/pages/InstallPage'
import { usePresence } from '@/hooks/usePresence'

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

        {/* Utilitários (ocultos da navbar) */}
        <Route path="/debug" element={<DebugProvidersPage />} />
        <Route path="/fix" element={<FixProvidersPage />} />
      </Routes>
    </div>
  )
}

export default App
