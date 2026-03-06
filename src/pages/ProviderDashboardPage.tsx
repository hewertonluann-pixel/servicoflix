import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Camera, Save, User, MapPin, DollarSign, Briefcase, Star, Edit2, Video, Trash2, Plus, AlertCircle, Loader2, CheckCircle, Clock, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'
import { useCities } from '@/hooks/useCities'
import { YouTubeEmbed, isValidYouTubeUrl } from '@/components/YouTubeEmbed'
import { VideoCarousel } from '@/components/VideoCarousel'
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { storage, db } from '@/lib/firebase'

export const ProviderDashboardPage = () => {
  const { user } = useSimpleAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')

  // Carrega cidades ativas do Firestore
  const { cities, loading: loadingCities } = useCities()

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState({
    name: '',
    specialty: '',
    bio: '',
    city: '',
    neighborhood: '',
    priceFrom: 100,
    skills: [] as string[],
    avatar: '',
    coverImage: '',
    phone: '',
    email: '',
    responseTime: 'Menos de 1 hora',
    completedJobs: 150,
    rating: 4.8,
    reviewCount: 127,
    verified: true,
    videos: {
      presentation: '',
      portfolio: [] as string[],
    },
  })

  const [newSkill, setNewSkill] = useState('')
  const [newVideoUrl, setNewVideoUrl] = useState('')
  const [videoError, setVideoError] = useState('')

  // Carrega dados do Firestore
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return
      
      setLoading(true)
      try {
        const docRef = doc(db, 'users', user.id)
        const docSnap = await getDoc(docRef)
        
        if (docSnap.exists()) {
          const data = docSnap.data()
          const providerProfile = data.providerProfile || {}
          
          setProfile({
            name: data.name || user.name || 'Seu Nome',
            specialty: providerProfile.specialty || 'Sua Especialidade',
            bio: providerProfile.bio || 'Conte um pouco sobre você e sua experiência profissional...',
            city: providerProfile.city || '',
            neighborhood: providerProfile.neighborhood || 'Centro',
            priceFrom: providerProfile.priceFrom || 100,
            skills: providerProfile.skills || ['Habilidade 1', 'Habilidade 2'],
            avatar: data.avatar || user.avatar || `https://i.pravatar.cc/150?u=${user.id}`,
            coverImage: providerProfile.coverImage || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80',
            phone: providerProfile.phone || '',
            email: data.email || user.email || '',
            responseTime: providerProfile.responseTime || 'Menos de 1 hora',
            completedJobs: providerProfile.completedJobs || 150,
            rating: providerProfile.rating || 4.8,
            reviewCount: providerProfile.reviewCount || 127,
            verified: providerProfile.verified !== false,
            videos: {
              presentation: providerProfile.videos?.presentation || '',
              portfolio: providerProfile.videos?.portfolio || [],
            },
          })
        } else {
          // Perfil não existe, usar dados do user
          setProfile(prev => ({
            ...prev,
            name: user.name || 'Seu Nome',
            avatar: user.avatar || `https://i.pravatar.cc/150?u=${user.id}`,
            email: user.email || '',
          }))
        }
      } catch (error) {
        console.error('Erro ao carregar perfil:', error)
        setUploadError('Erro ao carregar perfil. Tente novamente.')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [user])

  // Define primeira cidade como padrão se não tiver nenhuma selecionada
  useEffect(() => {
    if (!profile.city && cities.length > 0) {
      setProfile(prev => ({ ...prev, city: cities[0].nome }))
    }
  }, [cities, profile.city])

  // Upload genérico
  const uploadImage = async (
    file: File,
    path: string,
    onProgress: (p: number) => void
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const fileRef = storageRef(storage, path)
      const task = uploadBytesResumable(fileRef, file)
      task.on(
        'state_changed',
        snap => onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        err => reject(err),
        async () => resolve(await getDownloadURL(task.snapshot.ref))
      )
    })
  }

  // Upload avatar
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Imagem deve ter no máximo 5MB')
      return
    }

    setUploadError('')
    setUploadingAvatar(true)
    try {
      const url = await uploadImage(
        file,
        `avatars/${user.id}/${Date.now()}_${file.name}`,
        p => setUploadProgress(p)
      )
      setProfile(prev => ({ ...prev, avatar: url }))
      await setDoc(doc(db, 'users', user.id), { avatar: url }, { merge: true })
    } catch (err: any) {
      setUploadError('Erro ao enviar foto. Tente novamente.')
      console.error(err)
    } finally {
      setUploadingAvatar(false)
      setUploadProgress(0)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  // Upload capa
  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Imagem deve ter no máximo 10MB')
      return
    }

    setUploadError('')
    setUploadingCover(true)
    try {
      const url = await uploadImage(
        file,
        `covers/${user.id}/${Date.now()}_${file.name}`,
        p => setUploadProgress(p)
      )
      setProfile(prev => ({ ...prev, coverImage: url }))
      await setDoc(
        doc(db, 'users', user.id),
        { providerProfile: { coverImage: url } },
        { merge: true }
      )
    } catch (err: any) {
      setUploadError('Erro ao enviar capa. Tente novamente.')
      console.error(err)
    } finally {
      setUploadingCover(false)
      setUploadProgress(0)
      if (coverInputRef.current) coverInputRef.current.value = ''
    }
  }

  // Salvar perfil
  const handleSave = async () => {
    if (!user?.id) return
    setSaving(true)
    try {
      await setDoc(
        doc(db, 'users', user.id),
        {
          name: profile.name,
          avatar: profile.avatar,
          providerProfile: {
            specialty: profile.specialty,
            bio: profile.bio,
            city: profile.city,
            neighborhood: profile.neighborhood,
            priceFrom: profile.priceFrom,
            skills: profile.skills,
            phone: profile.phone,
            coverImage: profile.coverImage,
            responseTime: profile.responseTime,
            completedJobs: profile.completedJobs,
            rating: profile.rating,
            reviewCount: profile.reviewCount,
            verified: profile.verified,
            videos: profile.videos,
          },
        },
        { merge: true }
      )
      setEditing(false)
    } catch (err) {
      console.error('Erro ao salvar perfil:', err)
      setUploadError('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const addSkill = () => {
    if (newSkill.trim() && profile.skills.length < 8 && !profile.skills.includes(newSkill.trim())) {
      setProfile({ ...profile, skills: [...profile.skills, newSkill.trim()] })
      setNewSkill('')
    }
  }

  const removeSkill = (index: number) => {
    setProfile({ ...profile, skills: profile.skills.filter((_, i) => i !== index) })
  }

  const addPortfolioVideo = () => {
    setVideoError('')
    if (!newVideoUrl.trim()) {
      setVideoError('Digite a URL do vídeo')
      return
    }
    if (!isValidYouTubeUrl(newVideoUrl)) {
      setVideoError('URL inválida. Use um link do YouTube')
      return
    }
    if (profile.videos.portfolio.length >= 5) {
      setVideoError('Máximo de 5 vídeos no portfólio')
      return
    }
    setProfile({
      ...profile,
      videos: {
        ...profile.videos,
        portfolio: [...profile.videos.portfolio, newVideoUrl.trim()]
      }
    })
    setNewVideoUrl('')
  }

  const removePortfolioVideo = (index: number) => {
    setProfile({
      ...profile,
      videos: {
        ...profile.videos,
        portfolio: profile.videos.portfolio.filter((_, i) => i !== index)
      }
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-16 pb-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-16 pb-20">
      {/* Inputs ocultos para upload */}
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
      <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />

      {/* Hero com cover */}
      <div className="relative h-48 sm:h-64 lg:h-80 bg-gradient-to-br from-primary/20 to-background">
        <img src={profile.coverImage} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

        {/* Botão trocar capa */}
        <button
          onClick={() => coverInputRef.current?.click()}
          disabled={uploadingCover}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-black/60 backdrop-blur-sm text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg flex items-center gap-2 text-xs sm:text-sm hover:bg-black/80 transition-colors touch-target disabled:opacity-60"
        >
          {uploadingCover ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> {uploadProgress}%
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" /> Trocar Capa
            </>
          )}
        </button>
      </div>

      {/* Erro de upload */}
      {uploadError && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {uploadError}
            <button onClick={() => setUploadError('')} className="ml-auto text-lg leading-none">×</button>
          </div>
        </div>
      )}

      {/* Conteúdo */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 sm:-mt-24 lg:-mt-32 relative z-10">
        {/* Banner NOVO: Portfólio Multimídia - MOVIDO PARA DENTRO DO CONTAINER */}
        <div className="mb-4 relative z-20">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-primary/20 via-purple-500/20 to-primary/20 border border-primary/30 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4"
          >
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-white mb-0.5">🎉 Novo! Portfólio Multimídia</h3>
              <p className="text-xs text-muted">Adicione fotos, vídeos e áudios no seu perfil!</p>
            </div>
            <button
              onClick={() => navigate('/meu-perfil/editar')}
              className="w-full sm:w-auto px-4 py-2 bg-primary text-background font-bold text-sm rounded-lg hover:bg-primary-dark transition-colors shrink-0"
            >
              Editar Agora
            </button>
          </motion.div>
        </div>

        {/* Botões de ação no topo (mobile) */}
        <div className="lg:hidden flex justify-end gap-2 mb-4">
          <Link to={`/profissional/${user?.id || '1'}`}>
            <button className="px-4 py-2 bg-surface border border-border rounded-lg text-white text-sm font-semibold hover:border-primary transition-colors">
              Ver Público
            </button>
          </Link>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-background rounded-lg text-sm font-bold hover:bg-primary-dark transition-colors"
            >
              <Edit2 className="w-4 h-4" /> Editar
            </button>
          ) : (
            <>
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 bg-surface border border-border rounded-lg text-muted text-sm font-semibold hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-background rounded-lg text-sm font-bold hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Salvar
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {/* Layout grid */}
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Coluna principal */}
          <div className="w-full lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Card de perfil */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6"
            >
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start">
                {/* Avatar com botão de trocar */}
                <div className="relative">
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className={`w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-xl sm:rounded-2xl object-cover border-4 border-background shrink-0 transition-opacity ${
                      uploadingAvatar ? 'opacity-50' : ''
                    }`}
                  />
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute bottom-0 right-0 w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-full flex items-center justify-center hover:bg-primary-dark transition-colors touch-target disabled:opacity-60"
                    title="Trocar foto de perfil"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-background animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-background" />
                    )}
                  </button>
                </div>

                {/* Informações */}
                <div className="flex-1 w-full">
                  {editing ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={profile.name}
                        onChange={e => setProfile({ ...profile, name: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white text-lg font-bold outline-none focus:border-primary transition-colors"
                        placeholder="Seu nome"
                      />
                      <input
                        type="text"
                        value={profile.specialty}
                        onChange={e => setProfile({ ...profile, specialty: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-primary font-semibold outline-none focus:border-primary transition-colors"
                        placeholder="Sua especialidade"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 mb-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 text-center sm:text-left">
                          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white mb-1">
                            {profile.name}
                          </h1>
                          <p className="text-primary text-base sm:text-lg font-semibold">
                            {profile.specialty}
                          </p>
                        </div>
                        {profile.verified && (
                          <div className="hidden sm:flex items-center gap-1 bg-primary/20 border border-primary/30 text-primary px-3 py-1.5 rounded-full text-xs font-semibold shrink-0">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Verificado
                          </div>
                        )}
                      </div>
                      {profile.verified && (
                        <div className="sm:hidden flex items-center justify-center gap-1 bg-primary/20 border border-primary/30 text-primary px-3 py-1.5 rounded-full text-xs font-semibold">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Verificado
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted mb-4">
                    <div className="flex items-center justify-center sm:justify-start gap-1">
                      <Star className="w-4 h-4 text-yellow-400" fill="currentColor" />
                      <span className="text-white font-semibold">{profile.rating}</span>
                      <span>({profile.reviewCount} avaliações)</span>
                    </div>
                    <div className="flex items-center justify-center sm:justify-start gap-1">
                      <MapPin className="w-4 h-4" />
                      {profile.city}, {profile.neighborhood}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    {profile.skills.map((skill, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-background border border-border rounded-full text-[10px] sm:text-xs text-muted">
                        {skill}
                        {editing && (
                          <button
                            onClick={() => removeSkill(i)}
                            className="ml-1 text-muted hover:text-red-400 transition-colors text-lg leading-none"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {editing && (
                    <div className="flex gap-2 mt-3">
                      <input
                        type="text"
                        value={newSkill}
                        onChange={e => setNewSkill(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && addSkill()}
                        placeholder="Nova habilidade"
                        className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-white text-sm focus:border-primary outline-none transition-colors"
                      />
                      <button
                        onClick={addSkill}
                        disabled={!newSkill.trim() || profile.skills.length >= 8}
                        className="px-3 py-2 bg-primary text-background text-sm font-bold rounded-lg disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Vídeo de apresentação */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-surface border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6"
            >
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <Video className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white">
                  Vídeo de Apresentação
                </h2>
              </div>
              {editing ? (
                <input
                  type="url"
                  value={profile.videos.presentation}
                  onChange={e =>
                    setProfile({
                      ...profile,
                      videos: { ...profile.videos, presentation: e.target.value }
                    })
                  }
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-background border border-border rounded-lg px-3 sm:px-4 py-3 text-white text-sm focus:border-primary outline-none transition-colors"
                />
              ) : profile.videos.presentation ? (
                <YouTubeEmbed videoUrl={profile.videos.presentation} title="Apresentação" />
              ) : (
                <div className="aspect-video w-full bg-background border border-dashed border-border rounded-xl flex items-center justify-center">
                  <p className="text-muted text-xs">Nenhum vídeo adicionado</p>
                </div>
              )}
            </motion.div>

            {/* Sobre */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-surface border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6"
            >
              <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white mb-3 sm:mb-4">Sobre</h2>
              {editing ? (
                <textarea
                  value={profile.bio}
                  onChange={e => setProfile({ ...profile, bio: e.target.value })}
                  rows={5}
                  maxLength={500}
                  placeholder="Conte sobre sua experiência..."
                  className="w-full bg-background border border-border rounded-lg px-3 sm:px-4 py-3 text-white text-sm focus:border-primary outline-none transition-colors resize-none"
                />
              ) : (
                <p className="text-muted text-sm sm:text-base leading-relaxed">{profile.bio}</p>
              )}
            </motion.div>

            {/* Portfólio de vídeos */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-surface border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6"
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white">
                    Portfólio de Trabalhos
                  </h2>
                </div>
                <span className="text-[10px] sm:text-xs text-muted">
                  {profile.videos.portfolio.length} vídeo{profile.videos.portfolio.length !== 1 ? 's' : ''}
                </span>
              </div>

              {profile.videos.portfolio.length > 0 ? (
                <VideoCarousel>
                  {profile.videos.portfolio.map((url, i) => (
                    <div key={i} className="flex-none w-[240px] sm:w-[280px] lg:w-[320px] snap-start relative group">
                      <YouTubeEmbed videoUrl={url} title={`Trabalho ${i + 1}`} showThumbnail />
                      {editing && (
                        <button
                          onClick={() => removePortfolioVideo(i)}
                          className="absolute top-2 right-2 w-9 h-9 bg-red-500/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      )}
                    </div>
                  ))}
                </VideoCarousel>
              ) : (
                <div className="aspect-video w-full bg-background border border-dashed border-border rounded-xl flex items-center justify-center">
                  <p className="text-muted text-xs">Nenhum vídeo no portfólio</p>
                </div>
              )}

              {editing && profile.videos.portfolio.length < 5 && (
                <div className="space-y-2 mt-4">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newVideoUrl}
                      onChange={e => {
                        setNewVideoUrl(e.target.value)
                        setVideoError('')
                      }}
                      onKeyPress={e => e.key === 'Enter' && addPortfolioVideo()}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="flex-1 bg-background border border-border rounded-lg px-3 sm:px-4 py-3 text-white text-sm focus:border-primary outline-none transition-colors"
                    />
                    <button
                      onClick={addPortfolioVideo}
                      className="px-4 py-3 bg-primary text-background text-sm font-bold rounded-lg flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Adicionar
                    </button>
                  </div>
                  {videoError && (
                    <div className="flex items-center gap-2 text-red-400 text-xs">
                      <AlertCircle className="w-4 h-4" />
                      {videoError}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block w-full space-y-6">
            {/* Card de ações */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-surface border border-border rounded-2xl p-6 sticky top-20"
            >
              {/* Preço */}
              <div className="text-center mb-6">
                <p className="text-muted text-sm mb-1">A partir de</p>
                {editing ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-white text-2xl font-black">R$</span>
                    <input
                      type="number"
                      value={profile.priceFrom}
                      onChange={e => setProfile({ ...profile, priceFrom: parseInt(e.target.value) || 0 })}
                      min="0"
                      step="10"
                      className="w-24 bg-background border border-border rounded-lg px-3 py-2 text-white text-2xl font-black outline-none focus:border-primary transition-colors text-center"
                    />
                  </div>
                ) : (
                  <p className="text-3xl font-black text-white">
                    R$ {profile.priceFrom}
                    <span className="text-lg text-muted font-normal">/serviço</span>
                  </p>
                )}
              </div>

              {/* Botões de ação */}
              <div className="space-y-3 mb-6">
                {/* BOTÃO NOVO: Editar com MediaUploader */}
                <button
                  onClick={() => navigate('/meu-perfil/editar')}
                  className="w-full bg-gradient-to-r from-primary to-purple-500 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                >
                  <Sparkles className="w-5 h-5" />
                  Editar Perfil Completo
                </button>

                <Link to={`/profissional/${user?.id || '1'}`}>
                  <button className="w-full bg-surface border-2 border-primary text-primary font-bold py-3.5 rounded-xl hover:bg-primary/10 transition-colors">
                    Ver Perfil Público
                  </button>
                </Link>
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="w-full bg-primary text-background font-bold py-3.5 rounded-xl hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-5 h-5" />
                    Edição Rápida
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditing(false)}
                      className="flex-1 bg-surface border border-border text-muted font-semibold py-3 rounded-xl hover:text-white transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 bg-primary text-background font-bold py-3 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Salvar
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Estatísticas */}
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-muted">
                  <Clock className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="text-white font-semibold">Tempo de resposta</p>
                    {editing ? (
                      <input
                        type="text"
                        value={profile.responseTime}
                        onChange={e => setProfile({ ...profile, responseTime: e.target.value })}
                        className="w-full bg-background border border-border rounded px-2 py-1 text-white text-xs mt-1 focus:border-primary outline-none"
                      />
                    ) : (
                      <p>{profile.responseTime}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-muted">
                  <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="text-white font-semibold">Trabalhos concluídos</p>
                    {editing ? (
                      <input
                        type="number"
                        value={profile.completedJobs}
                        onChange={e => setProfile({ ...profile, completedJobs: parseInt(e.target.value) || 0 })}
                        className="w-full bg-background border border-border rounded px-2 py-1 text-white text-xs mt-1 focus:border-primary outline-none"
                      />
                    ) : (
                      <p>{profile.completedJobs}+</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Campos adicionais de edição */}
              {editing && (
                <div className="mt-6 pt-6 border-t border-border space-y-4">
                  <div>
                    <label className="block text-xs text-muted mb-1.5">Telefone</label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={e => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="(38) 99999-9999"
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white text-sm focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1.5">Cidade</label>
                    {loadingCities ? (
                      <div className="w-full bg-background border border-border rounded-lg px-3 py-2 flex items-center gap-2 text-muted text-sm">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Carregando...
                      </div>
                    ) : cities.length === 0 ? (
                      <div className="w-full bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-400 text-xs">
                        Nenhuma cidade disponível
                      </div>
                    ) : (
                      <select
                        value={profile.city}
                        onChange={e => setProfile({ ...profile, city: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white text-sm focus:border-primary outline-none"
                      >
                        {cities.map(city => (
                          <option key={city.id} value={city.nome}>
                            {city.nome} - {city.uf}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1.5">Bairro</label>
                    <input
                      type="text"
                      value={profile.neighborhood}
                      onChange={e => setProfile({ ...profile, neighborhood: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white text-sm focus:border-primary outline-none"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
