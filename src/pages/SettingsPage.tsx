import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Bell, Lock, Palette, LogOut, Trash2, Camera,
  ChevronRight, Check, Sun, Moon, Monitor, Eye, EyeOff,
  Mail, Phone, AlertTriangle, Loader2, Shield, Save,
  CreditCard, Plus, X, MapPin, Sliders, HelpCircle,
  FileText, MessageCircle, ExternalLink, Download,
  Tag, DollarSign, Compass
} from 'lucide-react'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'
import { doc, updateDoc, deleteDoc, collection, getDocs } from 'firebase/firestore'
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { db, storage, auth } from '@/lib/firebase'
import { deleteUser } from 'firebase/auth'

type Section = 'conta' | 'notificacoes' | 'privacidade' | 'aparencia' | 'pagamentos' | 'preferencias' | 'suporte'
type Theme = 'dark' | 'light' | 'system'
type ProfileVisibility = 'public' | 'providers-only' | 'private'

interface PaymentMethod {
  id: string
  type: 'card' | 'pix'
  last4?: string
  brand?: string
  pixKey?: string
  isDefault: boolean
}

interface UserSettings {
  theme: Theme
  notifications: {
    email: boolean
    newProviders: boolean
    serviceUpdates: boolean
    messages: boolean
    offers: boolean
  }
  privacy: {
    profileVisibility: ProfileVisibility
    showPhone: boolean
    showEmail: boolean
  }
  preferences: {
    favoriteCategories: string[]
    priceRange: { min: number; max: number }
    searchRadius: number
    onlyVerified: boolean
    minRating: number
  }
}

export const SettingsPage = () => {
  const { user, firebaseUser, logout } = useSimpleAuth()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState<Section | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [addPaymentModal, setAddPaymentModal] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState({
    name: user?.name || '',
    phone: (user?.providerProfile as any)?.phone || (user?.clientProfile as any)?.phone || '',
    avatar: user?.avatar || '',
  })

  const [settings, setSettings] = useState<UserSettings>({
    theme: (localStorage.getItem('theme') as Theme) || 'dark',
    notifications: {
      email: true,
      newProviders: true,
      serviceUpdates: true,
      messages: true,
      offers: false,
    },
    privacy: {
      profileVisibility: 'public',
      showPhone: true,
      showEmail: false,
    },
    preferences: {
      favoriteCategories: [],
      priceRange: { min: 50, max: 500 },
      searchRadius: 20,
      onlyVerified: false,
      minRating: 4.0,
    },
  })

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Carrega categorias do Firestore
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const snap = await getDocs(collection(db, 'categories'))
        setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (err) {
        console.error('Erro ao carregar categorias:', err)
      }
    }
    loadCategories()
  }, [])

  useEffect(() => {
    if (user?.settings) {
      setSettings({ ...settings, ...user.settings })
    }
  }, [user])

  useEffect(() => {
    const root = document.documentElement
    if (settings.theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', prefersDark)
    } else {
      root.classList.toggle('dark', settings.theme === 'dark')
    }
    localStorage.setItem('theme', settings.theme)
  }, [settings.theme])

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return
    if (file.size > 5 * 1024 * 1024) {
      showToast('Imagem deve ter no máximo 5MB', 'error')
      return
    }

    setUploadingAvatar(true)
    try {
      const fileRef = storageRef(storage, `avatars/${user.id}/${Date.now()}_${file.name}`)
      const task = uploadBytesResumable(fileRef, file)
      
      await new Promise((resolve, reject) => {
        task.on('state_changed', null, reject, resolve)
      })

      const url = await getDownloadURL(task.snapshot.ref)
      setProfile(prev => ({ ...prev, avatar: url }))
      await updateDoc(doc(db, 'users', user.id), { avatar: url })
      showToast('✅ Foto atualizada!')
    } catch (err) {
      console.error(err)
      showToast('❌ Erro ao enviar foto', 'error')
    } finally {
      setUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const saveProfile = async () => {
    if (!user?.id || !profile.name.trim()) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', user.id), {
        name: profile.name,
        [`${user.roles?.includes('provider') ? 'providerProfile' : 'clientProfile'}.phone`]: profile.phone,
      })
      showToast('✅ Perfil salvo!')
      setActiveSection(null)
    } catch (err) {
      console.error(err)
      showToast('❌ Erro ao salvar', 'error')
    } finally {
      setSaving(false)
    }
  }

  const saveSettings = async () => {
    if (!user?.id) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', user.id), { settings })
      showToast('✅ Configurações salvas!')
      setActiveSection(null)
    } catch (err) {
      console.error(err)
      showToast('❌ Erro ao salvar', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/entrar')
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toLowerCase() !== 'excluir') return
    if (!user?.id || !firebaseUser) return
    
    setDeleting(true)
    try {
      await deleteDoc(doc(db, 'users', user.id))
      await deleteUser(firebaseUser)
      navigate('/')
      showToast('✅ Conta excluída')
    } catch (err: any) {
      console.error(err)
      if (err.code === 'auth/requires-recent-login') {
        showToast('⚠️ Faça login novamente para excluir', 'error')
      } else {
        showToast('❌ Erro ao excluir conta', 'error')
      }
    } finally {
      setDeleting(false)
    }
  }

  const toggleFavoriteCategory = (catId: string) => {
    setSettings(s => ({
      ...s,
      preferences: {
        ...s.preferences,
        favoriteCategories: s.preferences.favoriteCategories.includes(catId)
          ? s.preferences.favoriteCategories.filter(c => c !== catId)
          : [...s.preferences.favoriteCategories, catId].slice(0, 5)
      }
    }))
  }

  const exportData = async () => {
    if (!user) return
    const data = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: user.roles,
        createdAt: user.createdAt,
      },
      settings,
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `servicoflix-dados-${user.id}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('✅ Dados exportados!')
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white mb-2">Login Necessário</h1>
          <p className="text-muted mb-6">Você precisa estar logado.</p>
          <button onClick={() => navigate('/entrar')} className="px-6 py-3 bg-primary text-background font-bold rounded-xl">
            Fazer Login
          </button>
        </div>
      </div>
    )
  }

  const sections = [
    { id: 'conta', icon: User, label: 'Conta e Perfil', desc: 'Nome, foto, telefone' },
    { id: 'notificacoes', icon: Bell, label: 'Notificações', desc: 'Emails e alertas' },
    { id: 'privacidade', icon: Lock, label: 'Privacidade', desc: 'Visibilidade do perfil' },
    { id: 'aparencia', icon: Palette, label: 'Aparência', desc: 'Tema escuro/claro' },
    { id: 'pagamentos', icon: CreditCard, label: 'Pagamentos', desc: 'Métodos e histórico' },
    { id: 'preferencias', icon: Sliders, label: 'Preferências', desc: 'Categorias e filtros' },
    { id: 'suporte', icon: HelpCircle, label: 'Suporte', desc: 'Ajuda e contato' },
  ] as const

  return (
    <div className="min-h-screen bg-background pt-16 pb-20">
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }}
            className={`fixed top-20 right-4 z-50 px-5 py-3 rounded-xl font-semibold text-sm shadow-lg ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
          >{toast.msg}</motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Configurações</h1>
            <p className="text-sm text-muted">Gerencie sua conta e preferências</p>
          </div>
        </div>

        <div className="space-y-3">
          {sections.map(section => (
            <motion.button
              key={section.id}
              onClick={() => setActiveSection(activeSection === section.id ? null : section.id as Section)}
              className="w-full bg-surface border border-border rounded-xl p-4 flex items-center gap-4 hover:border-primary/50 transition-colors text-left"
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center shrink-0">
                <section.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{section.label}</p>
                <p className="text-xs text-muted">{section.desc}</p>
              </div>
              <ChevronRight className={`w-5 h-5 text-muted transition-transform ${activeSection === section.id ? 'rotate-90' : ''}`} />
            </motion.button>
          ))}
        </div>

        {/* SEÇÃO: CONTA E PERFIL */}
        <AnimatePresence>
          {activeSection === 'conta' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mt-4 bg-surface border border-border rounded-xl p-6 space-y-5"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-background">
                    {uploadingAvatar ? (
                      <div className="w-full h-full flex items-center justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
                    ) : profile.avatar ? (
                      <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted text-2xl font-bold">{profile.name[0]?.toUpperCase()}</div>
                    )}
                  </div>
                  <button onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar}
                    className="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center hover:bg-primary-dark transition-colors disabled:opacity-60"
                  >
                    <Camera className="w-4 h-4 text-background" />
                  </button>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{profile.name}</p>
                  <p className="text-xs text-muted">{user.email}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs text-muted mb-1.5">Nome completo</label>
                <input type="text" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-primary transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-muted mb-1.5">Email</label>
                <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-4 py-3">
                  <Mail className="w-4 h-4 text-muted" />
                  <input type="email" value={user.email} disabled
                    className="flex-1 bg-transparent text-muted text-sm outline-none cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-muted mt-1">Email não pode ser alterado</p>
              </div>

              <div>
                <label className="block text-xs text-muted mb-1.5">Telefone</label>
                <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-4 py-3">
                  <Phone className="w-4 h-4 text-muted" />
                  <input type="tel" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="flex-1 bg-transparent text-white text-sm outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <button onClick={saveProfile} disabled={saving || !profile.name.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-background font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4" /> Salvar alterações</>}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SEÇÃO: NOTIFICAÇÕES */}
        <AnimatePresence>
          {activeSection === 'notificacoes' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mt-4 bg-surface border border-border rounded-xl p-6 space-y-4"
            >
              <p className="text-xs text-muted">Escolha como deseja receber notificações</p>

              {[
                { key: 'email', label: 'Notificações por email', desc: 'Receber emails sobre atualizações importantes' },
                { key: 'newProviders', label: 'Novos prestadores', desc: 'Avisar quando novos prestadores se cadastrarem na minha região' },
                { key: 'serviceUpdates', label: 'Atualizações de serviço', desc: 'Status de solicitações e agendamentos' },
                { key: 'messages', label: 'Mensagens', desc: 'Notificar sobre novas mensagens de prestadores' },
                { key: 'offers', label: 'Ofertas e promoções', desc: 'Receber ofertas especiais e descontos' },
              ].map(item => (
                <label key={item.key} className="flex items-center justify-between gap-4 p-3 bg-background rounded-lg cursor-pointer hover:bg-background/80 transition-colors">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{item.label}</p>
                    <p className="text-xs text-muted mt-0.5">{item.desc}</p>
                  </div>
                  <div onClick={() => setSettings(s => ({ ...s, notifications: { ...s.notifications, [item.key]: !s.notifications[item.key as keyof typeof s.notifications] } }))}
                    className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${settings.notifications[item.key as keyof typeof settings.notifications] ? 'bg-green-500' : 'bg-border'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.notifications[item.key as keyof typeof settings.notifications] ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </label>
              ))}

              <button onClick={saveSettings} disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-background font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 mt-6"
              >
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4" /> Salvar preferências</>}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SEÇÃO: PRIVACIDADE */}
        <AnimatePresence>
          {activeSection === 'privacidade' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mt-4 bg-surface border border-border rounded-xl p-6 space-y-5"
            >
              <div>
                <label className="block text-sm font-semibold text-white mb-3">Visibilidade do perfil</label>
                <div className="space-y-2">
                  {[
                    { value: 'public', label: 'Público', desc: 'Qualquer pessoa pode ver meu perfil', icon: Eye },
                    { value: 'providers-only', label: 'Apenas prestadores', desc: 'Somente prestadores podem visualizar', icon: Shield },
                    { value: 'private', label: 'Privado', desc: 'Apenas eu posso ver meu perfil', icon: EyeOff },
                  ].map(option => (
                    <button key={option.value}
                      onClick={() => setSettings(s => ({ ...s, privacy: { ...s.privacy, profileVisibility: option.value as ProfileVisibility } }))}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        settings.privacy.profileVisibility === option.value
                          ? 'bg-primary/10 border-primary text-white'
                          : 'bg-background border-border text-muted hover:border-primary/50'
                      }`}
                    >
                      <option.icon className="w-5 h-5" />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-semibold">{option.label}</p>
                        <p className="text-xs opacity-80">{option.desc}</p>
                      </div>
                      {settings.privacy.profileVisibility === option.value && <Check className="w-5 h-5 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between gap-4 p-3 bg-background rounded-lg cursor-pointer">
                  <div>
                    <p className="text-sm font-semibold text-white">Mostrar telefone no perfil</p>
                    <p className="text-xs text-muted mt-0.5">Outros usuários poderão ver seu número</p>
                  </div>
                  <div onClick={() => setSettings(s => ({ ...s, privacy: { ...s.privacy, showPhone: !s.privacy.showPhone } }))}
                    className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${settings.privacy.showPhone ? 'bg-green-500' : 'bg-border'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.privacy.showPhone ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </label>

                <label className="flex items-center justify-between gap-4 p-3 bg-background rounded-lg cursor-pointer">
                  <div>
                    <p className="text-sm font-semibold text-white">Mostrar email no perfil</p>
                    <p className="text-xs text-muted mt-0.5">Seu email ficará visível publicamente</p>
                  </div>
                  <div onClick={() => setSettings(s => ({ ...s, privacy: { ...s.privacy, showEmail: !s.privacy.showEmail } }))}
                    className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${settings.privacy.showEmail ? 'bg-green-500' : 'bg-border'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.privacy.showEmail ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </label>
              </div>

              <button onClick={saveSettings} disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-background font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4" /> Salvar preferências</>}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SEÇÃO: APARÊNCIA */}
        <AnimatePresence>
          {activeSection === 'aparencia' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mt-4 bg-surface border border-border rounded-xl p-6 space-y-5"
            >
              <div>
                <label className="block text-sm font-semibold text-white mb-3">Tema</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'dark', label: 'Escuro', icon: Moon },
                    { value: 'light', label: 'Claro', icon: Sun },
                    { value: 'system', label: 'Sistema', icon: Monitor },
                  ].map(theme => (
                    <button key={theme.value}
                      onClick={() => setSettings(s => ({ ...s, theme: theme.value as Theme }))}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                        settings.theme === theme.value
                          ? 'bg-primary/10 border-primary scale-105'
                          : 'bg-background border-border hover:border-primary/50'
                      }`}
                    >
                      <theme.icon className={`w-6 h-6 ${settings.theme === theme.value ? 'text-primary' : 'text-muted'}`} />
                      <span className={`text-xs font-semibold ${settings.theme === theme.value ? 'text-white' : 'text-muted'}`}>{theme.label}</span>
                      {settings.theme === theme.value && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted mt-3">
                  {settings.theme === 'system' ? 'Seguir preferência do sistema operacional' : `Tema ${settings.theme === 'dark' ? 'escuro' : 'claro'} ativado`}
                </p>
              </div>

              <button onClick={saveSettings} disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-background font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4" /> Salvar preferências</>}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SEÇÃO: PAGAMENTOS */}
        <AnimatePresence>
          {activeSection === 'pagamentos' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mt-4 bg-surface border border-border rounded-xl p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Métodos de pagamento</p>
                  <p className="text-xs text-muted mt-0.5">Gerencie seus cartões e Pix</p>
                </div>
                <button
                  onClick={() => setAddPaymentModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-primary/20 border border-primary/30 text-primary text-xs font-bold rounded-lg hover:bg-primary/30 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Adicionar
                </button>
              </div>

              {paymentMethods.length === 0 ? (
                <div className="text-center py-12 bg-background rounded-xl">
                  <CreditCard className="w-12 h-12 text-muted mx-auto mb-3" />
                  <p className="text-sm text-muted">Nenhum método de pagamento cadastrado</p>
                  <p className="text-xs text-muted mt-1">Adicione um cartão ou chave Pix</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentMethods.map(method => (
                    <div key={method.id} className="flex items-center gap-3 p-4 bg-background rounded-lg border border-border">
                      <CreditCard className="w-6 h-6 text-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">
                          {method.type === 'card' ? `${method.brand} •••• ${method.last4}` : `Pix: ${method.pixKey}`}
                        </p>
                        {method.isDefault && <span className="text-xs text-primary">Padrão</span>}
                      </div>
                      <button className="p-2 text-muted hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-border pt-5">
                <p className="text-sm font-semibold text-white mb-3">Histórico de transações</p>
                <div className="text-center py-8 bg-background rounded-xl">
                  <FileText className="w-10 h-10 text-muted mx-auto mb-2" />
                  <p className="text-xs text-muted">Nenhuma transação ainda</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SEÇÃO: PREFERÊNCIAS */}
        <AnimatePresence>
          {activeSection === 'preferencias' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mt-4 bg-surface border border-border rounded-xl p-6 space-y-5"
            >
              <div>
                <label className="block text-sm font-semibold text-white mb-3">Categorias favoritas (até 5)</label>
                <div className="flex flex-wrap gap-2">
                  {categories.filter(c => c.active).map(cat => {
                    const isFavorite = settings.preferences.favoriteCategories.includes(cat.id)
                    return (
                      <button key={cat.id}
                        onClick={() => toggleFavoriteCategory(cat.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all ${
                          isFavorite
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-background border-border text-muted hover:border-primary/50'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span className="text-xs font-semibold">{cat.name}</span>
                        {isFavorite && <Check className="w-3 h-3" />}
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-muted mt-2">
                  {settings.preferences.favoriteCategories.length}/5 selecionadas
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-3">Faixa de preço (R$)</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted mb-1.5">Mínimo</label>
                    <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2">
                      <DollarSign className="w-4 h-4 text-muted" />
                      <input type="number" value={settings.preferences.priceRange.min}
                        onChange={e => setSettings(s => ({ ...s, preferences: { ...s.preferences, priceRange: { ...s.preferences.priceRange, min: +e.target.value } } }))}
                        className="flex-1 bg-transparent text-white text-sm outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1.5">Máximo</label>
                    <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2">
                      <DollarSign className="w-4 h-4 text-muted" />
                      <input type="number" value={settings.preferences.priceRange.max}
                        onChange={e => setSettings(s => ({ ...s, preferences: { ...s.preferences, priceRange: { ...s.preferences.priceRange, max: +e.target.value } } }))}
                        className="flex-1 bg-transparent text-white text-sm outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-3">Raio de busca: {settings.preferences.searchRadius}km</label>
                <input type="range" min="5" max="100" step="5" value={settings.preferences.searchRadius}
                  onChange={e => setSettings(s => ({ ...s, preferences: { ...s.preferences, searchRadius: +e.target.value } }))}
                  className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-muted mt-1">
                  <span>5km</span>
                  <span>100km</span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between gap-4 p-3 bg-background rounded-lg cursor-pointer">
                  <div>
                    <p className="text-sm font-semibold text-white">Apenas verificados</p>
                    <p className="text-xs text-muted mt-0.5">Mostrar apenas prestadores com selo de verificação</p>
                  </div>
                  <div onClick={() => setSettings(s => ({ ...s, preferences: { ...s.preferences, onlyVerified: !s.preferences.onlyVerified } }))}
                    className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${settings.preferences.onlyVerified ? 'bg-green-500' : 'bg-border'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.preferences.onlyVerified ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </label>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Avaliação mínima: {settings.preferences.minRating.toFixed(1)} ⭐</label>
                  <input type="range" min="0" max="5" step="0.5" value={settings.preferences.minRating}
                    onChange={e => setSettings(s => ({ ...s, preferences: { ...s.preferences, minRating: +e.target.value } }))}
                    className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
              </div>

              <button onClick={saveSettings} disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-background font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4" /> Salvar preferências</>}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SEÇÃO: SUPORTE */}
        <AnimatePresence>
          {activeSection === 'suporte' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mt-4 bg-surface border border-border rounded-xl p-6 space-y-4"
            >
              <a href="mailto:suporte@servicoflix.com"
                className="flex items-center gap-3 p-4 bg-background rounded-lg hover:bg-background/80 transition-colors"
              >
                <Mail className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">Contatar suporte</p>
                  <p className="text-xs text-muted">suporte@servicoflix.com</p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted" />
              </a>

              <button
                onClick={() => navigate('/faq')}
                className="w-full flex items-center gap-3 p-4 bg-background rounded-lg hover:bg-background/80 transition-colors text-left"
              >
                <HelpCircle className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">Central de Ajuda</p>
                  <p className="text-xs text-muted">Perguntas frequentes e tutoriais</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted" />
              </button>

              <button
                onClick={() => window.open('https://wa.me/5538999999999', '_blank')}
                className="w-full flex items-center gap-3 p-4 bg-background rounded-lg hover:bg-background/80 transition-colors text-left"
              >
                <MessageCircle className="w-5 h-5 text-green-400" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">WhatsApp</p>
                  <p className="text-xs text-muted">(38) 99999-9999</p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted" />
              </button>

              <div className="border-t border-border pt-4">
                <button
                  onClick={exportData}
                  className="w-full flex items-center gap-3 p-4 bg-background rounded-lg hover:bg-background/80 transition-colors text-left"
                >
                  <Download className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">Baixar meus dados</p>
                    <p className="text-xs text-muted">Exportar em JSON (LGPD)</p>
                  </div>
                </button>
              </div>

              <div className="bg-background rounded-lg p-4">
                <p className="text-xs text-muted mb-2">ℹ️ Sobre</p>
                <p className="text-xs text-white mb-1"><span className="font-semibold">Versão:</span> 1.0.0</p>
                <p className="text-xs text-white"><span className="font-semibold">Desenvolvido por:</span> Hewerton Assunção</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BOTÕES DE AÇÃO */}
        <div className="mt-8 space-y-3">
          <button onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 bg-surface border border-border text-white font-semibold rounded-xl hover:bg-background transition-colors"
          >
            <LogOut className="w-5 h-5" /> Sair da conta
          </button>

          <button onClick={() => setDeleteModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 border border-red-500/30 text-red-400 font-semibold rounded-xl hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="w-5 h-5" /> Excluir minha conta
          </button>
        </div>
      </div>

      {/* MODAL: EXCLUIR CONTA */}
      <AnimatePresence>
        {deleteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteModal(false)}
          >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-surface border border-red-500/30 rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Excluir conta</h2>
                  <p className="text-xs text-muted">Esta ação é irreversível</p>
                </div>
              </div>

              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                <p className="text-sm text-red-400">Ao excluir sua conta:</p>
                <ul className="text-xs text-red-400/80 mt-2 space-y-1 list-disc list-inside">
                  <li>Todos os seus dados serão permanentemente apagados</li>
                  <li>Você não poderá recuperar sua conta</li>
                  <li>Serviços agendados serão cancelados</li>
                </ul>
              </div>

              <div className="mb-4">
                <label className="block text-sm text-white mb-2">Digite <span className="font-bold">EXCLUIR</span> para confirmar:</label>
                <input type="text" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)}
                  placeholder="EXCLUIR"
                  className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-red-500 transition-colors"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setDeleteModal(false); setDeleteConfirmText('') }}
                  className="flex-1 py-3 bg-background border border-border text-muted font-semibold rounded-xl hover:text-white transition-colors"
                >Cancelar</button>
                <button onClick={handleDeleteAccount} disabled={deleting || deleteConfirmText.toLowerCase() !== 'excluir'}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {deleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Excluindo...</> : <><Trash2 className="w-4 h-4" /> Excluir conta</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: ADICIONAR PAGAMENTO */}
      <AnimatePresence>
        {addPaymentModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setAddPaymentModal(false)}
          >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md"
            >
              <h2 className="text-lg font-black text-white mb-4">Adicionar método de pagamento</h2>
              <p className="text-sm text-muted mb-4">🚧 Integração com Stripe em desenvolvimento</p>
              <div className="text-center py-8 bg-background rounded-xl">
                <CreditCard className="w-12 h-12 text-muted mx-auto mb-3" />
                <p className="text-xs text-muted">Em breve você poderá adicionar cartões e Pix</p>
              </div>
              <button onClick={() => setAddPaymentModal(false)}
                className="w-full mt-4 py-3 bg-primary text-background font-bold rounded-xl"
              >Fechar</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
