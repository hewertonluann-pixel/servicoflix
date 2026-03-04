import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Bell, User, Menu, X, Zap, Settings, LogOut, UserCircle, Briefcase, Home, Compass, ShoppingBag, Sparkles, MessageCircle } from 'lucide-react'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'

export const Navbar = () => {
  const { user, signOut, isProvider, isClient } = useSimpleAuth()
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

  // Previne scroll quando menu mobile aberto
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [menuOpen])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/buscar?q=${encodeURIComponent(query)}`)
      setSearchOpen(false)
      setMenuOpen(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    setUserMenuOpen(false)
    setMenuOpen(false)
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
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-background" fill="currentColor" />
          </div>
          <span className="text-lg sm:text-xl font-black tracking-tight">
            <span className="hidden xs:inline">Serviço</span>
            <span className="text-primary">Flix</span>
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
        <div className="flex items-center gap-1 sm:gap-3">
          {/* Botão "Tornar-se Prestador" - desktop */}
          {user && !isProvider && (
            <Link to="/tornar-se-prestador" className="hidden lg:block">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 border border-primary/30 text-primary text-xs font-bold rounded-lg hover:bg-primary/30 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Ser Prestador
              </motion.button>
            </Link>
          )}

          {/* Busca mobile - apenas ícone */}
          <button
            onClick={() => setSearchOpen(true)}
            className="md:hidden p-2 text-muted hover:text-white transition-colors touch-target"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Busca desktop */}
          <div className="hidden md:block">
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
          </div>

          {user && (
            <motion.button 
              className="hidden sm:flex p-2 text-muted hover:text-white relative touch-target" 
              whileHover={{ scale: 1.1 }}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </motion.button>
          )}

          {/* Menu do usuário - desktop */}
          <div className="hidden md:block relative" ref={userMenuRef}>
            {user ? (
              <>
                <motion.button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="w-8 h-8 rounded-full overflow-hidden border-2 border-transparent hover:border-primary transition-colors touch-target"
                  whileHover={{ scale: 1.05 }}
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-surface flex items-center justify-center">
                      <User className="w-4 h-4 text-muted" />
                    </div>
                  )}
                </motion.button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-12 w-56 bg-surface border border-border rounded-xl shadow-2xl shadow-black/50 overflow-hidden"
                    >
                      {/* Header com info do usuário */}
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-bold text-white truncate">{user.name}</p>
                        <p className="text-xs text-muted truncate">{user.email}</p>
                        {isProvider && isClient && (
                          <div className="flex gap-1 mt-2">
                            <span className="px-2 py-0.5 bg-primary/20 border border-primary/30 text-primary text-[10px] font-semibold rounded">Prestador</span>
                            <span className="px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] font-semibold rounded">Cliente</span>
                          </div>
                        )}
                      </div>

                      <div className="py-2">
                        {/* Links de Prestador */}
                        {isProvider && (
                          <>
                            <div className="px-3 py-1">
                              <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Área do Prestador</p>
                            </div>
                            <Link
                              to="/meu-perfil"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted hover:text-white hover:bg-background transition-colors"
                            >
                              <Briefcase className="w-4 h-4 text-primary" />
                              <span>Meu Perfil</span>
                            </Link>
                            <Link
                              to="/prestador/solicitacoes"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted hover:text-white hover:bg-background transition-colors"
                            >
                              <MessageCircle className="w-4 h-4 text-primary" />
                              <span>Solicitações</span>
                              <span className="ml-auto px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded-full">3</span>
                            </Link>
                          </>
                        )}

                        {/* Links de Cliente */}
                        {isClient && (
                          <>
                            {isProvider && <div className="border-t border-border my-2" />}
                            <div className="px-3 py-1">
                              <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Área do Cliente</p>
                            </div>
                            <Link
                              to="/minha-conta"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted hover:text-white hover:bg-background transition-colors"
                            >
                              <ShoppingBag className="w-4 h-4 text-blue-400" />
                              <span>Minha Conta</span>
                            </Link>
                          </>
                        )}

                        {/* Configurações */}
                        <div className="border-t border-border my-2" />
                        <Link
                          to="/configuracoes"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted hover:text-white hover:bg-background transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          Configurações
                        </Link>

                        {/* Tornar-se Prestador */}
                        {!isProvider && (
                          <Link
                            to="/tornar-se-prestador"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          >
                            <Sparkles className="w-4 h-4" />
                            <span className="font-semibold">Tornar-se Prestador</span>
                          </Link>
                        )}
                      </div>

                      {/* Sair */}
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
                  className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors touch-target"
                  whileHover={{ scale: 1.05 }}
                >
                  <User className="w-4 h-4 text-muted" />
                </motion.div>
              </Link>
            )}
          </div>

          {/* Botão menu mobile */}
          <button 
            className="md:hidden text-muted hover:text-white p-2 touch-target" 
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Menu mobile fullscreen */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="md:hidden fixed inset-0 top-14 bg-background z-40 overflow-y-auto"
          >
            <div className="px-4 py-6 space-y-6">
              {/* Busca mobile */}
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Buscar serviço..."
                  className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-muted outline-none focus:border-primary transition-colors"
                />
              </form>

              {/* Perfil do usuário */}
              {user && (
                <div className="p-4 bg-surface border border-border rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-background shrink-0">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-6 h-6 text-muted" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{user.name}</p>
                      <p className="text-xs text-muted truncate">{user.email}</p>
                    </div>
                  </div>
                  {isProvider && isClient && (
                    <div className="flex gap-2">
                      <span className="px-2.5 py-1 bg-primary/20 border border-primary/30 text-primary text-xs font-semibold rounded-full">Prestador</span>
                      <span className="px-2.5 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-semibold rounded-full">Cliente</span>
                    </div>
                  )}
                </div>
              )}

              {/* Links principais */}
              <div className="space-y-1">
                <Link 
                  to="/" 
                  onClick={() => setMenuOpen(false)} 
                  className="flex items-center gap-3 px-4 py-3 text-white font-semibold hover:bg-surface rounded-xl transition-colors touch-target"
                >
                  <Home className="w-5 h-5" />
                  Início
                </Link>
                <Link 
                  to="/buscar" 
                  onClick={() => setMenuOpen(false)} 
                  className="flex items-center gap-3 px-4 py-3 text-muted hover:text-white hover:bg-surface rounded-xl transition-colors touch-target"
                >
                  <Compass className="w-5 h-5" />
                  Explorar Serviços
                </Link>
              </div>

              {/* Links do usuário */}
              {user ? (
                <>
                  {/* Área do Prestador */}
                  {isProvider && (
                    <div className="border-t border-border pt-4">
                      <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2 px-2">Área do Prestador</p>
                      <div className="space-y-1">
                        <Link 
                          to="/meu-perfil" 
                          onClick={() => setMenuOpen(false)} 
                          className="flex items-center gap-3 px-4 py-3 text-muted hover:text-white hover:bg-surface rounded-xl transition-colors touch-target"
                        >
                          <Briefcase className="w-5 h-5 text-primary" />
                          <span>Meu Perfil</span>
                        </Link>
                        <Link 
                          to="/prestador/solicitacoes" 
                          onClick={() => setMenuOpen(false)} 
                          className="flex items-center gap-3 px-4 py-3 text-muted hover:text-white hover:bg-surface rounded-xl transition-colors touch-target"
                        >
                          <MessageCircle className="w-5 h-5 text-primary" />
                          <span>Solicitações</span>
                          <span className="ml-auto px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded-full">3</span>
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Área do Cliente */}
                  {isClient && (
                    <div className="border-t border-border pt-4">
                      <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2 px-2">Área do Cliente</p>
                      <div className="space-y-1">
                        <Link 
                          to="/minha-conta" 
                          onClick={() => setMenuOpen(false)} 
                          className="flex items-center gap-3 px-4 py-3 text-muted hover:text-white hover:bg-surface rounded-xl transition-colors touch-target"
                        >
                          <ShoppingBag className="w-5 h-5 text-blue-400" />
                          <span>Minha Conta</span>
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Configurações */}
                  <div className="border-t border-border pt-4 space-y-1">
                    <Link 
                      to="/configuracoes" 
                      onClick={() => setMenuOpen(false)} 
                      className="flex items-center gap-3 px-4 py-3 text-muted hover:text-white hover:bg-surface rounded-xl transition-colors touch-target"
                    >
                      <Settings className="w-5 h-5" />
                      Configurações
                    </Link>
                  </div>

                  {/* Tornar-se Prestador */}
                  {!isProvider && (
                    <Link 
                      to="/tornar-se-prestador" 
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-primary/20 border-2 border-primary/30 text-primary font-bold rounded-xl hover:bg-primary/30 transition-colors touch-target"
                    >
                      <Sparkles className="w-5 h-5" />
                      Tornar-se Prestador
                    </Link>
                  )}

                  {/* Sair */}
                  <button 
                    onClick={handleSignOut} 
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 font-semibold rounded-xl hover:bg-red-500/20 transition-colors touch-target"
                  >
                    <LogOut className="w-5 h-5" />
                    Sair da Conta
                  </button>
                </>
              ) : (
                <Link 
                  to="/entrar" 
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-primary text-background font-bold rounded-xl hover:bg-primary-dark transition-colors touch-target"
                >
                  <User className="w-5 h-5" />
                  Entrar ou Cadastrar
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de busca mobile */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start pt-20 px-4"
            onClick={() => setSearchOpen(false)}
          >
            <motion.form
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              onSubmit={handleSearch}
              onClick={e => e.stopPropagation()}
              className="w-full relative"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar serviço..."
                className="w-full bg-surface border-2 border-primary rounded-xl pl-10 pr-4 py-4 text-white text-lg placeholder:text-muted outline-none"
              />
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
