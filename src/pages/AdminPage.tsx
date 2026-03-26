import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Users, Briefcase, Tag, Plus, Trash2, Edit2,
  Search, Check, X, ToggleLeft, ToggleRight, Save, RefreshCw,
  AlertTriangle, LogOut, UserPlus, MapPin, DollarSign, Star, Clock, Loader2, Sparkles,
  ChevronUp, ChevronDown, Archive, CheckSquare, Bug, Wrench, ArrowRight, Camera,
  Flag, Eye, CheckCircle2, CreditCard, CalendarDays, TrendingUp, BadgeCheck, Ban
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

// ── NOVO: modal de edição manual de dias ──
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

// ── helpers de score ──
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

  // ── NOVO: Monetização ──
  const [diasModal, setDiasModal] = useState<DiasModalState | null>(null)
  const [monetSearch, setMonetSearch] = useState('')

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
      showToast('Erro ao carregar denúncias: ' + (err?.message || ''), 'error')
    } finally {
      setLoadingReports(false)
    }
  }

  const updateReportStatus = async (reportId: string, status: 'reviewed' | 'resolved') => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { status, updatedAt: serverTimestamp() })
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r))
      showToast(status === 'reviewed' ? '👁 Marcada como revisada' : '✅ Denúncia resolvida')
    } catch (err: any) {
      showToast('Erro ao atualizar: ' + (err?.message || ''), 'error')
    }
  }

  const deleteReport = async (reportId: string) => {
    if (!confirm('Excluir esta denúncia permanentemente?')) return
    try {
      await deleteDoc(doc(db, 'reports', reportId))
      setReports(prev => prev.filter(r => r.id !== reportId))
      showToast('Denúncia excluída')
    } catch (err: any) {
      showToast('Erro ao excluir: ' + (err?.message || ''), 'error')
    }
  }

  const toggleMockCategory = async (categoryId: string, currentState: boolean) => {
    try {
      const newSettings = { ...mockSettings, [categoryId]: !currentState }
      await setDoc(doc(db, 'settings', 'mockups'), { categories: newSettings, updatedAt: serverTimestamp() })
      setMockSettings(newSettings)
      showToast(`Mockups de ${categoryId} ${!currentState ? 'ativados' : 'desativados'}!`)
    } catch (err: any) {
      showToast('Erro ao atualizar: ' + (err?.message || ''), 'error')
    }
  }

  useEffect(() => {
    if (!authLoading && isAdmin) {
      loadUsers()
      loadCategories()
      loadMockSettings()
      loadProviderCounts()
      loadReports()
    }
  }, [authLoading, isAdmin])

  // ── NOVO: salvar dias manualmente ──
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

      await updateDoc(doc(db, 'users', u.id), {
        'providerProfile.scoreExpiresAt': newExpiry,
        'providerProfile.diasScore': dias,
        'providerProfile.active': true,
      })

      // grava no histórico de créditos
      await addDoc(collection(db, 'historico_creditos'), {
        providerId: u.id,
        tipo: 'manual',
        dias,
        valor: 0,
        observacao: diasModal.observacao.trim() || 'Adicionado manualmente pelo admin',
        stripePaymentId: null,
        createdAt: serverTimestamp(),
      })

      // atualiza estado local
      setUsers(prev => prev.map(usr =>
        usr.id === u.id
          ? { ...usr, providerProfile: { ...usr.providerProfile, scoreExpiresAt: newExpiry, diasScore: dias, active: true } }
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
  const toggleCityStatus = async (city: City) => {
    try {
      const newStatus = city.status === 'ativa' ? 'inativa' : 'ativa'
      await updateDoc(doc(db, 'cities', city.id), { status: newStatus })
      await reloadCities()
      showToast(`Cidade ${newStatus === 'ativa' ? 'ativada' : 'desativada'}!`)
    } catch (err: any) { showToast('Erro ao atualizar: ' + (err?.message || ''), 'error') }
  }

  const archiveCity = async (city: City) => {
    if (!confirm(`Arquivar "${city.nome}"?`)) return
    try {
      await updateDoc(doc(db, 'cities', city.id), { status: 'arquivada' })
      await reloadCities()
      showToast('Cidade arquivada!')
    } catch (err: any) { showToast('Erro ao arquivar: ' + (err?.message || ''), 'error') }
  }

  const moveCityOrder = async (city: City, direction: 'up' | 'down') => {
    const index = allCities.findIndex(c => c.id === city.id)
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === allCities.length - 1)) return
    try {
      const other = allCities[direction === 'up' ? index - 1 : index + 1]
      await updateDoc(doc(db, 'cities', city.id), { ordem: other.ordem })
      await updateDoc(doc(db, 'cities', other.id), { ordem: city.ordem })
      await reloadCities()
      showToast('Ordem atualizada!')
    } catch (err: any) { showToast('Erro ao reordenar: ' + (err?.message || ''), 'error') }
  }

  const saveCity = async () => {
    if (!cityForm.nome.trim() || !cityForm.uf) return
    setSavingCity(true)
    try {
      const slug = cityForm.slug || cityForm.nome.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      if (editingCity) {
        await updateDoc(doc(db, 'cities', editingCity.id), { nome: cityForm.nome, uf: cityForm.uf, slug })
        showToast('Cidade atualizada!')
      } else {
        await setDoc(doc(db, 'cities', slug), {
          nome: cityForm.nome, uf: cityForm.uf, slug,
          status: 'ativa', ordem: allCities.length + 1, created_at: serverTimestamp()
        })
        showToast('Cidade criada!')
      }
      await reloadCities()
      setCityModal(false)
      setCityForm({ nome: '', uf: 'MG', slug: '' })
      setEditingCity(null)
    } catch (err: any) { showToast('Erro ao salvar: ' + (err?.message || ''), 'error') }
    finally { setSavingCity(false) }
  }

  // ---------- Prestadores pendentes ----------
  const approveProvider = async (u: UserData) => {
    setProcessingIds(prev => new Set(prev).add(u.id))
    try {
      const currentRoles: string[] = Array.isArray(u.roles) ? u.roles : ['client']
      const newRoles = currentRoles.includes('provider') ? currentRoles : [...currentRoles, 'provider']
      await setDoc(doc(db, 'users', u.id), {
        roles: newRoles,
        providerProfile: { ...(u.providerProfile || {}), status: 'approved', verified: true, approvedAt: new Date().toISOString() },
      }, { merge: true })
      setUsers(prev => prev.map(p => p.id === u.id ? {
        ...p, roles: newRoles,
        providerProfile: { ...p.providerProfile, status: 'approved', verified: true },
      } : p))
      showToast(`✅ ${u.name} aprovado como prestador!`)
    } catch (err: any) {
      showToast('❌ Erro ao aprovar: ' + (err?.message || err?.code || ''), 'error')
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(u.id); return s })
    }
  }

  const rejectProvider = async () => {
    if (!rejectModal) return
    const u = rejectModal
    setProcessingIds(prev => new Set(prev).add(u.id))
    try {
      await setDoc(doc(db, 'users', u.id), {
        providerProfile: { ...(u.providerProfile || {}), status: 'rejected', rejectedAt: new Date().toISOString(), rejectionReason: rejectReason },
      }, { merge: true })
      setUsers(prev => prev.map(p => p.id === u.id ? { ...p, providerProfile: { ...p.providerProfile, status: 'rejected' } } : p))
      showToast(`Solicitação de ${u.name} rejeitada`)
      setRejectModal(null)
      setRejectReason('')
    } catch (err: any) {
      showToast('❌ Erro ao rejeitar: ' + (err?.message || err?.code || ''), 'error')
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(u.id); return s })
    }
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

  const toggleFeatured = async (userId: string, isFeatured: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { 'providerProfile.featured': !isFeatured })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, providerProfile: { ...u.providerProfile, featured: !isFeatured } } : u))
      showToast(`${!isFeatured ? '⭐ Adicionado aos' : '❌ Removido dos'} destaques!`)
    } catch (err: any) { showToast('❌ Erro ao atualizar destaque: ' + (err?.message || ''), 'error') }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return
    try {
      await deleteDoc(doc(db, 'users', userId))
      setUsers(prev => prev.filter(u => u.id !== userId))
      showToast('Usuário excluído!')
    } catch { showToast('Erro ao excluir usuário', 'error') }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverImageFile(file)
    setCoverImagePreview(URL.createObjectURL(file))
  }

  const saveProvider = async () => {
    if (!providerForm.name.trim() || (!editingProvider && !providerForm.email.trim())) return
    setSavingProvider(true)
    try {
      let avatarUrl: string | undefined = undefined
      if (avatarFile && editingProvider) {
        const fileRef = storageRef(storage, `avatars/${editingProvider.id}/avatar`)
        await uploadBytes(fileRef, avatarFile)
        avatarUrl = await getDownloadURL(fileRef)
      }
      let coverImageUrl: string | undefined = undefined
      if (coverImageFile && editingProvider) {
        const coverRef = storageRef(storage, `covers/${editingProvider.id}/cover`)
        await uploadBytes(coverRef, coverImageFile)
        coverImageUrl = await getDownloadURL(coverRef)
      }
      if (editingProvider) {
        const providerProfile = {
          ...editingProvider.providerProfile,
          professionalName: providerForm.professionalName,
          specialty: providerForm.specialty,
          city: providerForm.city,
          bio: providerForm.bio,
          priceFrom: providerForm.priceFrom,
          skills: providerForm.skills.split(',').map(s => s.trim()).filter(Boolean),
          whatsapp: providerForm.whatsapp,
          categories: providerForm.category ? [providerForm.category] : [],
          verified: providerForm.verified,
          ...(avatarUrl ? { avatar: avatarUrl } : {}),
          ...(coverImageUrl ? { coverImage: coverImageUrl } : {}),
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
            professionalName: providerForm.professionalName,
            bio: providerForm.bio, priceFrom: providerForm.priceFrom,
            skills: providerForm.skills.split(',').map(s => s.trim()).filter(Boolean),
            whatsapp: providerForm.whatsapp,
            categories: providerForm.category ? [providerForm.category] : [],
            verified: providerForm.verified, status: 'approved',
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
      setAvatarFile(null)
      setAvatarPreview('')
      setCoverImageFile(null)
      setCoverImagePreview('')
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
      category: (u.providerProfile?.categories?.[0] || u.providerProfile?.category || ''),
      professionalName: u.providerProfile?.professionalName || u.name || '',
      verified: u.providerProfile?.verified || false,
    })
    setAvatarFile(null)
    setAvatarPreview(u.providerProfile?.avatar || u.avatar || '')
    setCoverImageFile(null)
    setCoverImagePreview(u.providerProfile?.coverImage || '')
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
  const featuredProviders = providers.filter(u => u.providerProfile?.featured === true)
  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )
  const filteredProviders = providers.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  // ── monetização: stats e lista filtrada ──
  const monetProviders = providers.filter(u =>
    (u.providerProfile?.professionalName || u.name || u.email)
      ?.toLowerCase().includes(monetSearch.toLowerCase())
  )
  const monetAtivos = providers.filter(u => isScoreAtivo(u.providerProfile)).length
  const monetExpirados = providers.filter(u => !isScoreAtivo(u.providerProfile)).length
  const monetAssinatura = providers.filter(u => u.providerProfile?.subscriptionStatus === 'active').length

  const inputCls = 'w-full bg-background border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary transition-colors placeholder:text-muted'
  const totalMocks = Object.keys(mocksByCategory).reduce((sum, cat) => sum + mocksByCategory[cat].length, 0)
  const activeMocks = Object.keys(mockSettings).filter(cat => mockSettings[cat] === true).reduce((sum, cat) => sum + (mocksByCategory[cat]?.length || 0), 0)
  const activeCities = allCities.filter(c => c.status === 'ativa').length
  const pendingReports = reports.filter(r => r.status === 'pending').length

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl font-semibold text-sm shadow-lg max-w-sm ${
              toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}>{toast.msg}</motion.div>
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
            <LogOut className="w-4 h-4" /> Sair do painel
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">

        {/* Atalhos rápidos */}
<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
  {[
    { to: '/admin/aprovacoes', bg: 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20', icon: <CheckSquare className="w-5 h-5 text-yellow-400 shrink-0" />, title: 'Aprovações', sub: 'Revisar solicitações', arrow: 'text-yellow-500/50 group-hover:text-yellow-400' },
    { to: '/debug', bg: 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20', icon: <Bug className="w-5 h-5 text-blue-400 shrink-0" />, title: 'Debug', sub: 'Inspecionar prestadores', arrow: 'text-blue-500/50 group-hover:text-blue-400' },
    { to: '/fix', bg: 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20', icon: <Wrench className="w-5 h-5 text-orange-400 shrink-0" />, title: 'Fix', sub: 'Corrigir dados', arrow: 'text-orange-500/50 group-hover:text-orange-400' },
    { to: '/admin/relatorios', bg: 'bg-primary/10 border-primary/30 hover:bg-primary/20', icon: <BarChart2 className="w-5 h-5 text-primary shrink-0" />, title: 'Relatórios', sub: 'Métricas e receita', arrow: 'text-primary/50 group-hover:text-primary' },
  ].map(({ to, bg, icon, title, sub, arrow }) => (
    <Link key={to} to={to} className={`flex items-center justify-between gap-3 border rounded-xl px-4 py-3 transition-colors group ${bg}`}>
      <div className="flex items-center gap-3">{icon}<div><p className="text-sm font-bold text-white">{title}</p><p className="text-[11px] text-muted/70">{sub}</p></div></div>
      <ArrowRight className={`w-4 h-4 transition-colors ${arrow}`} />
    </Link>
  ))}
</div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Usuários', value: users.length, icon: Users, color: 'text-blue-400' },
            { label: 'Clientes', value: clients.length, icon: Users, color: 'text-green-400' },
            { label: 'Prestadores', value: providers.length, icon: Briefcase, color: 'text-primary' },
            { label: 'Aguardando', value: pendingProviders.length, icon: Clock, color: pendingProviders.length > 0 ? 'text-yellow-400' : 'text-muted' },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-surface border border-border rounded-xl p-4">
              <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
              <p className="text-2xl font-black text-white">{stat.value}</p>
              <p className="text-xs text-muted">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-6 bg-surface border border-border rounded-xl p-1 flex-wrap">
          {[
            { id: 'pendentes', label: 'Pendentes', icon: Clock, badge: pendingProviders.length },
            { id: 'usuarios', label: 'Usuários', icon: Users },
            { id: 'prestadores', label: 'Prestadores', icon: Briefcase },
            { id: 'categorias', label: 'Categorias', icon: Tag },
            { id: 'mockups', label: 'Mockups', icon: Sparkles },
            { id: 'cidades', label: 'Cidades', icon: MapPin },
            { id: 'denuncias', label: 'Denúncias', icon: Flag, badge: pendingReports },
            { id: 'monetizacao', label: 'Monetização', icon: CreditCard },
          ].map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id as Tab); setSearch('') }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-sm font-semibold transition-colors relative ${
                activeTab === tab.id ? 'bg-primary text-background' : 'text-muted hover:text-white'
              }`}>
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge && tab.badge > 0 ? (
                <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center ${
                  activeTab === tab.id ? 'bg-background text-primary' : 'bg-red-500 text-white'
                }`}>{tab.badge}</span>
              ) : null}
            </button>
          ))}
        </div>

        {activeTab !== 'categorias' && activeTab !== 'pendentes' && activeTab !== 'mockups' && activeTab !== 'cidades' && activeTab !== 'denuncias' && activeTab !== 'monetizacao' && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou email..."
              className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-muted outline-none focus:border-primary transition-colors" />
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-muted">
            {activeTab === 'pendentes' && `${pendingProviders.length} aguardando aprovação`}
            {activeTab === 'usuarios' && `${filteredUsers.length} usuários`}
            {activeTab === 'prestadores' && (
              <span>{filteredProviders.length} prestadores{featuredProviders.length > 0 && <span className="ml-2 text-yellow-400">• {featuredProviders.length} em destaque</span>}</span>
            )}
            {activeTab === 'categorias' && `${categories.length} categorias`}
            {activeTab === 'mockups' && `${activeMocks}/${totalMocks} perfis mockup ativos`}
            {activeTab === 'cidades' && `${activeCities}/${allCities.length} cidades ativas`}
            {activeTab === 'denuncias' && `${reports.length} denúncias • ${pendingReports} pendentes`}
            {activeTab === 'monetizacao' && `${monetAtivos} ativos • ${monetExpirados} expirados • ${monetAssinatura} assinantes`}
          </p>
          <div className="flex gap-2">
            <button onClick={() => { loadUsers(); loadCategories(); loadMockSettings(); reloadCities(); loadProviderCounts(); loadReports() }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border text-muted hover:text-white text-xs rounded-lg transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Atualizar
            </button>
            {activeTab === 'prestadores' && (
              <button onClick={() => { setEditingProvider(null); setProviderForm(EMPTY_PROVIDER_FORM); setAvatarFile(null); setAvatarPreview(''); setProviderModal(true) }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-background text-xs font-bold rounded-lg">
                <UserPlus className="w-3.5 h-3.5" /> Novo Prestador
              </button>
            )}
            {activeTab === 'categorias' && (
              <button onClick={() => { setEditingCat(null); setCatForm({ name: '', icon: '🔧' }); setActiveIconGroup(0); setCatModal(true) }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-background text-xs font-bold rounded-lg">
                <Plus className="w-3.5 h-3.5" /> Nova Categoria
              </button>
            )}
            {activeTab === 'cidades' && (
              <button onClick={() => { setEditingCity(null); setCityForm({ nome: '', uf: 'MG', slug: '' }); setCityModal(true) }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-background text-xs font-bold rounded-lg">
                <Plus className="w-3.5 h-3.5" /> Nova Cidade
              </button>
            )}
          </div>
        </div>

        {loadingData && activeTab !== 'mockups' && activeTab !== 'cidades' && activeTab !== 'denuncias' && activeTab !== 'monetizacao' && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* ABA: PENDENTES */}
        {activeTab === 'pendentes' && !loadingData && (
          <div className="space-y-3">
            {pendingProviders.length === 0 ? (
              <div className="text-center py-16">
                <Check className="w-12 h-12 mx-auto mb-3 opacity-30 text-green-400" />
                <p className="font-semibold text-white">Nenhuma solicitação pendente</p>
                <p className="text-xs text-muted mt-1">Tudo em dia! 🎉</p>
              </div>
            ) : pendingProviders.map(u => (
              <motion.div key={u.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-surface border border-yellow-500/30 rounded-xl p-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-background border border-border overflow-hidden shrink-0 flex items-center justify-center">
                    {u.avatar
                      ? <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                      : <span className="text-lg font-black text-muted">{u.name?.charAt(0)?.toUpperCase()}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-bold text-white">{u.name}</p>
                      <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px] font-semibold rounded-full">Pendente</span>
                    </div>
                    <p className="text-xs text-muted mb-1">{u.email}</p>
                    {u.providerProfile?.specialty && <p className="text-xs text-muted">🎯 {u.providerProfile.specialty}</p>}
                    {u.providerProfile?.city && <p className="text-xs text-muted">📍 {u.providerProfile.city}</p>}
                    {u.providerProfile?.bio && <p className="text-xs text-muted mt-1 line-clamp-2">{u.providerProfile.bio}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => approveProvider(u)} disabled={processingIds.has(u.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-bold rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50">
                      {processingIds.has(u.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Aprovar
                    </button>
                    <button onClick={() => setRejectModal(u)} disabled={processingIds.has(u.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50">
                      <X className="w-3.5 h-3.5" /> Rejeitar
                    </button>
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
              <div className="text-center py-16">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30 text-muted" />
                <p className="font-semibold text-white">Nenhum usuário encontrado</p>
              </div>
            ) : filteredUsers.map(u => (
              <motion.div key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-background border border-border overflow-hidden shrink-0 flex items-center justify-center">
                    {u.avatar
                      ? <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                      : <span className="text-sm font-black text-muted">{u.name?.charAt(0)?.toUpperCase()}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{u.name}</p>
                    <p className="text-xs text-muted truncate">{u.email}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(u.roles || []).map(r => (
                        <span key={r} className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-semibold rounded-md">{r}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => toggleRole(u.id, 'provider', u.roles?.includes('provider'))}
                      className="p-1.5 rounded-lg hover:bg-background text-muted hover:text-white transition-colors" title={u.roles?.includes('provider') ? 'Remover prestador' : 'Tornar prestador'}>
                      <Briefcase className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteUser(u.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ABA: PRESTADORES */}
        {activeTab === 'prestadores' && !loadingData && (
          <div className="space-y-3">
            {filteredProviders.length === 0 ? (
              <div className="text-center py-16">
                <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30 text-muted" />
                <p className="font-semibold text-white">Nenhum prestador encontrado</p>
              </div>
            ) : filteredProviders.map(u => {
              const isFeatured = u.providerProfile?.featured === true
              const isVerified = u.providerProfile?.verified === true
              const avatarSrc = u.providerProfile?.avatar || u.avatar
              return (
                <motion.div key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className={`bg-surface border rounded-xl p-4 ${ isFeatured ? 'border-yellow-500/40' : 'border-border' }`}>
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full bg-background border-2 border-border overflow-hidden flex items-center justify-center">
                        {avatarSrc
                          ? <img src={avatarSrc} alt={u.name} className="w-full h-full object-cover" />
                          : <span className="text-lg font-black text-muted">{u.name?.charAt(0)?.toUpperCase()}</span>}
                      </div>
                      {isVerified && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-background" />
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold text-white text-sm truncate">{u.name}</p>
                        {isFeatured && <Star className="w-3.5 h-3.5 text-yellow-400 shrink-0" fill="currentColor" />}
                      </div>
                      <p className="text-xs text-muted truncate">{u.providerProfile?.specialty || u.email}</p>
                      {u.providerProfile?.city && <p className="text-[11px] text-muted/70">📍 {u.providerProfile.city}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => toggleFeatured(u.id, isFeatured)}
                        className={`p-1.5 rounded-lg transition-colors ${ isFeatured ? 'text-yellow-400 hover:bg-yellow-500/20' : 'text-muted hover:text-yellow-400 hover:bg-background' }`}
                        title={isFeatured ? 'Remover destaque' : 'Destacar'}>
                        <Star className="w-4 h-4" fill={isFeatured ? 'currentColor' : 'none'} />
                      </button>
                      <button onClick={() => openEditProvider(u)}
                        className="p-1.5 rounded-lg hover:bg-background text-muted hover:text-white transition-colors" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteUser(u.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* ABA: CATEGORIAS */}
        {activeTab === 'categorias' && !loadingData && (
          <div className="space-y-3">
            {categories.length === 0 ? (
              <div className="text-center py-16">
                <Tag className="w-12 h-12 mx-auto mb-3 opacity-30 text-muted" />
                <p className="font-semibold text-white">Nenhuma categoria cadastrada</p>
              </div>
            ) : categories.map(cat => (
              <motion.div key={cat.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-center gap-4">
                  <span className="text-2xl shrink-0">{cat.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm">{cat.name}</p>
                    <p className="text-xs text-muted">{cat.id}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => toggleCategory(cat)} className="p-1.5 rounded-lg hover:bg-background transition-colors" title={cat.active ? 'Desativar' : 'Ativar'}>
                      {cat.active ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5 text-muted" />}
                    </button>
                    <button onClick={() => { setEditingCat(cat); setCatForm({ name: cat.name, icon: cat.icon }); setActiveIconGroup(0); setCatModal(true) }}
                      className="p-1.5 rounded-lg hover:bg-background text-muted hover:text-white transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteCategory(cat.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ABA: MOCKUPS */}
        {activeTab === 'mockups' && (
          <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Gerenciar Perfis Mockup</h3>
                  <p className="text-xs text-blue-300 leading-relaxed">Ative ou desative perfis de exemplo por categoria. Quando desativados, apenas prestadores reais aparecerão na plataforma.</p>
                </div>
              </div>
            </div>
            {loadingMocks ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.keys(mocksByCategory).map(categoryId => {
                  const mocks = mocksByCategory[categoryId]
                  const isActive = mockSettings[categoryId] !== false
                  return (
                    <motion.div key={categoryId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className={`bg-surface border rounded-xl p-5 transition-all ${ isActive ? 'border-primary/50' : 'border-border opacity-60' }`}>
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-base font-bold text-white mb-1">{categoryId.charAt(0).toUpperCase() + categoryId.slice(1)}</h3>
                          <p className="text-xs text-muted">{mocks.length} perfis de exemplo</p>
                        </div>
                        <button onClick={() => toggleMockCategory(categoryId, isActive)} className="p-2 rounded-lg hover:bg-background transition-colors">
                          {isActive ? <ToggleRight className="w-6 h-6 text-primary" /> : <ToggleLeft className="w-6 h-6 text-muted" />}
                        </button>
                      </div>
                      <div className="space-y-2">
                        {mocks.slice(0, 3).map((mock) => (
                          <div key={mock.id} className={`flex items-center gap-2 p-2 rounded-lg ${ isActive ? 'bg-background' : 'bg-background/50' }`}>
                            <img src={mock.avatar} alt={mock.name} className="w-8 h-8 rounded-full" />
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-semibold truncate ${ isActive ? 'text-white' : 'text-muted' }`}>{mock.name}</p>
                              <p className="text-[10px] text-muted truncate">{mock.specialty}</p>
                            </div>
                            {mock.isFeatured && <Star className="w-3 h-3 text-yellow-400 shrink-0" fill="currentColor" />}
                          </div>
                        ))}
                        {mocks.length > 3 && <p className="text-[10px] text-muted text-center pt-1">+{mocks.length - 3} perfis</p>}
                      </div>
                      <div className={`mt-4 pt-3 border-t flex items-center justify-between ${ isActive ? 'border-border' : 'border-border/50' }`}>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${ isActive ? 'text-primary' : 'text-muted' }`}>{isActive ? '✅ Ativo' : '❌ Desativado'}</span>
                        <div className="flex items-center gap-1"><span className="text-xs text-muted">{mocks.filter(m => m.isFeatured).length}</span><Star className="w-3 h-3 text-yellow-400" fill="currentColor" /></div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ABA: CIDADES */}
        {activeTab === 'cidades' && (
          <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Gerenciar Cidades Atendidas</h3>
                  <p className="text-xs text-blue-300 leading-relaxed">Adicione ou desative cidades. Cidades inativas mantêm prestadores existentes visíveis na busca, mas não aparecem mais nos dropdowns de seleção.</p>
                </div>
              </div>
            </div>
            {loadingCities ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : allCities.length === 0 ? (
              <div className="text-center py-16">
                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30 text-muted" />
                <p className="font-semibold text-white">Nenhuma cidade cadastrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {allCities.map((city, index) => {
                  const count = providerCounts[city.slug] || 0
                  const statusBg = city.status === 'ativa' ? 'bg-green-500/10 border-green-500/30' : city.status === 'inativa' ? 'bg-red-500/10 border-red-500/30' : 'bg-background border-border'
                  return (
                    <motion.div key={city.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className={`bg-surface border rounded-xl p-4 ${statusBg}`}>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-bold text-white">{city.nome}</p>
                            <span className="px-2 py-0.5 bg-background/50 border border-border text-muted text-[10px] font-semibold rounded-full">{city.uf}</span>
                            <span className={`px-2 py-0.5 border text-[10px] font-semibold rounded-full ${
                              city.status === 'ativa' ? 'bg-green-500/10 border-green-500/30 text-green-400'
                              : city.status === 'inativa' ? 'bg-red-500/10 border-red-500/30 text-red-400'
                              : 'bg-background border-border text-muted'
                            }`}>
                              {city.status === 'ativa' ? '🟢 Ativa' : city.status === 'inativa' ? '🔴 Inativa' : '🗂️ Arquivada'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted">
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{count} {count === 1 ? 'prestador' : 'prestadores'}</span>
                            <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{city.slug}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => moveCityOrder(city, 'up')} disabled={index === 0} className="p-1.5 rounded-lg hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed text-muted hover:text-white transition-colors"><ChevronUp className="w-4 h-4" /></button>
                          <button onClick={() => moveCityOrder(city, 'down')} disabled={index === allCities.length - 1} className="p-1.5 rounded-lg hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed text-muted hover:text-white transition-colors"><ChevronDown className="w-4 h-4" /></button>
                          <button onClick={() => toggleCityStatus(city)} disabled={city.status === 'arquivada'} className="p-1.5 rounded-lg hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                            {city.status === 'ativa' ? <ToggleRight className="w-5 h-5 text-green-400" /> : <ToggleLeft className="w-5 h-5 text-red-400" />}
                          </button>
                          <button onClick={() => { setEditingCity(city); setCityForm({ nome: city.nome, uf: city.uf, slug: city.slug }); setCityModal(true) }} className="p-1.5 rounded-lg hover:bg-background text-muted hover:text-white transition-colors"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => archiveCity(city)} disabled={city.status === 'arquivada'} className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><Archive className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ABA: DENÚNCIAS */}
        {activeTab === 'denuncias' && (
          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <Flag className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Central de Denúncias</h3>
                  <p className="text-xs text-red-300 leading-relaxed">
                    Revise as denúncias enviadas pelos usuários. Tome as ações necessárias e marque como resolvidas.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-1.5 bg-surface border border-border rounded-xl p-1">
              {([
                { key: 'pending', label: 'Pendentes', color: 'text-yellow-400' },
                { key: 'reviewed', label: 'Revisadas', color: 'text-blue-400' },
                { key: 'resolved', label: 'Resolvidas', color: 'text-green-400' },
                { key: 'all', label: 'Todas', color: 'text-muted' },
              ] as const).map(f => {
                const count = f.key === 'all' ? reports.length : reports.filter(r => r.status === f.key).length
                return (
                  <button
                    key={f.key}
                    onClick={() => setReportFilter(f.key)}
                    className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                      reportFilter === f.key ? 'bg-primary text-background' : `${f.color} hover:text-white`
                    }`}
                  >
                    {f.label}
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      reportFilter === f.key ? 'bg-background/30' : 'bg-background border border-border'
                    }`}>{count}</span>
                  </button>
                )
              })}
            </div>

            {loadingReports ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : (() => {
              const filtered = reportFilter === 'all' ? reports : reports.filter(r => r.status === reportFilter)
              if (filtered.length === 0) return (
                <div className="text-center py-16">
                  <Flag className="w-12 h-12 mx-auto mb-3 opacity-30 text-muted" />
                  <p className="font-semibold text-white">
                    {reportFilter === 'pending' ? 'Nenhuma denúncia pendente' :
                     reportFilter === 'reviewed' ? 'Nenhuma denúncia revisada' :
                     reportFilter === 'resolved' ? 'Nenhuma denúncia resolvida' : 'Nenhuma denúncia'}
                  </p>
                  {reportFilter === 'pending' && <p className="text-xs text-muted mt-1">Tudo limpo por aqui! 🎉</p>}
                </div>
              )
              return (
                <div className="space-y-3">
                  {filtered.map(report => (
                    <motion.div key={report.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className={`bg-surface border rounded-xl p-4 ${
                        report.status === 'pending' ? 'border-yellow-500/30' :
                        report.status === 'reviewed' ? 'border-blue-500/30' :
                        'border-green-500/30 opacity-70'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          report.status === 'pending' ? 'bg-yellow-500/15' :
                          report.status === 'reviewed' ? 'bg-blue-500/15' : 'bg-green-500/15'
                        }`}>
                          <Flag className={`w-4 h-4 ${
                            report.status === 'pending' ? 'text-yellow-400' :
                            report.status === 'reviewed' ? 'text-blue-400' : 'text-green-400'
                          }`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                              report.status === 'pending' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                              report.status === 'reviewed' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                              'bg-green-500/10 border-green-500/30 text-green-400'
                            }`}>
                              {report.status === 'pending' ? '⏳ Pendente' :
                               report.status === 'reviewed' ? '👁 Revisada' : '✅ Resolvida'}
                            </span>
                            <span className="text-[10px] text-muted">
                              {report.createdAt?.toDate
                                ? report.createdAt.toDate().toLocaleDateString('pt-BR', {
                                    day: '2-digit', month: '2-digit', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                  })
                                : '—'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                            <div className="bg-background rounded-lg px-3 py-2">
                              <p className="text-muted mb-0.5">Denunciante</p>
                              <p className="text-white font-semibold truncate">{report.reportedByName}</p>
                            </div>
                            <div className="bg-background rounded-lg px-3 py-2">
                              <p className="text-muted mb-0.5">Denunciado</p>
                              <p className="text-red-300 font-semibold truncate">{report.reportedUserName}</p>
                            </div>
                          </div>

                          <div className="bg-background rounded-lg px-3 py-2 mb-3">
                            <p className="text-[11px] text-muted mb-0.5">Motivo</p>
                            <p className="text-xs text-white font-medium">{report.reason}</p>
                            {report.description && (
                              <p className="text-xs text-muted mt-1 leading-relaxed">{report.description}</p>
                            )}
                          </div>

                          <div className="flex gap-2 flex-wrap">
                            <a href={`/chat/${report.chatId}`} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border text-muted hover:text-white text-xs rounded-lg transition-colors">
                              <Eye className="w-3.5 h-3.5" /> Ver chat
                            </a>
                            {report.status === 'pending' && (
                              <button onClick={() => updateReportStatus(report.id, 'reviewed')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/15 border border-blue-500/30 text-blue-400 hover:bg-blue-500/25 text-xs font-semibold rounded-lg transition-colors">
                                <Eye className="w-3.5 h-3.5" /> Marcar revisada
                              </button>
                            )}
                            {report.status !== 'resolved' && (
                              <button onClick={() => updateReportStatus(report.id, 'resolved')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/25 text-xs font-semibold rounded-lg transition-colors">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Resolver
                              </button>
                            )}
                            <button onClick={() => deleteReport(report.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs rounded-lg transition-colors ml-auto">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )
            })()}
          </div>
        )}

        {/* ══════════════════════════════════════════
            ABA: MONETIZAÇÃO
        ══════════════════════════════════════════ */}
        {activeTab === 'monetizacao' && (
          <div className="space-y-4">

            {/* Cards de resumo */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                <BadgeCheck className="w-5 h-5 text-green-400 mx-auto mb-1" />
                <p className="text-2xl font-black text-white">{monetAtivos}</p>
                <p className="text-xs text-green-400 font-semibold">Ativos</p>
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                <Ban className="w-5 h-5 text-red-400 mx-auto mb-1" />
                <p className="text-2xl font-black text-white">{monetExpirados}</p>
                <p className="text-xs text-red-400 font-semibold">Expirados / Sem score</p>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 text-center">
                <CreditCard className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                <p className="text-2xl font-black text-white">{monetAssinatura}</p>
                <p className="text-xs text-purple-400 font-semibold">Assinantes mensais</p>
              </div>
            </div>

            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                value={monetSearch}
                onChange={e => setMonetSearch(e.target.value)}
                placeholder="Buscar prestador..."
                className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-muted outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Tabela de prestadores */}
            {loadingData ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
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
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-background border border-border overflow-hidden shrink-0 flex items-center justify-center">
                        {avatarSrc
                          ? <img src={avatarSrc} alt={u.name} className="w-full h-full object-cover" />
                          : <span className="text-sm font-black text-muted">{u.name?.charAt(0)?.toUpperCase()}</span>}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {p.professionalName || u.name}
                        </p>
                        <p className="text-xs text-muted truncate">{u.email}</p>
                      </div>

                      {/* Status badge */}
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

                      {/* Botão editar dias */}
                      <button
                        onClick={() => setDiasModal({ user: u, dias: '30', observacao: '', saving: false })}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 text-xs font-bold rounded-lg transition-colors"
                        title="Adicionar dias manualmente"
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                        + Dias
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* MODAL: REJEITAR */}
      <AnimatePresence>
        {rejectModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setRejectModal(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md">
              <h2 className="text-lg font-black text-white mb-4">Rejeitar Solicitação</h2>
              <p className="text-sm text-muted mb-4">Informe um motivo para rejeitar <span className="text-white font-semibold">{rejectModal.name}</span>:</p>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="Ex: Documentação insuficiente, perfil incompleto..."
                rows={3} className={inputCls + ' resize-none mb-4'} />
              <div className="flex gap-3">
                <button onClick={() => setRejectModal(null)} className="flex-1 py-3 bg-background border border-border text-muted font-semibold rounded-xl hover:text-white transition-colors">Cancelar</button>
                <button onClick={rejectProvider} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors">Rejeitar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: PRESTADOR */}
      <AnimatePresence>
        {providerModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setProviderModal(false); setAvatarFile(null); setAvatarPreview(''); setCoverImageFile(null); setCoverImagePreview(''); }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-surface border border-border rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 bg-primary/20 rounded-xl flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-black text-white">{editingProvider ? 'Editar Prestador' : 'Novo Prestador'}</h2>
              </div>
              <div className="space-y-4">
                {editingProvider && (
                  <div>
                    <label className="block text-xs text-muted mb-2">Foto do prestador</label>
                    <div className="flex items-center gap-4">
                      <div className="relative shrink-0">
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-surface border-2 border-border flex items-center justify-center">
                          {avatarPreview
                            ? <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                            : <span className="text-2xl font-black text-muted">{providerForm.name?.charAt(0)?.toUpperCase() || '?'}</span>}
                        </div>
                        <button type="button" onClick={() => avatarInputRef.current?.click()}
                          className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                          <Camera className="w-3.5 h-3.5 text-background" />
                        </button>
                        <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                      </div>
                      <div className="flex-1 min-w-0">
                        {avatarFile ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-green-400 font-semibold truncate">✅ {avatarFile.name}</span>
                            <button type="button" onClick={() => { setAvatarFile(null); setAvatarPreview(editingProvider?.providerProfile?.avatar || editingProvider?.avatar || '') }}
                              className="text-muted hover:text-red-400 transition-colors shrink-0"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : (
                          <p className="text-xs text-muted">{avatarPreview ? 'Foto atual do prestador' : 'Nenhuma foto cadastrada'}</p>
                        )}
                        <button type="button" onClick={() => avatarInputRef.current?.click()} className="mt-1.5 text-xs text-primary hover:underline">
                          {avatarPreview ? 'Trocar foto' : 'Adicionar foto'}
                        </button>
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-xs text-muted mb-2">Foto de capa</label>
                      <div className="relative w-full h-28 rounded-xl overflow-hidden bg-background border border-border flex items-center justify-center">
                        {coverImagePreview
                          ? <img src={coverImagePreview} alt="capa" className="w-full h-full object-cover" />
                          : <span className="text-xs text-muted">Nenhuma capa cadastrada</span>
                        }
                        <button type="button" onClick={() => coverImageInputRef.current?.click()} className="absolute bottom-2 right-2 px-2.5 py-1 bg-primary text-background text-xs font-bold rounded-lg hover:scale-105 transition-transform">
                          Trocar capa
                        </button>
                      </div>
                      {coverImageFile && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-green-400 font-semibold truncate">✅ {coverImageFile.name}</span>
                          <button type="button" onClick={() => { setCoverImageFile(null); setCoverImagePreview(editingProvider?.providerProfile?.coverImage || '') }} className="text-muted hover:text-red-400 transition-colors shrink-0"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                      <input ref={coverImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverImageChange} />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs text-muted mb-1.5">Nome *</label>
                  <input value={providerForm.name} onChange={e => setProviderForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome pessoal" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1.5">Nome profissional (prestador)</label>
                  <input value={providerForm.professionalName} onChange={e => setProviderForm(p => ({ ...p, professionalName: e.target.value }))} placeholder="Ex: Carol Fotografia, DJ Silva..." className={inputCls} />
                </div>
                {!editingProvider && (
                  <>
                    <div>
                      <label className="block text-xs text-muted mb-1.5">Email *</label>
                      <input type="email" value={providerForm.email} onChange={e => setProviderForm(p => ({ ...p, email: e.target.value }))} placeholder="email@exemplo.com" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1.5">Senha (padrão: 123456)</label>
                      <input type="password" value={providerForm.password} onChange={e => setProviderForm(p => ({ ...p, password: e.target.value }))} placeholder="Deixe em branco para usar 123456" className={inputCls} />
                    </div>
                  </>
                )}
                <div><label className="block text-xs text-muted mb-1.5">Especialidade</label><input value={providerForm.specialty} onChange={e => setProviderForm(p => ({ ...p, specialty: e.target.value }))} placeholder="Ex: Fotógrafo, Eletricista..." className={inputCls} /></div>
                <div><label className="block text-xs text-muted mb-1.5">Categoria</label><select value={providerForm.category} onChange={e => setProviderForm(p => ({ ...p, category: e.target.value }))} className={inputCls}><option value="">-- Selecione uma categoria --</option>{categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>))}</select></div>
                <div><label className="block text-xs text-muted mb-1.5">Cidade</label><input value={providerForm.city} onChange={e => setProviderForm(p => ({ ...p, city: e.target.value }))} placeholder="Ex: Diamantina" className={inputCls} /></div>
                <div><label className="block text-xs text-muted mb-1.5">Bio</label><textarea value={providerForm.bio} onChange={e => setProviderForm(p => ({ ...p, bio: e.target.value }))} placeholder="Descrição do prestador..." rows={3} className={inputCls + ' resize-none'} /></div>
                <div><label className="block text-xs text-muted mb-1.5">Preço a partir de (R$)</label><input value={providerForm.priceFrom} onChange={e => setProviderForm(p => ({ ...p, priceFrom: e.target.value }))} placeholder="Ex: 80" className={inputCls} /></div>
                <div><label className="block text-xs text-muted mb-1.5">Skills (separadas por vírgula)</label><input value={providerForm.skills} onChange={e => setProviderForm(p => ({ ...p, skills: e.target.value }))} placeholder="Ex: Fotografia, Edição, Casamento" className={inputCls} /></div>
                <div><label className="block text-xs text-muted mb-1.5">WhatsApp</label><input value={providerForm.whatsapp} onChange={e => setProviderForm(p => ({ ...p, whatsapp: e.target.value }))} placeholder="5538999999999" className={inputCls} /></div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div onClick={() => setProviderForm(p => ({ ...p, verified: !p.verified }))}
                    className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${providerForm.verified ? 'bg-primary' : 'bg-border'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${providerForm.verified ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                  <span className="text-sm text-white">Verificado</span>
                </label>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => { setProviderModal(false); setAvatarFile(null); setAvatarPreview(''); setCoverImageFile(null); setCoverImagePreview(''); }}
                  className="flex-1 py-3 bg-background border border-border text-muted font-semibold rounded-xl hover:text-white transition-colors">Cancelar</button>
                <button onClick={saveProvider} disabled={savingProvider || !providerForm.name.trim()}
                  className="flex-1 py-3 bg-primary text-background font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
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
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setCatModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 bg-primary/20 rounded-xl flex items-center justify-center">
                  <Tag className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-black text-white">{editingCat ? 'Editar Categoria' : 'Nova Categoria'}</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-muted mb-1.5">Nome *</label>
                  <input value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Fotografia" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-2">Ícone — <span className="text-2xl">{catForm.icon}</span></label>
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {ICON_GROUPS.map((g, i) => (
                      <button key={i} type="button" onClick={() => setActiveIconGroup(i)}
                        className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${ activeIconGroup === i ? 'bg-primary text-background' : 'bg-background text-muted hover:text-white' }`}>
                        {g.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-8 gap-1.5">
                    {ICON_GROUPS[activeIconGroup].icons.map(icon => (
                      <button key={icon} type="button" onClick={() => setCatForm(p => ({ ...p, icon }))}
                        className={`text-xl p-2 rounded-xl transition-colors ${ catForm.icon === icon ? 'bg-primary/20 ring-2 ring-primary' : 'hover:bg-background' }`}>
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => { setCatModal(false); setEditingCat(null) }}
                  className="flex-1 py-3 bg-background border border-border text-muted font-semibold rounded-xl hover:text-white transition-colors">Cancelar</button>
                <button onClick={saveCategory} disabled={!catForm.name.trim()}
                  className="flex-1 py-3 bg-primary text-background font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />
                  {editingCat ? 'Salvar alterações' : 'Criar categoria'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: CIDADE */}
      <AnimatePresence>
        {cityModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setCityModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 bg-primary/20 rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-black text-white">{editingCity ? 'Editar Cidade' : 'Nova Cidade'}</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-muted mb-1.5">Nome da cidade *</label>
                  <input value={cityForm.nome} onChange={e => setCityForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Diamantina, Felício dos Santos..." className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1.5">UF *</label>
                  <select value={cityForm.uf} onChange={e => setCityForm(p => ({ ...p, uf: e.target.value }))} className={inputCls}>
                    {UF_OPTIONS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1.5">Slug (opcional)</label>
                  <input value={cityForm.slug} onChange={e => setCityForm(p => ({ ...p, slug: e.target.value }))} placeholder="diamantina (gerado automaticamente se vazio)" className={inputCls} />
                  <p className="text-[11px] text-muted mt-1">Deixe em branco para gerar automaticamente</p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => { setCityModal(false); setEditingCity(null) }}
                  className="flex-1 py-3 bg-background border border-border text-muted font-semibold rounded-xl hover:text-white transition-colors">Cancelar</button>
                <button onClick={saveCity} disabled={savingCity || !cityForm.nome.trim() || !cityForm.uf}
                  className="flex-1 py-3 bg-primary text-background font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                  {savingCity ? <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingCity ? 'Salvar alterações' : 'Criar cidade'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════
          MODAL: ADICIONAR DIAS MANUALMENTE
      ══════════════════════════════════════════ */}
      <AnimatePresence>
        {diasModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !diasModal.saving && setDiasModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md"
            >
              {/* Cabeçalho */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 bg-primary/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white">Adicionar Dias Manualmente</h2>
                  <p className="text-xs text-muted">Pagamento fora da plataforma (dinheiro, pix, etc.)</p>
                </div>
              </div>

              {/* Prestador */}
              <div className="flex items-center gap-3 bg-background rounded-xl p-3 mb-5">
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
                      return <p className="text-xs text-purple-400 font-semibold mt-0.5">Assinante mensal ativo</p>
                    }
                    if (dias !== null && dias > 0) {
                      return <p className="text-xs text-green-400 font-semibold mt-0.5">{dias} dias restantes — os novos dias serão somados</p>
                    }
                    return <p className="text-xs text-red-400 font-semibold mt-0.5">Sem score ativo — prazo começa hoje</p>
                  })()}
                </div>
              </div>

              {/* Atalhos rápidos de dias */}
              <div className="mb-3">
                <label className="block text-xs text-muted mb-2">Pacote rápido</label>
                <div className="grid grid-cols-4 gap-2">
                  {[7, 15, 30, 60].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDiasModal(m => m ? { ...m, dias: String(d) } : null)}
                      className={`py-2 rounded-xl text-xs font-bold transition-colors border ${
                        diasModal.dias === String(d)
                        ? 'bg-primary text-background border-primary'
                        : 'bg-background text-muted border-border hover:text-white'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              {/* Input de dias */}
              <div className="mb-4">
                <label className="block text-xs text-muted mb-1.5">
                  Quantidade de dias *
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={diasModal.dias}
                  onChange={e => setDiasModal(m => m ? { ...m, dias: e.target.value } : null)}
                  className={inputCls}
                  placeholder="Ex: 30"
                />
              </div>

              {/* Observação */}
              <div className="mb-6">
                <label className="block text-xs text-muted mb-1.5">
                  Observação (opcional)
                </label>
                <input
                  type="text"
                  value={diasModal.observacao}
                  onChange={e => setDiasModal(m => m ? { ...m, observacao: e.target.value } : null)}
                  className={inputCls}
                  placeholder="Ex: Pagamento em dinheiro R$ 30,00"
                />
              </div>

              {/* Botões */}
              <div className="flex gap-3">
                <button
                  onClick={() => setDiasModal(null)}
                  disabled={diasModal.saving}
                  className="flex-1 py-3 bg-background border border-border text-muted font-semibold rounded-xl hover:text-white transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveDiasManual}
                  disabled={diasModal.saving || !diasModal.dias || parseInt(diasModal.dias) < 1}
                  className="flex-1 py-3 bg-primary text-background font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {diasModal.saving
                    ? <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                    : <TrendingUp className="w-4 h-4" />
                  }
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
