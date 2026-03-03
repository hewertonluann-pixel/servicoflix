import { Routes, Route } from 'react-router-dom'
import { Navbar } from '@/components/Navbar'
import { HomePage } from '@/pages/HomePage'
import { ProviderProfilePage } from '@/pages/ProviderProfilePage'
import { ProviderDashboardPage } from '@/pages/ProviderDashboardPage'
import { SearchPage } from '@/pages/SearchPage'
import { LoginPage } from '@/pages/LoginPage'

function App() {
  return (
    <div className="min-h-screen bg-background text-white font-sans">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/profissional/:id" element={<ProviderProfilePage />} />
        <Route path="/meu-perfil" element={<ProviderDashboardPage />} />
        <Route path="/buscar" element={<SearchPage />} />
        <Route path="/entrar" element={<LoginPage />} />
      </Routes>
    </div>
  )
}

export default App
