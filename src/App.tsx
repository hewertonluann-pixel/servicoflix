import { Routes, Route, useLocation } from 'react-router-dom'
import { Navbar } from '@/components/Navbar'
import { HomePage } from '@/pages/HomePage'
import { ProviderProfilePage } from '@/pages/ProviderProfilePage'
import { ProviderDashboardPage } from '@/pages/ProviderDashboardPage'
import { ProviderRequestsPage } from '@/pages/ProviderRequestsPage'
import { MyAccountPage } from '@/pages/MyAccountPage'
import { BecomeProviderPage } from '@/pages/BecomeProviderPage'
import { SearchPage } from '@/pages/SearchPage'
import { SimpleLoginPage } from '@/pages/SimpleLoginPage'
import { AdminPage } from '@/pages/AdminPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { EditProviderProfilePage } from '@/pages/EditProviderProfilePage'

function App() {
  const location = useLocation()
  const hideNavbar = location.pathname.startsWith('/admin')

  return (
    <div className="min-h-screen bg-background text-white font-sans">
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/profissional/:id" element={<ProviderProfilePage />} />
        <Route path="/meu-perfil" element={<ProviderDashboardPage />} />
        <Route path="/meu-perfil/editar" element={<EditProviderProfilePage />} />
        <Route path="/prestador/solicitacoes" element={<ProviderRequestsPage />} />
        <Route path="/minha-conta" element={<MyAccountPage />} />
        <Route path="/configuracoes" element={<SettingsPage />} />
        <Route path="/tornar-se-prestador" element={<BecomeProviderPage />} />
        <Route path="/buscar" element={<SearchPage />} />
        <Route path="/entrar" element={<SimpleLoginPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </div>
  )
}

export default App
