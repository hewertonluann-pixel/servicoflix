import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  User, Phone, MapPin, Camera, Save, Loader2, CheckCircle,
  Star, Briefcase, MessageSquare, ChevronRight, AlertCircle
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'
import { useCities } from '@/hooks/useCities'
import { doc, getDoc, updateDoc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { Review } from '@/types'

interface ClientForm {
  name: string
  phone: string
  city: string
  neighborhood: string
  avatar: string
}

const resolveAvatar = (data: any, fallbackId?: string): string => {
  return (
    data?.clientProfile?.avatar ||
    data?.avatar ||
    (fallbackId ? `https://i.pravatar.cc/150?u=${fallbackId}` : '')
  )
}

export const ClientProfilePage = () => {
  const { user, isProvider } = useSimpleAuth()
  const navigate = useNavigate()
  const { cities } = useCities()
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState<'perfil' | 'avaliacoes'>('perfil')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const [form, setForm] = useState<ClientForm>({
    name: '',
    phone: '',
    city: '',
    neighborhood: '',
    avatar: '',
  })

  const [reviews, setReviews] = useState<(Review & { providerName?: string; providerAvatar?: string })[]>([])
  const [loadingReviews, setLoadingReviews] = useState(false)

  // Carrega dados do perfil pessoal (cliente)
  useEffect(() => {
    if (!user?.id) return
    const load = async () => {
      setLoading(true)
      try {
        const snap = await getDoc(doc(db, 'users', user.id))
        if (snap.exists()) {
          const data = snap.data()
          setForm({
            name: data.name || user.name || '',
            phone: data.clientProfile?.phone || '',
            city: data.clientProfile?.city || '',
            neighborhood: data.clientProfile?.neighborhood || '',
            avatar: resolveAvatar(data, user.id),
          })
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id])

  // Carrega avaliações feitas pelo cliente em tempo real
  useEffect(() => {
    if (!user?.id) return
    setLoadingReviews(true)

    const q = query(
      collection(db, 'reviews'),
      where('clientId', '==', user.id),
      orderBy('createdAt', 'desc')
    )

    const unsub = onSnapshot(q, async (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Review))

      const enriched = await Promise.all(
        data.map(async (rev) => {
          try {
            const provSnap = await getDoc(doc(db, 'users', rev.providerId))
            if (provSnap.exists()) {
              const pd = provSnap.data()
              return {
                ...rev,
                providerName: pd.providerProfile?.professionalName || pd.name || 'Prestador',
                providerAvatar: pd.providerProfile?.avatar || pd.avatar || '',
              }
            }
          } catch {}
          return rev
        })
      )

      setReviews(enriched)
      setLoadingReviews(false)
    }, () => setLoadingReviews(false))

    return () => unsub()
  }, [user?.id])

  // Upload do avatar PESSOAL (campo raiz `avatar`)
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Imagem muito grande. Máximo 5MB.')
      return
    }
    if (!file.type.startsWith('image/')) {
      setUploadError('Formato inválido. Use JPG, PNG ou WebP.')
      return
    }

    setUploadingAvatar(true)
    setUploadError('')
    try {
      const path = `avatars/${user.id}/profile_${Date.now()}`
      const fileRef = storageRef(storage, path)
      await new Promise<void>((resolve, reject) => {
        const task = uploadBytesResumable(fileRef, file)
        task.on('state_changed', null, reject, () => resolve())
      })
      const url = await getDownloadURL(fileRef)
      setForm(prev => ({ ...prev, avatar: url }))
      // ✅ Salva APENAS o avatar pessoal — não toca em providerProfile
      await updateDoc(doc(db, 'users', user.id), { avatar: url })
    } catch {
      setUploadError('Erro ao fazer upload. Tente novamente.')
    } finally {
      setUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const handleSave = async () => {
    if (!user?.id) return
    setSaving(true)
    try {
      // Busca o doc atual para verificar se professionalName já foi definido
      const snap = await getDoc(doc(db, 'users', user.id))
      const currentData = snap.data()
      const currentProfName = currentData?.providerProfile?.professionalName

      const updates: Record<string, any> = {
        name: form.name.trim(),
        'clientProfile.phone': form.phone.trim(),
        'clientProfile.city': form.city,
        'clientProfile.neighborhood': form.neighborhood.trim(),
      }

      // ✅ Se é prestador e ainda NÃO tem professionalName explícito no Firestore,
      // congela com o nome pessoal ATUAL antes de mudar — evita que o fallback
      // `data.name` altere o nome profissional junto
      if (isProvider && !currentProfName?.trim()) {
        updates['providerProfile.professionalName'] = currentData?.name || user.name
      }

      await updateDoc(doc(db, 'users', user.id), updates)
      setSaved(true)
      setEditing(false)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Erro ao salvar:', err)
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (val: any): string => {
    if (!val) return ''
    const date = val?.toDate ? val.toDate() : new Date(val)
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const starAvg = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  if (!user) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <p className="text-muted">Faça login para ver seu perfil.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-16 pb-20 bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Meu Perfil</h1>
            <p className="text-muted text-sm mt-1">Dados pessoais e histórico de avaliações</p>
          </div>

          {isProvider && (
            <button
              onClick={() => navigate('/meu-perfil')}
              className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/30 text-primary text-xs font-bold rounded-xl hover:bg-primary/20 transition-colors"
            >
              <Briefcase className="w-4 h-4" />
              Painel Prestador
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </motion.div>

        {/* Aviso de perfis independentes (só para prestadores) */}
        {isProvider && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 mb-6 text-sm"
          >
            <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-muted leading-relaxed">
              Você está editando seu{' '}
              <span className="text-white font-semibold">perfil pessoal (cliente)</span>.
              Nome e foto aqui são independentes do seu perfil profissional.
              Para alterar nome e foto do prestador, acesse{' '}
              <button
                onClick={() => navigate('/meu-perfil/editar')}
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
                Editar Perfil Profissional
              </button>.
            </p>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="bg-surface border border-border rounded-xl p-1.5 mb-6 flex gap-1.5">
          {(['perfil', 'avaliacoes'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                activeTab === tab ? 'bg-primary text-background' : 'text-muted hover:text-white'
              }`}
            >
              {tab === 'perfil'
                ? <><User className="w-4 h-4" /> Perfil Pessoal</>
                : <><Star className="w-4 h-4" /> Avaliações ({reviews.length})</>
              }
            </button>
          ))}
        </div>

        {/* ===== ABA PERFIL ===== */}
        {activeTab === 'perfil' && (
          <motion.div
            key="perfil"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : (
              <div className="bg-surface border border-border rounded-2xl p-6 space-y-6">

                {/* Avatar */}
                <div className="flex items-center gap-5">
                  <div className="relative shrink-0">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-background border-2 border-border">
                      {form.avatar ? (
                        <img src={form.avatar} alt={form.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-8 h-8 text-muted" />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-primary rounded-full flex items-center justify-center border-2 border-background hover:bg-primary-dark transition-colors disabled:opacity-60"
                    >
                      {uploadingAvatar
                        ? <Loader2 className="w-3.5 h-3.5 text-background animate-spin" />
                        : <Camera className="w-3.5 h-3.5 text-background" />
                      }
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">{form.name || 'Seu nome'}</p>
                    <p className="text-muted text-sm">{user.email}</p>
                    {uploadError && (
                      <p className="text-red-400 text-xs mt-1">{uploadError}</p>
                    )}
                  </div>
                </div>

                {/* Campos */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-muted mb-1.5 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Nome pessoal
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      disabled={!editing}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white text-sm focus:border-primary outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                    {isProvider && editing && (
                      <p className="text-xs text-muted mt-1.5">
                        ⚠️ Isso não altera seu nome profissional no perfil de prestador.
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs text-muted mb-1.5 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> Telefone
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                      disabled={!editing}
                      placeholder="(38) 99999-9999"
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white text-sm focus:border-primary outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-muted mb-1.5 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> Cidade
                    </label>
                    {editing ? (
                      <select
                        value={form.city}
                        onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white text-sm focus:border-primary outline-none transition-colors"
                      >
                        <option value="">Selecione...</option>
                        {cities.map(c => (
                          <option key={c.id} value={c.nome}>{c.nome} - {c.uf}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={form.city || 'Não informado'}
                        disabled
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed outline-none"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-muted mb-1.5 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> Bairro
                    </label>
                    <input
                      type="text"
                      value={form.neighborhood}
                      onChange={e => setForm(p => ({ ...p, neighborhood: e.target.value }))}
                      disabled={!editing}
                      placeholder="Seu bairro"
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white text-sm focus:border-primary outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-3 pt-2">
                  {!editing ? (
                    <button
                      onClick={() => setEditing(true)}
                      className="flex-1 py-3 bg-primary text-background font-bold rounded-xl hover:bg-primary-dark transition-colors"
                    >
                      Editar perfil
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditing(false)}
                        className="flex-1 py-3 bg-background border border-border text-muted font-semibold rounded-xl hover:text-white transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 py-3 bg-primary text-background font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {saving
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                          : <><Save className="w-4 h-4" /> Salvar</>
                        }
                      </button>
                    </>
                  )}
                </div>

                {saved && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-green-400 text-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Perfil pessoal atualizado com sucesso!
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ===== ABA AVALIAÇÕES ===== */}
        {activeTab === 'avaliacoes' && (
          <motion.div
            key="avaliacoes"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {reviews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-surface border border-border rounded-xl p-4 text-center">
                  <p className="text-3xl font-black text-yellow-400">{starAvg}</p>
                  <p className="text-xs text-muted mt-1">Média dada</p>
                </div>
                <div className="bg-surface border border-border rounded-xl p-4 text-center">
                  <p className="text-3xl font-black text-white">{reviews.length}</p>
                  <p className="text-xs text-muted mt-1">Avaliações feitas</p>
                </div>
                <div className="bg-surface border border-border rounded-xl p-4 text-center sm:block hidden">
                  <p className="text-3xl font-black text-primary">
                    {reviews.filter(r => r.verified).length}
                  </p>
                  <p className="text-xs text-muted mt-1">Serviços verificados</p>
                </div>
              </div>
            )}

            {loadingReviews ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-7 h-7 text-primary animate-spin" />
              </div>
            ) : reviews.length === 0 ? (
              <div className="bg-surface border border-border rounded-2xl p-10 text-center">
                <MessageSquare className="w-12 h-12 text-muted mx-auto mb-3" />
                <p className="text-white font-bold mb-1">Nenhuma avaliação ainda</p>
                <p className="text-muted text-sm">
                  Ao contratar um prestador e concluir um serviço, você pode deixar uma avaliação.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((rev, i) => (
                  <motion.div
                    key={rev.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-surface border border-border rounded-2xl p-5"
                  >
                    <div
                      className="flex items-center gap-3 mb-4 cursor-pointer group"
                      onClick={() => navigate(`/profissional/${rev.providerId}`)}
                    >
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-background border border-border shrink-0">
                        {rev.providerAvatar ? (
                          <img src={rev.providerAvatar} alt={rev.providerName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Briefcase className="w-5 h-5 text-muted" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm group-hover:text-primary transition-colors truncate">
                          {rev.providerName || 'Prestador'}
                        </p>
                        <p className="text-xs text-muted">Prestador avaliado</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted group-hover:text-primary transition-colors shrink-0" />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star
                            key={s}
                            className={`w-4 h-4 ${s <= rev.rating ? 'text-yellow-400' : 'text-border'}`}
                            fill={s <= rev.rating ? 'currentColor' : 'none'}
                          />
                        ))}
                      </div>
                      <span className="text-yellow-400 font-bold text-sm">{rev.rating}.0</span>

                      {rev.verified && (
                        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full font-semibold">
                          <CheckCircle className="w-3 h-3" /> Serviço verificado
                        </span>
                      )}
                      {rev.reviewerRole === 'provider' && (
                        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded-full font-semibold">
                          <Briefcase className="w-3 h-3" /> Como prestador
                        </span>
                      )}
                    </div>

                    {rev.comment && (
                      <p className="text-sm text-white/90 mb-3 leading-relaxed">"{rev.comment}"</p>
                    )}

                    {rev.reply && (
                      <div className="bg-background border border-border rounded-xl p-3 mt-3">
                        <p className="text-xs text-primary font-semibold mb-1">Resposta do prestador</p>
                        <p className="text-xs text-muted leading-relaxed">{rev.reply.text}</p>
                      </div>
                    )}

                    <p className="text-[11px] text-muted mt-3">
                      {formatDate(rev.createdAt)}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

      </div>
    </div>
  )
}
