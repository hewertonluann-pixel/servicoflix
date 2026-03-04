import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Users, Briefcase, Tag, Plus, Trash2, Edit2,
  Search, Check, X, ToggleLeft, ToggleRight, Save, RefreshCw,
  AlertTriangle, LogOut, UserPlus, MapPin, DollarSign, Star, Clock
} from 'lucide-react'
import {
  collection, getDocs, doc, updateDoc, deleteDoc,
  setDoc, serverTimestamp, query, orderBy, arrayUnion, where
} from 'firebase/firestore'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'

const ADMIN_UIDS = ['Glhzl4mWRkNjttVBLaLhoUWLWxf1']

type Tab = 'pendentes' | 'usuarios' | 'prestadores' | 'categorias'

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

const ICON_GROUPS = [
  { label: '🎵 Música', icons: ['🎵', '🎶', '🎷', '🎸', '🎹', '🎺', '🎻', '🥁', '🎼', '🎴', '🎰', '🎬'] },
  { label: '🔧 Serviços', icons: ['🔧', '🏠', '🚿', '⚡', '🌿', '🎨', '🚗', '📦', '🍽️', '🐾', '💻', '📸'] },
  { label: '🏋️ Saúde', icons: ['🏋️', '🧘', '💪', '🏥', '💊', '🦷', '🚴', '🏊', '🧖', '🤼', '🏃', '🧗'] },
  { label: '📚 Educação', icons: ['📚', '🎓', '✏️', '📝', '💻', '🔬', '🧠', '🏆', '📊', '🗺️', '📰', '💼'] },
  { label: '🌿 Casa', icons: ['🌿', '🪴', '🔑', '🧹', '🧰', '🚪', '🛏️', '🛢️', '💧', '🔥', '✂️', '🪣'] },
]

const EMPTY_PROVIDER_FORM = {
  name: '', email: '', password: '',
  specialty: '', city: '', bio: '',
  priceFrom: '', skills: '', whatsapp: '',
  verified: false,
}

export const AdminPage = () => {
  const { user, loading: authLoading } = useSimpleAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('pendentes')
  const [users, setUsers] = useState<UserData[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [catModal, setCatModal] = useState(false)
  const [catForm, setCatForm] = useState({ name: '', icon: '🔧' })
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [activeIconGroup, setActiveIconGroup] = useState(0)
  const [providerModal, setProviderModal] = useState(false)
  const [providerForm, setProviderForm] = useState(EMPTY_PROVIDER_FORM)
  const [savingProvider, setSavingProvider] = useState(false)
  const [editingProvider, setEditingProvider] = useState<UserData | null>(null)
  const [rejectModal, setRejectModal] = useState<UserData | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const isAdmin = user && ADMIN_UIDS.includes(user.id)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Carrega TODOS os usuários sem orderBy para evitar falha por índice ausente
  const loadUsers = async () => {
    setLoadingData(true)
    try {
      const snap = await getDocs(collection(db, 'users'))
      const allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserData))
      // Ordena no cliente: mais recentes primeiro
      allUsers.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0
        const tb = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0
        return tb - ta
      })
      setUsers(allUsers)
    } catch (err: any) {
      console.error('Erro ao carregar usuários:', err)
      showToast('Erro ao carregar usuários: ' + (err?.message || ''), 'error')
    } finally {
      setLoadingData(false)
    }
  }

  const loadCategories = async () => {
    setLoadingData(true)
    try {
      const snap = await getDocs(collection(db, 'categories'))
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)))
    } catch { showToast('Erro ao carregar categorias', 'error') }
    finally { setLoadingData(false) }
  }

  useEffect(() => {
    if (!authLoading && isAdmin) { loadUsers(); loadCategories() }
  }, [authLoading, isAdmin])

  const approveProvider = async (u: UserData) => {
    try {
      await updateDoc(doc(db, 'users', u.id), {
        roles: arrayUnion('provider'),
        'providerProfile.status': 'approved',
        'providerProfile.verified': true,
        'providerProfile.approvedAt': new Date().toISOString(),
      })
      setUsers(prev => prev.map(p => p.id === u.id ? {
        ...p,
        roles: [...(p.roles || []), 'provider'],
        providerProfile: { ...p.providerProfile, status: 'approved', verified: true }
      } : p))
      showToast(`✅ ${u.name} aprovado como prestador!`)
    } catch (err: any) {
      showToast('Erro ao aprovar: ' + (err?.message || ''), 'error')
    }
  }

  const rejectProvider = async () => {
    if (!rejectModal) return
    try {
      await updateDoc(doc(db, 'users', rejectModal.id), {
        'providerProfile.status': 'rejected',
        'providerProfile.rejectedAt': new Date().toISOString(),
        'providerProfile.rejectionReason': rejectReason,
      })
      setUsers(prev => prev.map(p => p.id === rejectModal.id ? {
        ...p,
        providerProfile: { ...p.providerProfile, status: 'rejected' }
      } : p))
      showToast(`Solicitação de ${rejectModal.name} rejeitada`)
      setRejectModal(null)
      setRejectReason('')
    } catch { showToast('Erro ao rejeitar', 'error') }
  }

  const toggleRole = async (userId: string, role: string, hasRole: boolean) => {
    try {
      const userDoc = users.find(u => u.id === userId)!
      const newRoles = hasRole ? userDoc.roles.filter(r => r !== role) : [...userDoc.roles, role]
      await updateDoc(doc(db, 'users', userId), { roles: newRoles })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, roles: newRoles } : u))
      showToast(`Role '${role}' ${hasRole ? 'removida' : 'adicionada'}!`)
    } catch { showToast('Erro ao atualizar role', 'error') }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return
    try {
      await deleteDoc(doc(db, 'users', userId))
      setUsers(prev => prev.filter(u => u.id !== userId))
      showToast('Usuário excluído!')
    } catch { showToast('Erro ao excluir usuário', 'error') }
  }

  const saveProvider = async () => {
    if (!providerForm.name.trim() || !providerForm.email.trim()) return
    setSavingProvider(true)
    try {
      if (editingProvider) {
        const providerProfile = {
          ...editingProvider.providerProfile,
          specialty: providerForm.specialty,
          city: providerForm.city,
          bio: providerForm.bio,
          priceFrom: providerForm.priceFrom,
          skills: providerForm.skills.split(',').map(s => s.trim()).filter(Boolean),
          whatsapp: providerForm.whatsapp,
          verified: providerForm.verified,
        }
        await updateDoc(doc(db, 'users', editingProvider.id), { name: providerForm.name, providerProfile })
        setUsers(prev => prev.map(u => u.id === editingProvider.id ? { ...u, name: providerForm.name, providerProfile } : u))
        showToast('Prestador atualizado!')
      } else {
        const cred = await createUserWithEmailAndPassword(auth, providerForm.email, providerForm.password || '123456')
        await updateProfile(cred.user, { displayName: providerForm.name })
        const newUser: any = {
          id: cred.user.uid, name: providerForm.name, email: providerForm.email,
          roles: ['client', 'provider'], clientProfile: {},
          providerProfile: {
            specialty: providerForm.specialty, city: providerForm.city,
            bio: providerForm.bio, priceFrom: providerForm.priceFrom,
            skills: providerForm.skills.split(',').map(s => s.trim()).filter(Boolean),
            whatsapp: providerForm.whatsapp, verified: providerForm.verified,
            status: 'approved',
          },
          createdAt: serverTimestamp(),
        }
        await setDoc(doc(db, 'users', cred.user.uid), newUser)
        setUsers(prev => [newUser, ...prev])
        showToast(`Prestador criado! Senha: ${providerForm.password || '123456'}`)
      }
      setProviderModal(false)
      setProviderForm(EMPTY_PROVIDER_FORM)
      setEditingProvider(null)
    } catch (err: any) {
      showToast(err?.message || 'Erro ao salvar prestador', 'error')
    } finally { setSavingProvider(false) }
  }

  const openEditProvider = (u: UserData) => {
    setEditingProvider(u)
    setProviderForm({
      name: u.name || '', email: u.email || '', password: '',
      specialty: u.providerProfile?.specialty || '',
      city: u.providerProfile?.city || '',
      bio: u.providerProfile?.bio || '',
      priceFrom: u.providerProfile?.priceFrom || '',
      skills: (u.providerProfile?.skills || []).join(', '),
      whatsapp: u.providerProfile?.whatsapp || '',
      verified: u.providerProfile?.verified || false,
    })
    setProviderModal(true)
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
    } catch { showToast('Erro ao salvar categoria', 'error') }
  }

  const toggleCategory = async (cat: Category) => {
    try {
      await updateDoc(doc(db, 'categories', cat.id), { active: !cat.active })
      setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, active: !c.active } : c))
      showToast(`Categoria ${cat.active ? 'desativada' : 'ativada'}!`)
    } catch { showToast('Erro ao atualizar categoria', 'error') }
  }

  const deleteCategory = async (catId: string) => {
    if (!confirm('Excluir esta categoria?')) return
    try {
      await deleteDoc(doc(db, 'categories', catId))
      setCategories(prev => prev.filter(c => c.id !== catId))
      showToast('Categoria excluída!')
    } catch { showToast('Erro ao excluir categoria', 'error') }
  }

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!user) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-2xl font-black text-white mb-2">Login Necessário</h1>
        <p className="text-muted mb-6">Você precisa estar logado.</p>
        <button onClick={() => navigate('/entrar')} className="px-6 py-3 bg-primary text-background font-bold rounded-xl">Fazer Login</button>
      </div>
    </div>
  )
  if (!isAdmin) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-2xl font-black text-white mb-2">Acesso Negado</h1>
        <p className="text-muted mb-4">Você não tem permissão para acessar esta página.</p>
        <p className="text-xs text-muted font-mono mb-6">UID: {user.id}</p>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-primary text-background font-bold rounded-xl">Voltar ao Início</button>
      </div>
    </div>
  )

  const providers = users.filter(u => u.roles?.includes('provider'))
  const clients = users.filter(u => !u.roles?.includes('provider'))
  const pendingProviders = users.filter(u => u.providerProfile?.status === 'pending')
  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )
  const filteredProviders = providers.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  const inputCls = "w-full bg-background border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary transition-colors placeholder:text-muted"

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl font-semibold text-sm shadow-lg max-w-xs ${
              toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}
          >{toast.msg}</motion.div>
        )}
      </AnimatePresence>

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
            <LogOut className="w-4 h-4" /> Sair do painel
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Usuários', value: users.length, icon: Users, color: 'text-blue-400' },
            { label: 'Clientes', value: clients.length, icon: Users, color: 'text-green-400' },
            { label: 'Prestadores', value: providers.length, icon: Briefcase, color: 'text-primary' },
            { label: 'Aguardando', value: pendingProviders.length, icon: Clock, color: pendingProviders.length > 0 ? 'text-yellow-400' : 'text-muted' },
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

        <div className="flex gap-1.5 mb-6 bg-surface border border-border rounded-xl p-1 flex-wrap">
          {[
            { id: 'pendentes', label: 'Pendentes', icon: Clock, badge: pendingProviders.length },
            { id: 'usuarios', label: 'Usuários', icon: Users },
            { id: 'prestadores', label: 'Prestadores', icon: Briefcase },
            { id: 'categorias', label: 'Categorias', icon: Tag },
          ].map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id as Tab); setSearch('') }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-sm font-semibold transition-colors relative ${
                activeTab === tab.id ? 'bg-primary text-background' : 'text-muted hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge && tab.badge > 0 ? (
                <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center ${
                  activeTab === tab.id ? 'bg-background text-primary' : 'bg-yellow-400 text-background'
                }`}>{tab.badge}</span>
              ) : null}
            </button>
          ))}
        </div>

        {activeTab !== 'categorias' && activeTab !== 'pendentes' && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou email..."
              className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-muted outline-none focus:border-primary transition-colors"
            />
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-muted">
            {activeTab === 'pendentes' && `${pendingProviders.length} aguardando aprovação`}
            {activeTab === 'usuarios' && `${filteredUsers.length} usuários`}
            {activeTab === 'prestadores' && `${filteredProviders.length} prestadores`}
            {activeTab === 'categorias' && `${categories.length} categorias`}
          </p>
          <div className="flex gap-2">
            <button onClick={() => { loadUsers(); loadCategories() }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border text-muted hover:text-white text-xs rounded-lg transition-colors"
            ><RefreshCw className="w-3.5 h-3.5" /> Atualizar</button>
            {activeTab === 'prestadores' && (
              <button onClick={() => { setEditingProvider(null); setProviderForm(EMPTY_PROVIDER_FORM); setProviderModal(true) }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-background text-xs font-bold rounded-lg"
              ><UserPlus className="w-3.5 h-3.5" /> Novo Prestador</button>
            )}
            {activeTab === 'categorias' && (
              <button onClick={() => { setEditingCat(null); setCatForm({ name: '', icon: '🔧' }); setActiveIconGroup(0); setCatModal(true) }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-background text-xs font-bold rounded-lg"
              ><Plus className="w-3.5 h-3.5" /> Nova Categoria</button>
            )}
          </div>
        </div>

        {loadingData && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* ABA: PENDENTES */}
        {activeTab === 'pendentes' && !loadingData && (
          <div className="space-y-4">
            {pendingProviders.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-400" />
                </div>
                <p className="text-white font-semibold">Tudo em dia!</p>
                <p className="text-muted text-sm mt-1">Nenhuma solicitação pendente.</p>
              </div>
            ) : pendingProviders.map(u => (
              <motion.div key={u.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-surface border border-yellow-500/30 rounded-xl p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-background shrink-0">
                    {u.avatar ? <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-muted text-xl font-bold">{u.name?.[0]?.toUpperCase()}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-white">{u.name}</p>
                      <span className="px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-[10px] font-bold rounded-full flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> Pendente
                      </span>
                    </div>
                    <p className="text-xs text-muted mb-3">{u.email}</p>
                    {u.providerProfile && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
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
                            <p className="text-[10px] text-muted">Preço a partir de</p>
                            <p className="text-xs text-primary font-bold">R$ {u.providerProfile.priceFrom}</p>
                          </div>
                        )}
                        {u.providerProfile.submittedAt && (
                          <div className="bg-background rounded-lg px-3 py-2">
                            <p className="text-[10px] text-muted">Enviado em</p>
                            <p className="text-xs text-white font-medium">{new Date(u.providerProfile.submittedAt).toLocaleDateString('pt-BR')}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {u.providerProfile?.bio && (
                      <p className="text-xs text-muted bg-background rounded-lg px-3 py-2 mb-3 line-clamp-2">
                        {u.providerProfile.bio}
                      </p>
                    )}
                    {u.providerProfile?.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {u.providerProfile.skills.map((s: string) => (
                          <span key={s} className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[10px] rounded-full">{s}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => approveProvider(u)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-xl transition-colors"
                      >
                        <Check className="w-4 h-4" /> Aprovar
                      </button>
                      <button onClick={() => { setRejectModal(u); setRejectReason('') }}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-sm font-bold rounded-xl transition-colors"
                      >
                        <X className="w-4 h-4" /> Recusar
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
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
                  {u.avatar ? <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-muted text-lg">{u.name?.[0]?.toUpperCase()}</div>}
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
                    {u.providerProfile?.status === 'pending' && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">⏳ pendente</span>
                    )}
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
                  ><Briefcase className="w-3.5 h-3.5" /></button>
                  <button onClick={() => deleteUser(u.id)}
                    className="p-1.5 rounded-lg bg-surface border border-border text-muted hover:bg-red-500/20 hover:text-red-400 transition-colors"
                  ><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ABA: PRESTADORES */}
        {activeTab === 'prestadores' && !loadingData && (
          <div className="space-y-3">
            {filteredProviders.length === 0 ? (
              <div className="text-center py-16 text-muted">
                <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">Nenhum prestador ainda</p>
                <p className="text-xs mt-1">Clique em "Novo Prestador" para adicionar</p>
              </div>
            ) : filteredProviders.map(u => (
              <motion.div key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-surface border border-border rounded-xl p-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-background shrink-0">
                    {u.avatar ? <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-muted text-xl">{u.name?.[0]?.toUpperCase()}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-white">{u.name}</p>
                        <p className="text-xs text-muted">{u.email}</p>
                      </div>
                      <div className="flex gap-2 flex-wrap justify-end">
                        {u.providerProfile?.verified ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 border border-green-500/30 text-green-400 text-[10px] font-semibold rounded-full">
                            <Check className="w-3 h-3" /> Verificado
                          </span>
                        ) : (
                          <button onClick={async () => {
                            await updateDoc(doc(db, 'users', u.id), { 'providerProfile.verified': true })
                            setUsers(prev => prev.map(p => p.id === u.id ? { ...p, providerProfile: { ...p.providerProfile, verified: true } } : p))
                            showToast('Prestador verificado!')
                          }} className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-[10px] font-semibold rounded-full hover:bg-green-500/20 hover:text-green-400 transition-colors">
                            <Check className="w-3 h-3" /> Verificar
                          </button>
                        )}
                        <button onClick={() => openEditProvider(u)}
                          className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] font-semibold rounded-full hover:bg-blue-500/30 transition-colors"
                        ><Edit2 className="w-3 h-3" /> Editar</button>
                        <button onClick={() => toggleRole(u.id, 'provider', true)}
                          className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-semibold rounded-full hover:bg-red-500/30 transition-colors"
                        ><X className="w-3 h-3" /> Remover</button>
                      </div>
                    </div>
                    {u.providerProfile && (
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {u.providerProfile.specialty && <div className="bg-background rounded-lg px-3 py-2"><p className="text-[10px] text-muted">Especialidade</p><p className="text-xs text-white font-medium">{u.providerProfile.specialty}</p></div>}
                        {u.providerProfile.city && <div className="bg-background rounded-lg px-3 py-2"><p className="text-[10px] text-muted flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />Cidade</p><p className="text-xs text-white font-medium">{u.providerProfile.city}</p></div>}
                        {u.providerProfile.priceFrom && <div className="bg-background rounded-lg px-3 py-2"><p className="text-[10px] text-muted flex items-center gap-1"><DollarSign className="w-2.5 h-2.5" />A partir de</p><p className="text-xs text-primary font-bold">R$ {u.providerProfile.priceFrom}</p></div>}
                        {u.providerProfile.skills?.length > 0 && <div className="bg-background rounded-lg px-3 py-2"><p className="text-[10px] text-muted flex items-center gap-1"><Star className="w-2.5 h-2.5" />Skills</p><p className="text-xs text-white font-medium">{u.providerProfile.skills.length} habilidades</p></div>}
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
                  <button onClick={() => { setEditingCat(cat); setCatForm({ name: cat.name, icon: cat.icon }); setActiveIconGroup(0); setCatModal(true) }}
                    className="p-1.5 rounded-lg hover:bg-background text-muted hover:text-white transition-colors"
                  ><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deleteCategory(cat.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted hover:text-red-400 transition-colors"
                  ><Trash2 className="w-4 h-4" /></button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: RECUSAR */}
      <AnimatePresence>
        {rejectModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setRejectModal(null)}
          >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md"
            >
              <h2 className="text-lg font-black text-white mb-1">Recusar solicitação</h2>
              <p className="text-sm text-muted mb-4">Motivo para <span className="text-white font-semibold">{rejectModal.name}</span></p>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="Ex: Informações insuficientes, perfil incompleto..."
                rows={3}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-red-500 transition-colors placeholder:text-muted resize-none mb-4"
              />
              <div className="flex gap-3">
                <button onClick={() => setRejectModal(null)}
                  className="flex-1 py-3 bg-background border border-border text-muted rounded-xl hover:text-white transition-colors font-semibold"
                >Cancelar</button>
                <button onClick={rejectProvider}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" /> Recusar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: NOVO / EDITAR PRESTADOR */}
      <AnimatePresence>
        {providerModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setProviderModal(false)}
          >
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-surface border border-border rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 bg-primary/20 rounded-xl flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-black text-white">{editingProvider ? 'Editar Prestador' : 'Novo Prestador'}</h2>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted mb-1.5">Nome completo *</label>
                    <input value={providerForm.name} onChange={e => setProviderForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="João Silva" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1.5">Email *</label>
                    <input value={providerForm.email} onChange={e => setProviderForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="joao@email.com" type="email" disabled={!!editingProvider}
                      className={`${inputCls} ${editingProvider ? 'opacity-50 cursor-not-allowed' : ''}`} />
                  </div>
                </div>
                {!editingProvider && (
                  <div>
                    <label className="block text-xs text-muted mb-1.5">Senha inicial</label>
                    <input value={providerForm.password} onChange={e => setProviderForm(p => ({ ...p, password: e.target.value }))}
                      placeholder="Padrão: 123456" type="password" className={inputCls} />
                    <p className="text-[11px] text-muted mt-1">Deixe em branco para senha padrão: 123456</p>
                  </div>
                )}
                <hr className="border-border" />
                <p className="text-xs font-bold text-muted uppercase tracking-wider">Perfil profissional</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted mb-1.5">Especialidade</label>
                    <input value={providerForm.specialty} onChange={e => setProviderForm(p => ({ ...p, specialty: e.target.value }))}
                      placeholder="Ex: Professor de Violão" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1.5">Cidade</label>
                    <input value={providerForm.city} onChange={e => setProviderForm(p => ({ ...p, city: e.target.value }))}
                      placeholder="Ex: Diamantina, MG" className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted mb-1.5">Preço a partir de (R$)</label>
                    <input value={providerForm.priceFrom} onChange={e => setProviderForm(p => ({ ...p, priceFrom: e.target.value }))}
                      placeholder="Ex: 50" type="number" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1.5">WhatsApp</label>
                    <input value={providerForm.whatsapp} onChange={e => setProviderForm(p => ({ ...p, whatsapp: e.target.value }))}
                      placeholder="(38) 99999-9999" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1.5">Bio</label>
                  <textarea value={providerForm.bio} onChange={e => setProviderForm(p => ({ ...p, bio: e.target.value }))}
                    placeholder="Descreva a experiência..." rows={3}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary transition-colors placeholder:text-muted resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1.5">Habilidades (separadas por vírgula)</label>
                  <input value={providerForm.skills} onChange={e => setProviderForm(p => ({ ...p, skills: e.target.value }))}
                    placeholder="Violão, Canto, Música Popular" className={inputCls} />
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div onClick={() => setProviderForm(p => ({ ...p, verified: !p.verified }))}
                    className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${
                      providerForm.verified ? 'bg-green-500' : 'bg-border'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      providerForm.verified ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </div>
                  <span className="text-sm text-white font-medium">Marcar como verificado</span>
                  {providerForm.verified && <Check className="w-4 h-4 text-green-400" />}
                </label>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => { setProviderModal(false); setEditingProvider(null) }}
                  className="flex-1 py-3 bg-background border border-border text-muted font-semibold rounded-xl hover:text-white transition-colors"
                >Cancelar</button>
                <button onClick={saveProvider}
                  disabled={savingProvider || !providerForm.name.trim() || (!editingProvider && !providerForm.email.trim())}
                  className="flex-1 py-3 bg-primary text-background font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingProvider ? <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingProvider ? 'Salvar alterações' : 'Criar prestador'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: CATEGORIA */}
      <AnimatePresence>
        {catModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setCatModal(false)}
          >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-lg font-black text-white mb-4">{editingCat ? 'Editar Categoria' : 'Nova Categoria'}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-muted mb-1.5">Nome</label>
                  <input type="text" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })}
                    placeholder="Ex: Aulas de Violão, Limpeza..."
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div className="flex items-center gap-3 bg-background rounded-xl px-4 py-3">
                  <span className="text-3xl">{catForm.icon}</span>
                  <div>
                    <p className="text-xs text-muted">Ícone selecionado</p>
                    <p className="text-sm text-white font-semibold">{catForm.name || 'Nome da categoria'}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-muted mb-2">Ícone</label>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {ICON_GROUPS.map((group, i) => (
                      <button key={i} type="button" onClick={() => setActiveIconGroup(i)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          activeIconGroup === i ? 'bg-primary text-background' : 'bg-background border border-border text-muted hover:text-white'
                        }`}
                      >{group.label}</button>
                    ))}
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {ICON_GROUPS[activeIconGroup].icons.map(icon => (
                      <button key={icon} type="button" onClick={() => setCatForm({ ...catForm, icon })}
                        className={`w-full aspect-square rounded-xl text-2xl flex items-center justify-center transition-all ${
                          catForm.icon === icon ? 'bg-primary/30 border-2 border-primary scale-110' : 'bg-background border border-border hover:border-primary/50 hover:scale-105'
                        }`}
                      >{icon}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setCatModal(false)}
                  className="flex-1 py-3 bg-background border border-border text-muted font-semibold rounded-xl hover:text-white transition-colors"
                >Cancelar</button>
                <button onClick={saveCategory} disabled={!catForm.name.trim()}
                  className="flex-1 py-3 bg-primary text-background font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />{editingCat ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
