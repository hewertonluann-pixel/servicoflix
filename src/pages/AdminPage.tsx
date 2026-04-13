import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Users, Briefcase, Tag, Plus, Trash2, Edit2,
  Search, Check, X, ToggleLeft, ToggleRight, Save, RefreshCw,
  AlertTriangle, LogOut, UserPlus, MapPin, DollarSign, Star, Clock, Loader2, Sparkles,
  ChevronUp, ChevronDown, Archive, CheckSquare, Bug, Wrench, ArrowRight, Camera,
  Flag, Eye, CheckCircle2, CreditCard, CalendarDays, TrendingUp, BadgeCheck, Ban, BarChart2,
} from 'lucide-react'
import {
  collection, getDocs, doc, updateDoc, deleteDoc,
  setDoc, serverTimestamp, getDoc, query, orderBy, addDoc, Timestamp
} from 'firebase/firestore'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth, db, storage } from '@/lib/firebase'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'
import { mocksByCategory } from '@/data/mock'
import { useAllCities, type City } from '@/hooks/useCities'

const ADMIN_UIDS = ['Glhzl4mWRkNjttVBLaLhoUWLWxf1', '5KqkZ0SPnpMkKO684W7fZBWHo4J2']

type Tab = 'pendentes' | 'usuarios' | 'prestadores' | 'categorias' | 'mockups' | 'cidades' | 'denuncias' | 'monetizacao'

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

interface MockSettings {
  [categoryId: string]: boolean
}

interface Report {
  id: string
  reportedBy: string
  reportedUser: string
  chatId: string
  reason: string
  description?: string
  createdAt: any
  status: 'pending' | 'reviewed' | 'resolved'
  reportedByName?: string
  reportedUserName?: string
}

interface DiasModalState {
  user: UserData
  dias: string
  observacao: string
  saving: boolean
}

const ICON_GROUPS = [
  { label: '🎵 Música', icons: ['🎵','🎶','🎷','🎸','🎹','🎺','🎻','🥁','🎼','🎴','🎰','🎬'] },
  { label: '🔧 Serviços', icons: ['🔧','🏠','🚿','⚡','🌿','🎨','🚗','📦','🍽️','🐾','💻','📸'] },
  { label: '🏋️ Saúde', icons: ['🏋️','🧘','💪','🏥','💊','🦷','🚴','🏊','🧖','🤼','🏃','🧗'] },
  { label: '📚 Educação', icons: ['📚','🎓','✏️','📝','💻','🔬','🧠','🏆','📊','🗺️','📰','💼'] },
  { label: '🌿 Casa', icons: ['🌿','🪴','🔑','🧹','🧪','🚪','🛌️','🛢️','💧','🔥','✂️','🪣'] },
]

const EMPTY_PROVIDER_FORM = {
  name: '', email: '', password: '',
  specialty: '', city: '', bio: '',
  priceFrom: '', skills: '', whatsapp: '', category: '',
  verified: false,
  professionalname: ''
}

const UF_OPTIONS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO'
]

const isScoreAtivo = (p: any): boolean => {
  if (!p) return false
  if (p.subscriptionStatus === 'active') return true
  if (p.scoreExpiresAt) {
    const ms = p.scoreExpiresAt?.toMillis?.() ?? (p.scoreExpiresAt?.seconds ?? 0) * 1000
    return ms > Date.now()
  }
  return false
}

const diasRestantes = (p: any): number | null => {
  if (!p?.scoreExpiresAt) return null
  const ms = p.scoreExpiresAt?.toMillis?.() ?? (p.scoreExpiresAt?.seconds ?? 0) * 1000
  const diff = ms - Date.now()
  if (diff <= 0) return 0
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
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
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [mockSettings, setMockSettings] = useState<MockSettings>({})
  const [loadingMocks, setLoadingMocks] = useState(false)

  // Denúncias
  const [reports, setReports] = useState<Report[]>([])
  const [loadingReports, setLoadingReports] = useState(false)
  const [reportFilter, setReportFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved'>('pending')

  // Avatar upload
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>('')
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null)
  const [coverImagePreview, setCoverImagePreview] = useState<string>('')
  const coverImageInputRef = useRef<HTMLInputElement>(null)

  // Cidades
  const { cities: allCities, loading: loadingCities, reload: reloadCities } = useAllCities()
  const [cityModal, setCityModal] = useState(false)
  const [cityForm, setCityForm] = useState({ nome: '', uf: 'MG', slug: '' })
  const [editingCity, setEditingCity] = useState<City | null>(null)
  const [savingCity, setSavingCity] = useState(false)
  const [providerCounts, setProviderCounts] = useState<Record<string, number>>({})

  // Monetização
  const [diasModal, setDiasModal] = useState<DiasModalState | null>(null)
  const [monetSearch, setMonetSearch] = useState('')

  // ── NOVO: Dias bônus para novos prestadores ──
  const [diasBonusNovoPrestador, setDiasBonusNovoPrestador] = useState(7)
  const [savingBonus, setSavingBonus] = useState(false)

  const isAdmin = user && ADMIN_UIDS.includes(user.id)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const loadUsers = async () => {
    setLoadingData(true)
    try {
      const snap = await getDocs(collection(db, 'users'))
      const allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserData))
      allUsers.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() || (a.createdAt?.seconds ?? 0) * 1000
        const tb = b.createdAt?.toMillis?.() || (b.createdAt?.seconds ?? 0) * 1000
        return tb - ta
      })
      setUsers(allUsers)
    } catch (err: any) {
      showToast('Erro ao carregar: ' + (err?.message || err?.code || 'desconhecido'), 'error')
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

  const loadMockSettings = async () => {
    setLoadingMocks(true)
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'mockups'))
      if (settingsDoc.exists()) {
        setMockSettings(settingsDoc.data().categories || {})
      } else {
        const initialSettings: MockSettings = {}
        Object.keys(mocksByCategory).forEach(cat => { initialSettings[cat] = true })
        setMockSettings(initialSettings)
      }
    } catch { showToast('Erro ao carregar mockups', 'error') }
    finally { setLoadingMocks(false) }
  }

  // ── NOVO: carregar configurações da plataforma ──
  const loadPlataformaSettings = async () => {
    try {
      const snap = await getDoc(doc(db, 'settings', 'plataforma'))
      if (snap.exists()) {
        setDiasBonusNovoPrestador(snap.data().diasBonusNovoPrestador ?? 7)
      }
    } catch {}
  }

  // ── NOVO: salvar configurações da plataforma ──
  const savePlataformaSettings = async () => {
    setSavingBonus(true)
    try {
      await setDoc(doc(db, 'settings', 'plataforma'), { diasBonusNovoPrestador }, { merge: true })
      showToast(`✅ Configuração salva: ${diasBonusNovoPrestador} dias bônus`)
    } catch (err: any) {
      showToast('Erro ao salvar: ' + (err?.message || ''), 'error')
    } finally {
      setSavingBonus(false)
    }
  }

  const loadProviderCounts = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'))
      const counts: Record<string, number> = {}
      snap.docs.map(d => ({ id: d.id, ...d.data() } as UserData))
        .filter(u => u.roles?.includes('provider'))
        .forEach(p => {
          const citySlug = p.providerProfile?.city_base || p.providerProfile?.city?.toLowerCase().replace(/\s+/g, '-')
          if (citySlug) counts[citySlug] = (counts[citySlug] || 0) + 1
        })
      setProviderCounts(counts)
    } catch {}
  }

  const loadReports = async () => {
    setLoadingReports(true)
    try {
      const snap = await getDocs(
        query(collection(db, 'reports'), orderBy('createdAt', 'desc'))
      )
      const list: Report[] = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data() as Omit<Report, 'id'>
          let reportedByName = data.reportedBy
          let reportedUserName = data.reportedUser
          try {
            const [bySnap, userSnap] = await Promise.all([
              getDoc(doc(db, 'users', data.reportedBy)),
              getDoc(doc(db, 'users', data.reportedUser)),
            ])
            if (bySnap.exists()) reportedByName = bySnap.data().name || data.reportedBy
            if (userSnap.exists()) reportedUserName = userSnap.data().providerProfile?.professionalName || userSnap.data().name || data.reportedUser
          } catch {}
          return { id: d.id, ...data, reportedByName, reportedUserName }
        })
      )
      setReports(list)
    } catch (err: any) {
      showToast('Erro ao carregar denúncias', 'error')
    } finally {
      setLoadingReports(false)
    }
  }

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate('/')
    if (isAdmin) {
      loadUsers()
      loadCategories()
      loadMockSettings()
      loadPlataformaSettings()
      loadProviderCounts()
      loadReports()
    }
  }, [authLoading, isAdmin])

  const saveMockSettings = async (newSettings: MockSettings) => {
    try {
      await setDoc(doc(db, 'settings', 'mockups'), { categories: newSettings })
      showToast('✅ Configurações de mockups salvas')
    } catch { showToast('Erro ao salvar mockups', 'error') }
  }

  const toggleMock = (categoryId: string) => {
    const newSettings = { ...mockSettings, [categoryId]: !mockSettings[categoryId] }
    setMockSettings(newSettings)
    saveMockSettings(newSettings)
  }

  // Salvar dias manualmente
  const saveDiasManual = async () => {
    if (!diasModal) return
    const dias = parseInt(diasModal.dias)
    if (isNaN(dias) || dias < 1) {
      showToast('Informe um número válido de dias (mínimo 1)', 'error')
      return
    }
    setDiasModal(m => m ? { ...m, saving: true } : null)
    try {
      const u = diasModal.user
      const p = u.providerProfile || {}
      const currentExpiry: any = p.scoreExpiresAt || null
      const baseDate =
        currentExpiry && (currentExpiry?.toMillis?.() ?? (currentExpiry?.seconds ?? 0) * 1000) > Date.now()
          ? (currentExpiry?.toDate ? currentExpiry.toDate() : new Date((currentExpiry.seconds ?? 0) * 1000))
          : new Date()
      baseDate.setDate(baseDate.getDate() + dias)
      const newExpiry = Timestamp.fromDate(baseDate)
      const totalDiasRestantes = Math.ceil((newExpiry.toMillis() - Date.now()) / (1000 * 60 * 60 * 24))

      await updateDoc(doc(db, 'users', u.id), {
        'providerProfile.scoreExpiresAt': newExpiry,
        'providerProfile.diasScore': totalDiasRestantes,
        'providerProfile.active': true,
      })

      await addDoc(collection(db, 'historico_creditos'), {
        providerId: u.id,
        tipo: 'manual',
        dias,
        valor: 0,
        observacao: diasModal.observacao.trim() || 'Adicionado manualmente pelo admin',
        stripePaymentId: null,
        createdAt: serverTimestamp(),
      })

      setUsers(prev => prev.map(usr =>
        usr.id === u.id
          ? { ...usr, providerProfile: { ...usr.providerProfile, scoreExpiresAt: newExpiry, diasScore: totalDiasRestantes, active: true } }
          : usr
      ))

      showToast(`✅ +${dias} dias adicionados para ${u.providerProfile?.professionalName || u.name}`)
      setDiasModal(null)
    } catch (err: any) {
      showToast('Erro ao salvar: ' + (err?.message || ''), 'error')
      setDiasModal(m => m ? { ...m, saving: false } : null)
    }
  }

  // ---------- Cidades ----------
  const saveCity = async () => {
    if (!cityForm.nome.trim()) return
    setSavingCity(true)
    try {
      const slug = editingCity?.id || cityForm.slug || cityForm.nome.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      await setDoc(doc(db, 'cities', slug), {
        nome: cityForm.nome.trim(),
        uf: cityForm.uf,
        slug,
        active: true,
        createdAt: editingCity ? editingCity.createdAt : serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      showToast(editingCity ? '✅ Cidade atualizada' : '✅ Cidade adicionada')
      setCityModal(false)
      setEditingCity(null)
      setCityForm({ nome: '', uf: 'MG', slug: '' })
      reloadCities()
    } catch (err: any) {
      showToast('Erro ao salvar cidade: ' + (err?.message || ''), 'error')
    } finally {
      setSavingCity(false)
    }
  }

  const deleteCity = async (cityId: string) => {
    if (!confirm('Remover esta cidade?')) return
    try {
      await deleteDoc(doc(db, 'cities', cityId))
      showToast('✅ Cidade removida')
      reloadCities()
    } catch { showToast('Erro ao remover cidade', 'error') }
  }

  // ---------- Categorias ----------
  const saveCategory = async () => {
    if (!catForm.name.trim()) return
    try {
      if (editingCat) {
        await updateDoc(doc(db, 'categories', editingCat.id), { name: catForm.name, icon: catForm.icon })
        setCategories(prev => prev.map(c => c.id === editingCat.id ? { ...c, name: catForm.name, icon: catForm.icon } : c))
      } else {
        const ref = await addDoc(collection(db, 'categories'), { name: catForm.name, icon: catForm.icon, active: true, createdAt: serverTimestamp() })
        setCategories(prev => [...prev, { id: ref.id, name: catForm.name, icon: catForm.icon, active: true }])
      }
      showToast('✅ Categoria salva')
      setCatModal(false)
      setEditingCat(null)
      setCatForm({ name: '', icon: '🔧' })
    } catch { showToast('Erro ao salvar categoria', 'error') }
  }

  const deleteCategory = async (id: string) => {
    if (!confirm('Deletar esta categoria?')) return
    try {
      await deleteDoc(doc(db, 'categories', id))
      setCategories(prev => prev.filter(c => c.id !== id))
      showToast('✅ Categoria deletada')
    } catch { showToast('Erro ao deletar', 'error') }
  }

  const toggleCategory = async (cat: Category) => {
    try {
      await updateDoc(doc(db, 'categories', cat.id), { active: !cat.active })
      setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, active: !c.active } : c))
    } catch { showToast('Erro ao atualizar categoria', 'error') }
  }

  // ── MODIFICADO: concede diasBonusNovoPrestador ao aprovar ──
  const approveProvider = async (u: UserData) => {
    setProcessingIds(prev => new Set(prev).add(u.id))
    try {
      const currentRoles: string[] = Array.isArray(u.roles) ? u.roles : ['client']
      const newRoles = currentRoles.includes('provider') ? currentRoles : [...currentRoles, 'provider']

      const expiry = new Date()
      expiry.setDate(expiry.getDate() + diasBonusNovoPrestador)
      const scoreExpiresAt = Timestamp.fromDate(expiry)

      await setDoc(doc(db, 'users', u.id), {
        roles: newRoles,
        providerProfile: {
          ...(u.providerProfile || {}),
          status: 'approved',
          verified: true,
          approvedAt: new Date().toISOString(),
          scoreExpiresAt,
          diasScore: diasBonusNovoPrestador,
          active: true,
        },
      }, { merge: true })

      await addDoc(collection(db, 'historico_creditos'), {
        providerId: u.id,
        tipo: 'bonus_aprovacao',
        dias: diasBonusNovoPrestador,
        valor: 0,
        observacao: `Bônus de aprovação: ${diasBonusNovoPrestador} dias`,
        stripePaymentId: null,
        createdAt: serverTimestamp(),
      })

      setUsers(prev => prev.map(p => p.id === u.id ? {
        ...p, roles: newRoles,
        providerProfile: { ...p.providerProfile, status: 'approved', verified: true, scoreExpiresAt, diasScore: diasBonusNovoPrestador, active: true },
      } : p))
      showToast(`✅ ${u.name} aprovado! +${diasBonusNovoPrestador} dias de bônus concedidos.`)
    } catch (err: any) {
      showToast('❌ Erro ao aprovar: ' + (err?.message || err?.code || ''), 'error')
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(u.id); return s })
    }
  }

  const rejectProvider = async (u: UserData) => {
    if (!rejectReason.trim()) {
      showToast('Informe o motivo da rejeição', 'error')
      return
    }
    setProcessingIds(prev => new Set(prev).add(u.id))
    try {
      await setDoc(doc(db, 'users', u.id), {
        providerProfile: { ...(u.providerProfile || {}), status: 'rejected', rejectedAt: new Date().toISOString(), rejectionReason: rejectReason },
      }, { merge: true })
      setUsers(prev => prev.map(p => p.id === u.id ? { ...p, providerProfile: { ...p.providerProfile, status: 'rejected' } } : p))
      showToast(`✅ ${u.name} rejeitado`)
      setRejectModal(null)
      setRejectReason('')
    } catch (err: any) {
      showToast('Erro ao rejeitar: ' + (err?.message || ''), 'error')
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(u.id); return s })
    }
  }

  const toggleAdminRole = async (userId: string, currentRoles: string[]) => {
    const newRoles = currentRoles.includes('admin')
      ? currentRoles.filter(r => r !== 'admin')
      : [...currentRoles, 'admin']
    try {
      await updateDoc(doc(db, 'users', userId), { roles: newRoles })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, roles: newRoles } : u))
      showToast('✅ Papel atualizado')
    } catch { showToast('Erro ao atualizar papel', 'error') }
  }

  const toggleFeatured = async (userId: string, isFeatured: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { 'providerProfile.featured': !isFeatured })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, providerProfile: { ...u.providerProfile, featured: !isFeatured } } : u))
    } catch { showToast('Erro ao atualizar destaque', 'error') }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Deletar este usuário permanentemente?')) return
    try {
      await deleteDoc(doc(db, 'users', userId))
      setUsers(prev => prev.filter(u => u.id !== userId))
      showToast('✅ Usuário deletado')
    } catch { showToast('Erro ao deletar', 'error') }
  }

  const updateReport = async (reportId: string, status: Report['status']) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { status, reviewedAt: serverTimestamp() })
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r))
      showToast('✅ Denúncia atualizada')
    } catch { showToast('Erro ao atualizar denúncia', 'error') }
  }

  // ── Salvar / editar prestador ──
  const saveProviderModal = async () => {
    if (!providerForm.name.trim()) { showToast('Nome obrigatório', 'error'); return }
    setSavingProvider(true)
    try {
      if (editingProvider) {
        const providerProfile = {
          ...editingProvider.providerProfile,
          professionalName: providerForm.name,
          specialty: providerForm.specialty,
          city: providerForm.city,
          bio: providerForm.bio,
          priceFrom: providerForm.priceFrom,
          skills: providerForm.skills.split(',').map(s => s.trim()).filter(Boolean),
          whatsapp: providerForm.whatsapp,
          category: providerForm.category,
          verified: providerForm.verified,
        }
        await updateDoc(doc(db, 'users', editingProvider.id), { name: providerForm.name, providerProfile })
        setUsers(prev => prev.map(u => u.id === editingProvider.id ? { ...u, name: providerForm.name, providerProfile } : u))
        showToast('✅ Prestador atualizado')
      } else {
        if (!providerForm.email.trim() || !providerForm.password.trim()) { showToast('Email e senha obrigatórios', 'error'); setSavingProvider(false); return }
        const cred = await createUserWithEmailAndPassword(auth, providerForm.email, providerForm.password)
        await updateProfile(cred.user, { displayName: providerForm.name })
        const newUser: UserData = {
          id: cred.user.uid,
          name: providerForm.name,
          email: providerForm.email,
          roles: ['client', 'provider'],
          providerProfile: {
            professionalName: providerForm.name,
            specialty: providerForm.specialty,
            city: providerForm.city,
            bio: providerForm.bio,
            priceFrom: providerForm.priceFrom,
            skills: providerForm.skills.split(',').map(s => s.trim()).filter(Boolean),
            whatsapp: providerForm.whatsapp,
            category: providerForm.category,
            status: 'approved',
            verified: providerForm.verified,
            active: false,
          },
        }
        await setDoc(doc(db, 'users', cred.user.uid), { ...newUser, createdAt: serverTimestamp() })
        setUsers(prev => [newUser, ...prev])
        showToast('✅ Prestador criado')
      }
      setProviderModal(false)
      setEditingProvider(null)
      setProviderForm(EMPTY_PROVIDER_FORM)
      setAvatarFile(null)
      setAvatarPreview('')
    } catch (err: any) {
      showToast('Erro: ' + (err?.message || ''), 'error')
    } finally {
      setSavingProvider(false)
    }
  }

  // ── Derived data ──
  const pendingProviders = users.filter(u => u.providerProfile?.status === 'pending')
  const allProviders = users.filter(u => u.roles?.includes('provider'))
  const providers = allProviders.filter(u => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.providerProfile?.specialty?.toLowerCase().includes(q) ||
      u.providerProfile?.city?.toLowerCase().includes(q) ||
      u.providerProfile?.professionalName?.toLowerCase().includes(q)
    )
  })

  const filteredUsers = users.filter(u => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
  })

  const filteredReports = reports.filter(r => reportFilter === 'all' ? true : r.status === reportFilter)

  // Monetização
  const monetProviders = allProviders.filter(u => {
    if (!monetSearch.trim()) return true
    const q = monetSearch.toLowerCase()
    const p = u.providerProfile || {}
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      p.professionalName?.toLowerCase().includes(q)
    )
  })

  const monetAtivos = providers.filter(u => isScoreAtivo(u.providerProfile)).length
  const monetExpirados = providers.filter(u => !isScoreAtivo(u.providerProfile)).length
  const monetAssinatura = providers.filter(u => u.providerProfile?.subscriptionStatus === 'active').length

  if (authLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  )

  if (!isAdmin) return null

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'pendentes', label: 'Pendentes', icon: <Clock className="w-4 h-4" />, count: pendingProviders.length },
    { id: 'usuarios', label: 'Usuários', icon: <Users className="w-4 h-4" />, count: filteredUsers.length },
    { id: 'prestadores', label: 'Prestadores', icon: <Briefcase className="w-4 h-4" />, count: allProviders.length },
    { id: 'categorias', label: 'Categorias', icon: <Tag className="w-4 h-4" /> },
    { id: 'mockups', label: 'Mockups', icon: <Archive className="w-4 h-4" /> },
    { id: 'cidades', label: 'Cidades', icon: <MapPin className="w-4 h-4" /> },
    { id: 'denuncias', label: 'Denúncias', icon: <Flag className="w-4 h-4" />, count: reports.filter(r => r.status === 'pending').length },
    { id: 'monetizacao', label: 'Monetização', icon: <CreditCard className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen bg-background text-text pb-20">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl text-sm font-semibold shadow-lg border ${
              toast.type === 'error'
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : 'bg-green-500/10 border-green-500/30 text-green-300'
            }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="border-b border-border bg-surface sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-bold text-white">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-xs text-muted hover:text-white transition-colors flex items-center gap-1">
              <ArrowRight className="w-3 h-3 rotate-180" /> Voltar ao site
            </Link>
            <button onClick={() => { auth.signOut(); navigate('/') }} className="text-xs text-muted hover:text-red-400 transition-colors flex items-center gap-1">
              <LogOut className="w-3 h-3" /> Sair
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto pb-0 scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === tab.id ? 'bg-primary/20 text-primary' : 'bg-border text-muted'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* ── PENDENTES ── */}
        {activeTab === 'pendentes' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Aprovações Pendentes</h2>
              <button onClick={loadUsers} className="text-xs text-muted hover:text-white flex items-center gap-1 transition-colors">
                <RefreshCw className="w-3 h-3" /> Atualizar
              </button>
            </div>

            {/* Configuração de dias bônus */}
            <div className="bg-surface border border-border rounded-xl p-4 mb-4 flex items-center gap-3 flex-wrap">
              <Sparkles className="w-4 h-4 text-yellow-400 shrink-0" />
              <span className="text-sm text-white font-semibold">Dias bônus ao aprovar:</span>
              <input
                type="number"
                min={1}
                max={365}
                className="w-20 bg-background border border-border rounded-lg px-2 py-1 text-sm text-white text-center"
                value={diasBonusNovoPrestador}
                onChange={e => setDiasBonusNovoPrestador(Math.max(1, parseInt(e.target.value) || 1))}
              />
              <span className="text-sm text-muted">dias</span>
              <button
                onClick={savePlataformaSettings}
                disabled={savingBonus || diasBonusNovoPrestador < 1}
                className="ml-auto px-3 py-1.5 bg-primary hover:bg-primary/80 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {savingBonus ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Salvar
              </button>
            </div>

            {loadingData ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : pendingProviders.length === 0 ? (
              <div className="text-center py-16">
                <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30 text-muted" />
                <p className="font-semibold text-white">Nenhuma aprovação pendente</p>
                <p className="text-sm text-muted mt-1">Tudo em dia!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingProviders.map(u => (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-surface border border-border rounded-xl p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-background border border-border overflow-hidden shrink-0 flex items-center justify-center">
                        {u.providerProfile?.avatar || u.avatar
                          ? <img src={u.providerProfile?.avatar || u.avatar} alt={u.name} className="w-full h-full object-cover" />
                          : <span className="text-sm font-black text-muted">{u.name?.charAt(0)?.toUpperCase()}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white truncate">{u.providerProfile?.professionalName || u.name}</p>
                        <p className="text-xs text-muted">{u.email}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {u.providerProfile?.specialty && (
                            <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">{u.providerProfile.specialty}</span>
                          )}
                          {u.providerProfile?.city && (
                            <span className="px-2 py-0.5 bg-border text-muted text-xs rounded-full flex items-center gap-1">
                              <MapPin className="w-3 h-3" />{u.providerProfile.city}
                            </span>
                          )}
                          {u.providerProfile?.priceFrom && (
                            <span className="px-2 py-0.5 bg-border text-muted text-xs rounded-full flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />A partir de R${u.providerProfile.priceFrom}
                            </span>
                          )}
                        </div>
                        {u.providerProfile?.bio && (
                          <p className="text-xs text-muted mt-2 line-clamp-2">{u.providerProfile.bio}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => approveProvider(u)}
                        disabled={processingIds.has(u.id)}
                        className="flex-1 py-2 bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 text-green-300 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        {processingIds.has(u.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Aprovar (+{diasBonusNovoPrestador}d)
                      </button>
                      <button
                        onClick={() => { setRejectModal(u); setRejectReason('') }}
                        disabled={processingIds.has(u.id)}
                        className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <X className="w-4 h-4" /> Rejeitar
                      </button>
                      <Link to={`/prestador/${u.id}`} target="_blank"
                        className="px-3 py-2 bg-border hover:bg-surface-dynamic border border-border text-muted hover:text-white text-sm rounded-lg transition-colors flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── USUÁRIOS ── */}
        {activeTab === 'usuarios' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Todos os Usuários</h2>
              <button onClick={loadUsers} className="text-xs text-muted hover:text-white flex items-center gap-1 transition-colors">
                <RefreshCw className="w-3 h-3" /> Atualizar
              </button>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                className="w-full bg-surface border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-primary"
                placeholder="Buscar usuários..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {loadingData ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map(u => (
                  <motion.div key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="bg-surface border border-border rounded-xl p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-background border border-border overflow-hidden shrink-0 flex items-center justify-center">
                      {u.avatar
                        ? <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                        : <span className="text-xs font-black text-muted">{u.name?.charAt(0)?.toUpperCase()}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{u.name}</p>
                      <p className="text-xs text-muted truncate">{u.email}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(u.roles || []).map(r => (
                          <span key={r} className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                            r === 'admin' ? 'bg-yellow-500/15 text-yellow-300' :
                            r === 'provider' ? 'bg-primary/15 text-primary' :
                            'bg-border text-muted'
                          }`}>{r}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleAdminRole(u.id, u.roles || [])}
                        title={u.roles?.includes('admin') ? 'Remover admin' : 'Tornar admin'}
                        className={`p-1.5 rounded-lg transition-colors ${u.roles?.includes('admin') ? 'text-yellow-400 hover:text-yellow-300' : 'text-muted hover:text-yellow-400'}`}
                      >
                        <Shield className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteUser(u.id)} title="Deletar usuário"
                        className="p-1.5 rounded-lg text-muted hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PRESTADORES ── */}
        {activeTab === 'prestadores' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Prestadores</h2>
              <div className="flex gap-2">
                <button onClick={loadUsers} className="text-xs text-muted hover:text-white flex items-center gap-1 transition-colors">
                  <RefreshCw className="w-3 h-3" /> Atualizar
                </button>
                <button
                  onClick={() => { setProviderModal(true); setEditingProvider(null); setProviderForm(EMPTY_PROVIDER_FORM); setAvatarFile(null); setAvatarPreview('') }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary hover:bg-primary/80 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Novo
                </button>
              </div>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                className="w-full bg-surface border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-primary"
                placeholder="Buscar prestadores..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {loadingData ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-2">
                {providers.map(u => {
                  const p = u.providerProfile || {}
                  return (
                    <motion.div key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="bg-surface border border-border rounded-xl p-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-background border border-border overflow-hidden shrink-0 flex items-center justify-center">
                        {p.avatar || u.avatar
                          ? <img src={p.avatar || u.avatar} alt={u.name} className="w-full h-full object-cover" />
                          : <span className="text-sm font-black text-muted">{u.name?.charAt(0)?.toUpperCase()}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white truncate">{p.professionalName || u.name}</p>
                          {p.verified && <BadgeCheck className="w-3.5 h-3.5 text-primary shrink-0" />}
                          {p.featured && <Star className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
                        </div>
                        <p className="text-xs text-muted truncate">{u.email}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {p.specialty && <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] rounded-full">{p.specialty}</span>}
                          {p.city && <span className="px-1.5 py-0.5 bg-border text-muted text-[10px] rounded-full">{p.city}</span>}
                          <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                            p.status === 'approved' ? 'bg-green-500/10 text-green-400' :
                            p.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                            'bg-red-500/10 text-red-400'
                          }`}>{p.status || 'sem status'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleFeatured(u.id, p.featured)}
                          title={p.featured ? 'Remover destaque' : 'Destacar'}
                          className={`p-1.5 rounded-lg transition-colors ${p.featured ? 'text-yellow-400' : 'text-muted hover:text-yellow-400'}`}>
                          <Star className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => {
                          setEditingProvider(u)
                          setProviderForm({
                            name: u.name,
                            email: u.email,
                            password: '',
                            specialty: u.providerProfile?.specialty || '',
                            city: u.providerProfile?.city || '',
                            bio: u.providerProfile?.bio || '',
                            priceFrom: u.providerProfile?.priceFrom || '',
                            skills: (u.providerProfile?.skills || []).join(', '),
                            whatsapp: u.providerProfile?.whatsapp || '',
                            category: u.providerProfile?.category || '',
                            verified: u.providerProfile?.verified || false,
                            professionalname: u.providerProfile?.professionalName || '',
                          })
                          setAvatarFile(null)
                          setAvatarPreview('')
                          setProviderModal(true)
                        }} className="p-1.5 rounded-lg text-muted hover:text-white transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <Link to={`/prestador/${u.id}`} target="_blank"
                          className="p-1.5 rounded-lg text-muted hover:text-white transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        <button onClick={() => deleteUser(u.id)}
                          className="p-1.5 rounded-lg text-muted hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── CATEGORIAS ── */}
        {activeTab === 'categorias' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Categorias</h2>
              <button
                onClick={() => { setCatModal(true); setEditingCat(null); setCatForm({ name: '', icon: '🔧' }) }}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary hover:bg-primary/80 text-white text-xs font-bold rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Nova
              </button>
            </div>
            {loadingData ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categories.map(cat => (
                  <div key={cat.id} className="bg-surface border border-border rounded-xl p-3 flex items-center gap-3">
                    <span className="text-2xl">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{cat.name}</p>
                      <p className="text-xs text-muted">{cat.active ? 'Ativa' : 'Inativa'}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleCategory(cat)} className={`p-1.5 rounded-lg transition-colors ${cat.active ? 'text-green-400' : 'text-muted'}`}>
                        {cat.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button onClick={() => { setEditingCat(cat); setCatForm({ name: cat.name, icon: cat.icon }); setCatModal(true) }}
                        className="p-1.5 text-muted hover:text-white transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteCategory(cat.id)} className="p-1.5 text-muted hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MOCKUPS ── */}
        {activeTab === 'mockups' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Controle de Mockups</h2>
                <p className="text-xs text-muted mt-0.5">Ative/desative prestadores falsos por categoria</p>
              </div>
              <button onClick={loadMockSettings} className="text-xs text-muted hover:text-white flex items-center gap-1 transition-colors">
                <RefreshCw className="w-3 h-3" /> Atualizar
              </button>
            </div>
            {loadingMocks ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-2">
                {Object.entries(mocksByCategory).map(([categoryId, mocks]) => {
                  const isEnabled = mockSettings[categoryId] !== false
                  return (
                    <div key={categoryId} className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4">
                      <div className="flex-1">
                        <p className="font-semibold text-white capitalize">{categoryId}</p>
                        <p className="text-xs text-muted">{mocks.length} prestadores mockados</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${isEnabled ? 'text-green-400' : 'text-muted'}`}>
                          {isEnabled ? 'Ativo' : 'Inativo'}
                        </span>
                        <button onClick={() => toggleMock(categoryId)} className={`transition-colors ${isEnabled ? 'text-green-400' : 'text-muted'}`}>
                          {isEnabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── CIDADES ── */}
        {activeTab === 'cidades' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Cidades</h2>
                <p className="text-xs text-muted mt-0.5">{allCities.length} cidades cadastradas</p>
              </div>
              <button
                onClick={() => { setCityModal(true); setEditingCity(null); setCityForm({ nome: '', uf: 'MG', slug: '' }) }}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary hover:bg-primary/80 text-white text-xs font-bold rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </button>
            </div>
            {loadingCities ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-2">
                {allCities.map(city => (
                  <div key={city.id} className="bg-surface border border-border rounded-xl p-3 flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{city.nome} - {city.uf}</p>
                      <p className="text-xs text-muted">{city.slug} · {providerCounts[city.slug] || 0} prestadores</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingCity(city); setCityForm({ nome: city.nome, uf: city.uf, slug: city.slug }); setCityModal(true) }}
                        className="p-1.5 text-muted hover:text-white transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteCity(city.id)} className="p-1.5 text-muted hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── DENÚNCIAS ── */}
        {activeTab === 'denuncias' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Denúncias</h2>
              <button onClick={loadReports} className="text-xs text-muted hover:text-white flex items-center gap-1 transition-colors">
                <RefreshCw className="w-3 h-3" /> Atualizar
              </button>
            </div>
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {(['all', 'pending', 'reviewed', 'resolved'] as const).map(f => (
                <button key={f} onClick={() => setReportFilter(f)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                    reportFilter === f ? 'bg-primary text-white' : 'bg-surface border border-border text-muted hover:text-white'
                  }`}>
                  {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendentes' : f === 'reviewed' ? 'Em análise' : 'Resolvidas'}
                  {f !== 'all' && <span className="ml-1 opacity-70">({reports.filter(r => r.status === f).length})</span>}
                </button>
              ))}
            </div>
            {loadingReports ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-16">
                <Flag className="w-12 h-12 mx-auto mb-3 opacity-30 text-muted" />
                <p className="font-semibold text-white">Nenhuma denúncia</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReports.map(r => (
                  <div key={r.id} className="bg-surface border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            r.status === 'pending' ? 'bg-yellow-500/15 text-yellow-300' :
                            r.status === 'reviewed' ? 'bg-blue-500/15 text-blue-300' :
                            'bg-green-500/15 text-green-300'
                          }`}>
                            {r.status === 'pending' ? 'Pendente' : r.status === 'reviewed' ? 'Em análise' : 'Resolvida'}
                          </span>
                          <span className="text-xs text-muted">{r.createdAt?.toDate?.()?.toLocaleDateString('pt-BR') || '—'}</span>
                        </div>
                        <p className="text-sm font-semibold text-white mt-1">Motivo: {r.reason}</p>
                        {r.description && <p className="text-xs text-muted mt-1 line-clamp-2">{r.description}</p>}
                        <div className="text-xs text-muted mt-2 space-y-0.5">
                          <p>Denunciado por: <span className="text-white">{r.reportedByName}</span></p>
                          <p>Denunciado: <span className="text-white">{r.reportedUserName}</span></p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      {r.status !== 'reviewed' && (
                        <button onClick={() => updateReport(r.id, 'reviewed')}
                          className="flex-1 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 text-blue-400 text-xs font-semibold rounded-lg transition-colors">
                          Marcar em análise
                        </button>
                      )}
                      {r.status !== 'resolved' && (
                        <button onClick={() => updateReport(r.id, 'resolved')}
                          className="flex-1 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/25 text-green-400 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Resolver
                        </button>
                      )}
                      <Link to={`/chat/${r.chatId}`} target="_blank"
                        className="px-3 py-1.5 bg-border hover:bg-surface-dynamic border border-border text-muted hover:text-white text-xs rounded-lg transition-colors flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> Ver chat
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MONETIZAÇÃO ── */}
        {activeTab === 'monetizacao' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Monetização</h2>
              <button onClick={loadUsers} className="text-xs text-muted hover:text-white flex items-center gap-1 transition-colors">
                <RefreshCw className="w-3 h-3" /> Atualizar
              </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-surface border border-border rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-green-400">{monetAtivos}</p>
                <p className="text-xs text-muted mt-0.5">Ativos</p>
              </div>
              <div className="bg-surface border border-border rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-red-400">{monetExpirados}</p>
                <p className="text-xs text-muted mt-0.5">Expirados</p>
              </div>
              <div className="bg-surface border border-border rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-purple-400">{monetAssinatura}</p>
                <p className="text-xs text-muted mt-0.5">Assinantes</p>
              </div>
            </div>

            {/* Busca */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                className="w-full bg-surface border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-primary"
                placeholder="Buscar prestador..."
                value={monetSearch}
                onChange={e => setMonetSearch(e.target.value)}
              />
            </div>

            {loadingData ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : monetProviders.length === 0 ? (
              <div className="text-center py-16">
                <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30 text-muted" />
                <p className="font-semibold text-white">Nenhum prestador encontrado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {monetProviders.map(u => {
                  const p = u.providerProfile || {}
                  const ativo = isScoreAtivo(p)
                  const dias = diasRestantes(p)
                  const isAssinante = p.subscriptionStatus === 'active'
                  const expiryMs = p.scoreExpiresAt?.toMillis?.() ?? (p.scoreExpiresAt?.seconds ?? 0) * 1000
                  const expiryDate = expiryMs ? new Date(expiryMs).toLocaleDateString('pt-BR') : null
                  const avatarSrc = p.avatar || u.avatar

                  return (
                    <motion.div
                      key={u.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`bg-surface border rounded-xl p-4 flex items-center gap-4 ${
                        ativo ? 'border-green-500/20' : 'border-red-500/20 opacity-70'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-background border border-border overflow-hidden shrink-0 flex items-center justify-center">
                        {avatarSrc
                          ? <img src={avatarSrc} alt={u.name} className="w-full h-full object-cover" />
                          : <span className="text-sm font-black text-muted">{u.name?.charAt(0)?.toUpperCase()}</span>}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {p.professionalName || u.name}
                        </p>
                        <p className="text-xs text-muted truncate">{u.email}</p>
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-1">
                        {isAssinante ? (
                          <span className="px-2 py-0.5 bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-bold rounded-full flex items-center gap-1">
                            <CreditCard className="w-3 h-3" /> Assinante
                          </span>
                        ) : ativo ? (
                          <span className="px-2 py-0.5 bg-green-500/15 border border-green-500/30 text-green-300 text-[10px] font-bold rounded-full flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {dias !== null ? `${dias}d restantes` : 'Ativo'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-red-500/15 border border-red-500/30 text-red-300 text-[10px] font-bold rounded-full flex items-center gap-1">
                            <Ban className="w-3 h-3" /> Expirado
                          </span>
                        )}
                        {expiryDate && !isAssinante && (
                          <span className="text-[10px] text-muted">expira {expiryDate}</span>
                        )}
                      </div>

                      <button
                        onClick={() => setDiasModal({ user: u, dias: '30', observacao: '', saving: false })}
                        className="shrink-0 p-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-lg transition-colors"
                        title="Adicionar dias manualmente"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal Rejeição ── */}
      <AnimatePresence>
        {rejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setRejectModal(null) }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="bg-surface border border-border rounded-2xl w-full max-w-md p-5"
            >
              <h3 className="text-base font-bold text-white mb-3">Rejeitar prestador</h3>
              <p className="text-sm text-muted mb-3">Informe o motivo da rejeição para <span className="text-white font-semibold">{rejectModal.name}</span>:</p>
              <textarea
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-primary resize-none"
                rows={3}
                placeholder="Motivo da rejeição..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
              <div className="flex gap-2 mt-3">
                <button onClick={() => setRejectModal(null)} className="flex-1 py-2.5 bg-border hover:bg-surface-dynamic border border-border text-white text-sm font-semibold rounded-xl transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={() => rejectProvider(rejectModal)}
                  disabled={!rejectReason.trim() || processingIds.has(rejectModal.id)}
                  className="flex-1 py-2.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  Rejeitar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal Categoria ── */}
      <AnimatePresence>
        {catModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) { setCatModal(false); setEditingCat(null) } }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="bg-surface border border-border rounded-2xl w-full max-w-md p-5"
            >
              <h3 className="text-base font-bold text-white mb-4">{editingCat ? 'Editar' : 'Nova'} categoria</h3>
              <input
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-primary mb-3"
                placeholder="Nome da categoria"
                value={catForm.name}
                onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}
              />
              <div className="mb-3">
                <p className="text-xs text-muted mb-2">Ícone selecionado: <span className="text-xl">{catForm.icon}</span></p>
                <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
                  {ICON_GROUPS.map((g, i) => (
                    <button key={i} onClick={() => setActiveIconGroup(i)}
                      className={`px-2 py-1 text-xs rounded-lg whitespace-nowrap transition-colors ${activeIconGroup === i ? 'bg-primary text-white' : 'bg-border text-muted'}`}>
                      {g.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-8 gap-1">
                  {ICON_GROUPS[activeIconGroup].icons.map(icon => (
                    <button key={icon} onClick={() => setCatForm(f => ({ ...f, icon }))}
                      className={`p-1.5 rounded-lg text-lg transition-colors ${catForm.icon === icon ? 'bg-primary/20 ring-1 ring-primary' : 'hover:bg-border'}`}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setCatModal(false); setEditingCat(null) }}
                  className="flex-1 py-2.5 bg-border hover:bg-surface-dynamic border border-border text-white text-sm font-semibold rounded-xl transition-colors">
                  Cancelar
                </button>
                <button onClick={saveCategory}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary/80 text-white text-sm font-bold rounded-xl transition-colors">
                  Salvar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal Prestador ── */}
      <AnimatePresence>
        {providerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) { setProviderModal(false); setEditingProvider(null) } }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="bg-surface border border-border rounded-2xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-base font-bold text-white mb-4">{editingProvider ? 'Editar' : 'Novo'} Prestador</h3>

              {/* Avatar upload */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-16 h-16 rounded-full bg-background border border-border overflow-hidden flex items-center justify-center shrink-0">
                  {avatarPreview
                    ? <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                    : editingProvider?.providerProfile?.avatar
                    ? <img src={editingProvider.providerProfile.avatar} alt="avatar" className="w-full h-full object-cover" />
                    : <span className="text-xl font-black text-muted">{providerForm.name?.charAt(0)?.toUpperCase() || '?'}</span>}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white mb-1">Foto de perfil</p>
                  <button onClick={() => avatarInputRef.current?.click()}
                    className="flex items-center gap-1 px-3 py-1.5 bg-border hover:bg-surface-dynamic border border-border text-sm text-white rounded-lg transition-colors">
                    <Camera className="w-3.5 h-3.5" /> Escolher foto
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) { setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)) }
                    }} />
                </div>
              </div>

              <div className="space-y-3">
                <input className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-primary"
                  placeholder="Nome completo *" value={providerForm.name} onChange={e => setProviderForm(f => ({ ...f, name: e.target.value }))} />
                {!editingProvider && <>
                  <input className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-primary"
                    placeholder="Email *" type="email" value={providerForm.email} onChange={e => setProviderForm(f => ({ ...f, email: e.target.value }))} />
                  <input className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-primary"
                    placeholder="Senha *" type="password" value={providerForm.password} onChange={e => setProviderForm(f => ({ ...f, password: e.target.value }))} />
                </>}
                <input className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-primary"
                  placeholder="Especialidade" value={providerForm.specialty} onChange={e => setProviderForm(f => ({ ...f, specialty: e.target.value }))} />
                <input className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-primary"
                  placeholder="Cidade" value={providerForm.city} onChange={e => setProviderForm(f => ({ ...f, city: e.target.value }))} />
                <textarea className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-primary resize-none"
                  placeholder="Bio" rows={2} value={providerForm.bio} onChange={e => setProviderForm(f => ({ ...f, bio: e.target.value }))} />
                <input className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-primary"
                  placeholder="Preço a partir de (ex: 50)" value={providerForm.priceFrom} onChange={e => setProviderForm(f => ({ ...f, priceFrom: e.target.value }))} />
                <input className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-primary"
                  placeholder="Habilidades (separadas por vírgula)" value={providerForm.skills} onChange={e => setProviderForm(f => ({ ...f, skills: e.target.value }))} />
                <input className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-primary"
                  placeholder="WhatsApp (ex: 5538999999999)" value={providerForm.whatsapp} onChange={e => setProviderForm(f => ({ ...f, whatsapp: e.target.value }))} />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={providerForm.verified} onChange={e => setProviderForm(f => ({ ...f, verified: e.target.checked }))}
                    className="w-4 h-4 rounded accent-primary" />
                  <span className="text-sm text-white">Verificado</span>
                </label>
              </div>

              <div className="flex gap-2 mt-4">
                <button onClick={() => { setProviderModal(false); setEditingProvider(null) }}
                  className="flex-1 py-2.5 bg-border hover:bg-surface-dynamic border border-border text-white text-sm font-semibold rounded-xl transition-colors">
                  Cancelar
                </button>
                <button onClick={saveProviderModal} disabled={savingProvider}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary/80 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
                  {savingProvider ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal Cidade ── */}
      <AnimatePresence>
        {cityModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) { setCityModal(false); setEditingCity(null) } }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="bg-surface border border-border rounded-2xl w-full max-w-md p-5"
            >
              <h3 className="text-base font-bold text-white mb-4">{editingCity ? 'Editar' : 'Adicionar'} cidade</h3>
              <div className="space-y-3">
                <input
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-primary"
                  placeholder="Nome da cidade *"
                  value={cityForm.nome}
                  onChange={e => setCityForm(f => ({ ...f, nome: e.target.value }))}
                />
                <select
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                  value={cityForm.uf}
                  onChange={e => setCityForm(f => ({ ...f, uf: e.target.value }))}
                >
                  {UF_OPTIONS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
                {!editingCity && (
                  <input
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-primary"
                    placeholder="Slug (opcional, gerado automaticamente)"
                    value={cityForm.slug}
                    onChange={e => setCityForm(f => ({ ...f, slug: e.target.value }))}
                  />
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => { setCityModal(false); setEditingCity(null) }}
                  className="flex-1 py-2.5 bg-border hover:bg-surface-dynamic border border-border text-white text-sm font-semibold rounded-xl transition-colors">
                  Cancelar
                </button>
                <button onClick={saveCity} disabled={savingCity || !cityForm.nome.trim()}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary/80 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
                  {savingCity ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal Dias ── */}
      {diasModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => !diasModal.saving && setDiasModal(null)}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-surface border border-border rounded-2xl w-full max-w-sm p-5"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-white mb-4">Adicionar Dias de Crédito</h3>

            {/* Info do prestador */}
            <div className="flex items-center gap-3 mb-4 p-3 bg-background rounded-xl border border-border">
              <div className="w-10 h-10 rounded-full bg-surface border border-border overflow-hidden shrink-0 flex items-center justify-center">
                {diasModal.user.providerProfile?.avatar || diasModal.user.avatar
                  ? <img src={diasModal.user.providerProfile?.avatar || diasModal.user.avatar} alt="" className="w-full h-full object-cover" />
                  : <span className="text-sm font-black text-muted">{diasModal.user.name?.charAt(0)?.toUpperCase()}</span>}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">
                  {diasModal.user.providerProfile?.professionalName || diasModal.user.name}
                </p>
                <p className="text-xs text-muted truncate">{diasModal.user.email}</p>
                {(() => {
                  const dias = diasRestantes(diasModal.user.providerProfile)
                  if (diasModal.user.providerProfile?.subscriptionStatus === 'active') {
                    return <p className="text-xs text-purple-400 font-semibold mt-0.5">Assinante ativo</p>
                  }
                  if (dias !== null && dias > 0) {
                    return <p className="text-xs text-green-400 font-semibold mt-0.5">{dias} dias restantes — os novos dias serão somados</p>
                  }
                  return <p className="text-xs text-red-400 font-semibold mt-0.5">Sem créditos ativos</p>
                })()}
              </div>
            </div>

            {/* Atalhos */}
            <div className="flex gap-2 mb-3">
              {[7, 15, 30, 60, 90].map(d => (
                <button
                  key={d}
                  onClick={() => setDiasModal(m => m ? { ...m, dias: String(d) } : null)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                    diasModal.dias === String(d)
                      ? 'bg-primary border-primary text-white'
                      : 'bg-border border-border text-muted hover:text-white'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>

            <label className="block text-xs text-muted mb-1.5 font-semibold">
              Quantidade de dias *
            </label>
            <input
              type="number"
              min={1}
              max={365}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary mb-3"
              value={diasModal.dias}
              onChange={e => setDiasModal(m => m ? { ...m, dias: e.target.value } : null)}
            />

            <label className="block text-xs text-muted mb-1.5 font-semibold">Observação (opcional)</label>
            <textarea
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-primary resize-none mb-4"
              rows={2}
              placeholder="Ex: cortesia, campanha, etc."
              value={diasModal.observacao}
              onChange={e => setDiasModal(m => m ? { ...m, observacao: e.target.value } : null)}
            />

            <div className="flex gap-2">
              <button onClick={() => setDiasModal(null)}
                disabled={diasModal.saving}
                className="flex-1 py-2.5 bg-border hover:bg-surface-dynamic border border-border text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
                Cancelar
              </button>
              <button
                onClick={saveDiasManual}
                disabled={diasModal.saving || !diasModal.dias || parseInt(diasModal.dias) < 1}
                className="flex-1 py-2.5 bg-primary hover:bg-primary/80 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {diasModal.saving
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><TrendingUp className="w-4 h-4" /> Adicionar</>
                }
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

    </div>
  )
}
