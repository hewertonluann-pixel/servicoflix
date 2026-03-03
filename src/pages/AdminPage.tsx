import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Users, Briefcase, Tag, Plus, Trash2, Edit2,
  Search, Check, X, ToggleLeft, ToggleRight, Save, RefreshCw,
  AlertTriangle, LogOut
} from 'lucide-react'
import {
  collection, getDocs, doc, updateDoc, deleteDoc,
  setDoc, serverTimestamp, query, orderBy
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'

// UID do administrador
const ADMIN_UIDS = ['Glhzl4mWRkNjttVBLaLhoUWLWxf1']

type Tab = 'usuarios' | 'prestadores' | 'categorias'

interface UserData {
  id: string
  name: string
  email: string
  avatar?: string
  roles: string[]
  createdAt?: any
  providerProfile?: any
  clientProfile?: any
}

interface Category {
  id: string
  name: string
  icon: string
  active: boolean
  createdAt?: any
}

const DEFAULT_ICONS = ['🔧', '🏠', '🚿', '⚡', '🌿', '🎨', '🚗', '📦', '🍽️', '🐾', '💻', '📸', '🏋️', '🧹', '🔑', '🪴']

export const AdminPage = () => {
  const { user, loading: authLoading } = useSimpleAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('usuarios')
  const [users, setUsers] = useState<UserData[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [catModal, setCatModal] = useState(false)
  const [catForm, setCatForm] = useState({ name: '', icon: '🔧' })
  const [editingCat, setEditingCat] = useState<Category | null>(null)

  // Verifica admin pelo user.id (que é o UID do Firebase)
  const isAdmin = user && ADMIN_UIDS.includes(user.id)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadUsers = async () => {
    setLoadingData(true)
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserData)))
    } catch {
      try {
        const snap = await getDocs(collection(db, 'users'))
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserData)))
      } catch {
        showToast('Erro ao carregar usuários', 'error')
      }
    } finally {
      setLoadingData(false)
    }
  }

  const loadCategories = async () => {
    setLoadingData(true)
    try {
      const snap = await getDocs(collection(db, 'categories'))
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)))
    } catch {
      showToast('Erro ao carregar categorias', 'error')
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => {
    if (!authLoading && isAdmin) {
      loadUsers()
      loadCategories()
    }
  }, [authLoading, isAdmin])

  const toggleRole = async (userId: string, role: string, hasRole: boolean) => {
    try {
      const userDoc = users.find(u => u.id === userId)!
      const newRoles = hasRole
        ? userDoc.roles.filter(r => r !== role)
        : [...userDoc.roles, role]
      await updateDoc(doc(db, 'users', userId), { roles: newRoles })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, roles: newRoles } : u))
      showToast(`Role '${role}' ${hasRole ? 'removida' : 'adicionada'}!`)
    } catch {
      showToast('Erro ao atualizar role', 'error')
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return
    try {
      await deleteDoc(doc(db, 'users', userId))
      setUsers(prev => prev.filter(u => u.id !== userId))
      showToast('Usuário excluído!')
    } catch {
      showToast('Erro ao excluir usuário', 'error')
    }
  }

  const saveCategory = async () => {
    if (!catForm.name.trim()) return
    try {
      if (editingCat) {
        await updateDoc(doc(db, 'categories', editingCat.id), { name: catForm.name, icon: catForm.icon })
        setCategories(prev => prev.map(c => c.id === editingCat.id ? { ...c, ...catForm } : c))
        showToast('Categoria atualizada!')
      } else {
        const newId = catForm.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        await setDoc(doc(db, 'categories', newId), { ...catForm, active: true, createdAt: serverTimestamp() })
        setCategories(prev => [...prev, { id: newId, ...catForm, active: true }])
        showToast('Categoria criada!')
      }
      setCatModal(false)
      setCatForm({ name: '', icon: '🔧' })
      setEditingCat(null)
    } catch {
      showToast('Erro ao salvar categoria', 'error')
    }
  }

  const toggleCategory = async (cat: Category) => {
    try {
      await updateDoc(doc(db, 'categories', cat.id), { active: !cat.active })
      setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, active: !c.active } : c))
      showToast(`Categoria ${cat.active ? 'desativada' : 'ativada'}!`)
    } catch {
      showToast('Erro ao atualizar categoria', 'error')
    }
  }

  const deleteCategory = async (catId: string) => {
    if (!confirm('Excluir esta categoria?')) return
    try {
      await deleteDoc(doc(db, 'categories', catId))
      setCategories(prev => prev.filter(c => c.id !== catId))
      showToast('Categoria excluída!')
    } catch {
      showToast('Erro ao excluir categoria', 'error')
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white mb-2">Login Necessário</h1>
          <p className="text-muted mb-6">Você precisa estar logado para acessar o painel admin.</p>
          <button onClick={() => navigate('/entrar')} className="px-6 py-3 bg-primary text-background font-bold rounded-xl">
            Fazer Login
          </button>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white mb-2">Acesso Negado</h1>
          <p className="text-muted mb-4">Você não tem permissão para acessar esta página.</p>
          <p className="text-xs text-muted font-mono mb-6">UID: {user.id}</p>
          <button onClick={() => navigate('/')} className="px-6 py-3 bg-primary text-background font-bold rounded-xl">
            Voltar ao Início
          </button>
        </div>
      </div>
    )
  }

  const providers = users.filter(u => u.roles?.includes('provider'))
  const clients = users.filter(u => !u.roles?.includes('provider'))
  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )
  const filteredProviders = providers.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl font-semibold text-sm shadow-lg ${
              toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-surface border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-black text-white">Painel Admin</h1>
              <p className="text-xs text-muted">ServiçoFlix</p>
            </div>
          </div>
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-muted hover:text-white transition-colors">
            <LogOut className="w-4 h-4" />
            Sair do painel
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Usuários', value: users.length, icon: Users, color: 'text-blue-400' },
            { label: 'Clientes', value: clients.length, icon: Users, color: 'text-green-400' },
            { label: 'Prestadores', value: providers.length, icon: Briefcase, color: 'text-primary' },
            { label: 'Categorias', value: categories.length, icon: Tag, color: 'text-purple-400' },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-surface border border-border rounded-xl p-4"
            >
              <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
              <p className="text-2xl font-black text-white">{stat.value}</p>
              <p className="text-xs text-muted">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-surface border border-border rounded-xl p-1">
          {[
            { id: 'usuarios', label: 'Usuários', icon: Users },
            { id: 'prestadores', label: 'Prestadores', icon: Briefcase },
            { id: 'categorias', label: 'Categorias', icon: Tag },
          ].map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id as Tab); setSearch('') }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === tab.id ? 'bg-primary text-background' : 'text-muted hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Busca */}
        {activeTab !== 'categorias' && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou email..."
              className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-muted outline-none focus:border-primary transition-colors"
            />
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-muted">
            {activeTab === 'usuarios' && `${filteredUsers.length} usuários`}
            {activeTab === 'prestadores' && `${filteredProviders.length} prestadores`}
            {activeTab === 'categorias' && `${categories.length} categorias`}
          </p>
          <div className="flex gap-2">
            <button onClick={() => { loadUsers(); loadCategories() }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border text-muted hover:text-white text-xs rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Atualizar
            </button>
            {activeTab === 'categorias' && (
              <button onClick={() => { setEditingCat(null); setCatForm({ name: '', icon: '🔧' }); setCatModal(true) }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-background text-xs font-bold rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" /> Nova Categoria
              </button>
            )}
          </div>
        </div>

        {loadingData && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* ABA: USUÁRIOS */}
        {activeTab === 'usuarios' && !loadingData && (
          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-muted">Nenhum usuário encontrado</div>
            ) : filteredUsers.map(u => (
              <motion.div key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden bg-background shrink-0">
                  {u.avatar
                    ? <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-muted text-lg">{u.name?.[0]?.toUpperCase()}</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{u.name || 'Sem nome'}</p>
                  <p className="text-xs text-muted truncate">{u.email}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {u.roles?.map(role => (
                      <span key={role} className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                        role === 'provider' ? 'bg-primary/20 text-primary border border-primary/30'
                        : role === 'admin' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>{role}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggleRole(u.id, 'provider', u.roles?.includes('provider'))}
                    title={u.roles?.includes('provider') ? 'Remover prestador' : 'Tornar prestador'}
                    className={`p-1.5 rounded-lg transition-colors ${
                      u.roles?.includes('provider')
                        ? 'bg-primary/20 text-primary hover:bg-red-500/20 hover:text-red-400'
                        : 'bg-surface border border-border text-muted hover:bg-primary/20 hover:text-primary'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteUser(u.id)}
                    className="p-1.5 rounded-lg bg-surface border border-border text-muted hover:bg-red-500/20 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ABA: PRESTADORES */}
        {activeTab === 'prestadores' && !loadingData && (
          <div className="space-y-3">
            {filteredProviders.length === 0 ? (
              <div className="text-center py-12 text-muted">Nenhum prestador encontrado</div>
            ) : filteredProviders.map(u => (
              <motion.div key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-surface border border-border rounded-xl p-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-background shrink-0">
                    {u.avatar
                      ? <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-muted text-xl">{u.name?.[0]?.toUpperCase()}</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-white">{u.name}</p>
                        <p className="text-xs text-muted">{u.email}</p>
                      </div>
                      <div className="flex gap-2">
                        {u.providerProfile?.verified ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 border border-green-500/30 text-green-400 text-[10px] font-semibold rounded-full">
                            <Check className="w-3 h-3" /> Verificado
                          </span>
                        ) : (
                          <button
                            onClick={async () => {
                              await updateDoc(doc(db, 'users', u.id), { 'providerProfile.verified': true })
                              setUsers(prev => prev.map(p => p.id === u.id ? { ...p, providerProfile: { ...p.providerProfile, verified: true } } : p))
                              showToast('Prestador verificado!')
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-[10px] font-semibold rounded-full hover:bg-green-500/20 hover:text-green-400 transition-colors"
                          >
                            <Check className="w-3 h-3" /> Verificar
                          </button>
                        )}
                        <button onClick={() => toggleRole(u.id, 'provider', true)}
                          className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-semibold rounded-full hover:bg-red-500/30 transition-colors"
                        >
                          <X className="w-3 h-3" /> Remover
                        </button>
                      </div>
                    </div>
                    {u.providerProfile && (
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {u.providerProfile.specialty && (
                          <div className="bg-background rounded-lg px-3 py-2">
                            <p className="text-[10px] text-muted">Especialidade</p>
                            <p className="text-xs text-white font-medium">{u.providerProfile.specialty}</p>
                          </div>
                        )}
                        {u.providerProfile.city && (
                          <div className="bg-background rounded-lg px-3 py-2">
                            <p className="text-[10px] text-muted">Cidade</p>
                            <p className="text-xs text-white font-medium">{u.providerProfile.city}</p>
                          </div>
                        )}
                        {u.providerProfile.priceFrom && (
                          <div className="bg-background rounded-lg px-3 py-2">
                            <p className="text-[10px] text-muted">A partir de</p>
                            <p className="text-xs text-primary font-bold">R$ {u.providerProfile.priceFrom}</p>
                          </div>
                        )}
                        {u.providerProfile.skills?.length > 0 && (
                          <div className="bg-background rounded-lg px-3 py-2">
                            <p className="text-[10px] text-muted">Skills</p>
                            <p className="text-xs text-white font-medium">{u.providerProfile.skills.length} habilidades</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ABA: CATEGORIAS */}
        {activeTab === 'categorias' && !loadingData && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.length === 0 ? (
              <div className="col-span-3 text-center py-12 text-muted">Nenhuma categoria. Crie uma!</div>
            ) : categories.map(cat => (
              <motion.div key={cat.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`bg-surface border rounded-xl p-4 flex items-center justify-between gap-3 ${
                  cat.active ? 'border-border' : 'border-border opacity-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cat.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-white">{cat.name}</p>
                    <p className="text-xs text-muted">{cat.active ? 'Ativa' : 'Inativa'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => toggleCategory(cat)} className="p-1.5 rounded-lg hover:bg-background transition-colors">
                    {cat.active ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5 text-muted" />}
                  </button>
                  <button onClick={() => { setEditingCat(cat); setCatForm({ name: cat.name, icon: cat.icon }); setCatModal(true) }}
                    className="p-1.5 rounded-lg hover:bg-background text-muted hover:text-white transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteCategory(cat.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Categoria */}
      <AnimatePresence>
        {catModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setCatModal(false)}
          >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md"
            >
              <h2 className="text-lg font-black text-white mb-4">
                {editingCat ? 'Editar Categoria' : 'Nova Categoria'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-muted mb-1.5">Nome</label>
                  <input type="text" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })}
                    placeholder="Ex: Limpeza, Elétrica..."
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-2">Ícone</label>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_ICONS.map(icon => (
                      <button key={icon} type="button" onClick={() => setCatForm({ ...catForm, icon })}
                        className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-colors ${
                          catForm.icon === icon
                            ? 'bg-primary/30 border-2 border-primary'
                            : 'bg-background border border-border hover:border-primary/50'
                        }`}
                      >{icon}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setCatModal(false)}
                  className="flex-1 py-3 bg-background border border-border text-muted font-semibold rounded-xl hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button onClick={saveCategory} disabled={!catForm.name.trim()}
                  className="flex-1 py-3 bg-primary text-background font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingCat ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
