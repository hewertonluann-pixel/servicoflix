import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Bell, User, Menu, X, Zap, Settings, LogOut, UserCircle, Briefcase } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export const Navbar = () => {
  const { user, signOut } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Fecha menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) navigate(`/buscar?q=${encodeURIComponent(query)}`)
  }

  const handleSignOut = async () => {
    await signOut()
    setUserMenuOpen(false)
    navigate('/')
  }

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-background/95 backdrop-blur shadow-lg shadow-black/30' : 'bg-gradient-to-b from-black/70 to-transparent'
      }`}
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-5 h-5 text-background" fill="currentColor" />
          </div>
          <span className="text-xl font-black tracking-tight">
            Serviço<span className="text-primary">Flix</span>
          </span>
        </Link>

        {/* Links desktop */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted">
          <Link to="/" className="hover:text-white transition-colors">Início</Link>
          <Link to="/buscar" className="hover:text-white transition-colors">Explorar</Link>
          <Link to="/buscar?categoria=limpeza" className="hover:text-white transition-colors">Limpeza</Link>
          <Link to="/buscar?categoria=reparos" className="hover:text-white transition-colors">Reparos</Link>
        </div>

        {/* Ações direita */}
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {searchOpen ? (
              <motion.form
                onSubmit={handleSearch}
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 240, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="flex items-center bg-surface border border-border rounded-lg overflow-hidden"
              >
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Buscar serviço..."
                  className="bg-transparent px-3 py-2 text-sm text-white placeholder:text-muted outline-none w-full"
                />
                <button type="button" onClick={() => setSearchOpen(false)} className="px-2 text-muted hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </motion.form>
            ) : (
              <motion.button
                onClick={() => setSearchOpen(true)}
                className="p-2 text-muted hover:text-white transition-colors"
                whileHover={{ scale: 1.1 }}
              >
                <Search className="w-5 h-5" />
              </motion.button>
            )}
          </AnimatePresence>

          {user && (
            <motion.button className="p-2 text-muted hover:text-white relative" whileHover={{ scale: 1.1 }}>
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </motion.button>
          )}

          {/* Menu do usuário */}
          <div className="relative" ref={userMenuRef}>
            {user ? (
              <>
                <motion.button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="w-8 h-8 rounded-full overflow-hidden border-2 border-transparent hover:border-primary transition-colors"
                  whileHover={{ scale: 1.05 }}
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'Usuário'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-surface flex items-center justify-center">
                      <User className="w-4 h-4 text-muted" />
                    </div>
                  )}
                </motion.button>

                {/* Dropdown */}
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-12 w-56 bg-surface border border-border rounded-xl shadow-2xl shadow-black/50 overflow-hidden"
                    >
                      {/* Header do menu */}
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-bold text-white truncate">{user.displayName || 'Usuário'}</p>
                        <p className="text-xs text-muted truncate">{user.email}</p>
                      </div>

                      {/* Opções */}
                      <div className="py-2">
                        <Link
                          to="/meu-perfil"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted hover:text-white hover:bg-background transition-colors"
                        >
                          <Briefcase className="w-4 h-4" />
                          Meu Perfil
                        </Link>
                        <Link
                          to="/configuracoes"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted hover:text-white hover:bg-background transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          Configurações
                        </Link>
                        <Link
                          to="/minha-conta"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted hover:text-white hover:bg-background transition-colors"
                        >
                          <UserCircle className="w-4 h-4" />
                          Minha Conta
                        </Link>
                      </div>

                      {/* Logout */}
                      <div className="border-t border-border py-2">
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-background transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sair
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <Link to="/entrar">
                <motion.div
                  className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
                  whileHover={{ scale: 1.05 }}
                >
                  <User className="w-4 h-4 text-muted" />
                </motion.div>
              </Link>
            )}
          </div>

          <button className="md:hidden text-muted hover:text-white" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-background/98 border-t border-border px-4 py-4 flex flex-col gap-4 text-sm font-medium"
          >
            <Link to="/" onClick={() => setMenuOpen(false)} className="text-muted hover:text-white">Início</Link>
            <Link to="/buscar" onClick={() => setMenuOpen(false)} className="text-muted hover:text-white">Explorar</Link>
            {user ? (
              <>
                <Link to="/meu-perfil" onClick={() => setMenuOpen(false)} className="text-muted hover:text-white">Meu Perfil</Link>
                <button onClick={handleSignOut} className="text-left text-red-400 hover:text-red-300">Sair</button>
              </>
            ) : (
              <Link to="/entrar" onClick={() => setMenuOpen(false)} className="text-muted hover:text-white">Entrar</Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
