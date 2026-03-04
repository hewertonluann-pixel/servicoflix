import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Camera, Save, User, MapPin, DollarSign, Briefcase, Star, Edit2, Video, Trash2, Plus, AlertCircle, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'
import { YouTubeEmbed, isValidYouTubeUrl } from '@/components/YouTubeEmbed'
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { storage, db } from '@/lib/firebase'

export const ProviderDashboardPage = () => {
  const { user, firebaseUser } = useSimpleAuth()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState({
    name: user?.name || 'Seu Nome',
    specialty: (user?.providerProfile as any)?.specialty || 'Sua Especialidade',
    bio: (user?.providerProfile as any)?.bio || 'Conte um pouco sobre você...',
    city: (user?.providerProfile as any)?.city || 'Sua Cidade',
    neighborhood: (user?.providerProfile as any)?.neighborhood || 'Seu Bairro',
    priceFrom: (user?.providerProfile as any)?.priceFrom || 100,
    skills: (user?.providerProfile as any)?.skills || ['Habilidade 1'],
    avatar: user?.avatar || `https://i.pravatar.cc/150?u=${user?.id}`,
    coverImage: (user?.providerProfile as any)?.coverImage || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80',
    phone: (user?.providerProfile as any)?.phone || '',
    email: user?.email || '',
    videos: {
      presentation: (user?.providerProfile as any)?.videos?.presentation || '',
      portfolio: (user?.providerProfile as any)?.videos?.portfolio || [] as string[],
    },
  })

  const [newSkill, setNewSkill] = useState('')
  const [newVideoUrl, setNewVideoUrl] = useState('')
  const [videoError, setVideoError] = useState('')

  // ─── UPLOAD GENÉRICO ────────────────────────────────────────────────────────
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

  // ─── UPLOAD AVATAR ──────────────────────────────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return
    if (file.size > 5 * 1024 * 1024) { setUploadError('Imagem deve ter no máximo 5MB'); return }

    setUploadError('')
    setUploadingAvatar(true)
    try {
      const url = await uploadImage(
        file,
        `avatars/${user.id}/${Date.now()}_${file.name}`,
        p => setUploadProgress(p)
      )
      setProfile(prev => ({ ...prev, avatar: url }))
      // Salva imediatamente no Firestore
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

  // ─── UPLOAD CAPA ────────────────────────────────────────────────────────────
  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return
    if (file.size > 10 * 1024 * 1024) { setUploadError('Imagem deve ter no máximo 10MB'); return }

    setUploadError('')
    setUploadingCover(true)
    try {
      const url = await uploadImage(
        file,
        `covers/${user.id}/${Date.now()}_${file.name}`,
        p => setUploadProgress(p)
      )
      setProfile(prev => ({ ...prev, coverImage: url }))
      // Salva imediatamente no Firestore
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

  // ─── SALVAR PERFIL ──────────────────────────────────────────────────────────
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
    if (!newVideoUrl.trim()) { setVideoError('Digite a URL do vídeo'); return }
    if (!isValidYouTubeUrl(newVideoUrl)) { setVideoError('URL inválida. Use um link do YouTube'); return }
    if (profile.videos.portfolio.length >= 5) { setVideoError('Máximo de 5 vídeos no portfólio'); return }
    setProfile({ ...profile, videos: { ...profile.videos, portfolio: [...profile.videos.portfolio, newVideoUrl.trim()] } })
    setNewVideoUrl('')
  }

  const removePortfolioVideo = (index: number) => {
    setProfile({ ...profile, videos: { ...profile.videos, portfolio: profile.videos.portfolio.filter((_, i) => i !== index) } })
  }

  return (
    <div className="min-h-screen pt-16 pb-20">
      {/* inputs ocultos para upload */}
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
      <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />

      {/* Header com cover */}
      <div className="relative h-48 sm:h-64 bg-gradient-to-r from-surface to-surface-hover">
        <img src={profile.coverImage} alt="Cover" className="w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />

        {/* Botão trocar capa */}
        <button
          onClick={() => coverInputRef.current?.click()}
          disabled={uploadingCover}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-black/60 backdrop-blur-sm text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg flex items-center gap-2 text-xs sm:text-sm hover:bg-black/80 transition-colors touch-target disabled:opacity-60"
        >
          {uploadingCover
            ? <><Loader2 className="w-4 h-4 animate-spin" /> {uploadProgress}%</>
            : <><Camera className="w-4 h-4" /> <span>Trocar Capa</span></>}
        </button>

        <div className="absolute -bottom-12 sm:-bottom-16 left-4 sm:left-8">
          <div className="relative">
            <img
              src={profile.avatar}
              alt={profile.name}
              className={`w-24 h-24 sm:w-32 sm:h-32 rounded-xl sm:rounded-2xl border-4 border-background object-cover transition-opacity ${
                uploadingAvatar ? 'opacity-50' : ''
              }`}
            />
            {/* Botão trocar avatar — sempre visível */}
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-full flex items-center justify-center hover:bg-primary-dark transition-colors touch-target disabled:opacity-60"
              title="Trocar foto de perfil"
            >
              {uploadingAvatar
                ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-background animate-spin" />
                : <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-background" />}
            </button>
          </div>
        </div>
      </div>

      {/* Erro de upload */}
      {uploadError && (
        <div className="max-w-5xl mx-auto px-4 sm:px-8 mt-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />{uploadError}
            <button onClick={() => setUploadError('')} className="ml-auto text-lg leading-none">×</button>
          </div>
        </div>
      )}

      {/* Conteúdo */}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 mt-16 sm:mt-20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white mb-1">Meu Perfil</h1>
            <p className="text-muted text-xs sm:text-sm">Gerencie suas informações e preferências</p>
          </div>
          <div className="flex flex-col xs:flex-row gap-2 sm:gap-3">
            <Link to={`/profissional/${user?.id || '1'}`} className="flex-1 xs:flex-initial">
              <button className="w-full xs:w-auto flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-surface border border-border rounded-lg text-white text-sm font-semibold hover:border-primary transition-colors touch-target">
                Ver Perfil Público
              </button>
            </Link>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-primary text-background rounded-lg text-sm font-bold hover:bg-primary-dark transition-colors touch-target"
              >
                <Edit2 className="w-4 h-4" /> Editar Perfil
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="flex-1 xs:flex-initial px-4 py-2.5 sm:py-2 bg-surface border border-border rounded-lg text-muted text-sm font-semibold hover:text-white transition-colors touch-target">
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving} className="flex-1 xs:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-primary text-background rounded-lg text-sm font-bold hover:bg-primary-dark transition-colors disabled:opacity-50 touch-target">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4" /> Salvar</>}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6">
          {/* Informações Básicas */}
          <motion.div className="bg-surface border border-border rounded-xl p-4 sm:p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 mb-4"><User className="w-5 h-5 text-primary" /><h2 className="text-base sm:text-lg font-bold text-white">Informações Básicas</h2></div>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm text-muted mb-1.5">Nome Completo</label>
                <input type="text" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} disabled={!editing} className="w-full bg-background border border-border rounded-lg px-3 sm:px-4 py-3 text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed focus:border-primary outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-muted mb-1.5">Especialidade Principal</label>
                <input type="text" value={profile.specialty} onChange={e => setProfile({ ...profile, specialty: e.target.value })} disabled={!editing} className="w-full bg-background border border-border rounded-lg px-3 sm:px-4 py-3 text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed focus:border-primary outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-muted mb-1.5">Telefone / WhatsApp</label>
                <input type="tel" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} disabled={!editing} placeholder="(38) 99999-9999" className="w-full bg-background border border-border rounded-lg px-3 sm:px-4 py-3 text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed focus:border-primary outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-muted mb-1.5">E-mail</label>
                <input type="email" value={profile.email} disabled className="w-full bg-background border border-border rounded-lg px-3 sm:px-4 py-3 text-muted text-sm opacity-60 cursor-not-allowed" />
                <p className="text-[10px] text-muted mt-1">O e-mail não pode ser alterado</p>
              </div>
            </div>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
            <motion.div className="bg-surface border border-border rounded-xl p-4 sm:p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="flex items-center gap-2 mb-4"><MapPin className="w-5 h-5 text-primary" /><h2 className="text-base sm:text-lg font-bold text-white">Localização</h2></div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs sm:text-sm text-muted mb-1.5">Cidade</label>
                  <input type="text" value={profile.city} onChange={e => setProfile({ ...profile, city: e.target.value })} disabled={!editing} className="w-full bg-background border border-border rounded-lg px-3 sm:px-4 py-3 text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed focus:border-primary outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm text-muted mb-1.5">Bairro de Atuação</label>
                  <input type="text" value={profile.neighborhood} onChange={e => setProfile({ ...profile, neighborhood: e.target.value })} disabled={!editing} className="w-full bg-background border border-border rounded-lg px-3 sm:px-4 py-3 text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed focus:border-primary outline-none transition-colors" />
                </div>
              </div>
            </motion.div>

            <motion.div className="bg-surface border border-border rounded-xl p-4 sm:p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="flex items-center gap-2 mb-4"><DollarSign className="w-5 h-5 text-primary" /><h2 className="text-base sm:text-lg font-bold text-white">Preço Base</h2></div>
              <div>
                <label className="block text-xs sm:text-sm text-muted mb-1.5">Valor mínimo por serviço</label>
                <div className="flex items-center gap-2">
                  <span className="text-muted">R$</span>
                  <input type="number" value={profile.priceFrom} onChange={e => setProfile({ ...profile, priceFrom: parseInt(e.target.value) || 0 })} disabled={!editing} min="0" step="10" className="flex-1 bg-background border border-border rounded-lg px-3 sm:px-4 py-3 text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed focus:border-primary outline-none transition-colors" />
                </div>
                <p className="text-[10px] text-muted mt-1">Este é o valor inicial que aparecerá no seu perfil</p>
              </div>
            </motion.div>
          </div>

          {/* Especialidades */}
          <motion.div className="bg-surface border border-border rounded-xl p-4 sm:p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="flex items-center gap-2 mb-4"><Briefcase className="w-5 h-5 text-primary" /><h2 className="text-base sm:text-lg font-bold text-white">Especialidades</h2></div>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-background border border-border text-xs sm:text-sm text-white px-3 py-2 rounded-full">
                    <Star className="w-3 h-3 text-primary" />{skill}
                    {editing && (<button onClick={() => removeSkill(i)} className="ml-1 text-muted hover:text-red-400 transition-colors text-lg leading-none">×</button>)}
                  </div>
                ))}
              </div>
              {editing && (
                <div className="flex gap-2">
                  <input type="text" value={newSkill} onChange={e => setNewSkill(e.target.value)} onKeyPress={e => e.key === 'Enter' && addSkill()} placeholder="Nova especialidade" className="flex-1 bg-background border border-border rounded-lg px-3 sm:px-4 py-3 text-white text-sm focus:border-primary outline-none transition-colors" />
                  <button onClick={addSkill} disabled={!newSkill.trim() || profile.skills.length >= 8} className="px-4 py-3 bg-primary text-background text-sm font-bold rounded-lg disabled:opacity-50">Adicionar</button>
                </div>
              )}
              <p className="text-[10px] text-muted">Máximo de 8 especialidades ({profile.skills.length}/8)</p>
            </div>
          </motion.div>

          {/* Bio */}
          <motion.div className="bg-surface border border-border rounded-xl p-4 sm:p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <div className="flex items-center gap-2 mb-4"><Edit2 className="w-5 h-5 text-primary" /><h2 className="text-base sm:text-lg font-bold text-white">Sobre Você</h2></div>
            <textarea value={profile.bio} onChange={e => setProfile({ ...profile, bio: e.target.value })} disabled={!editing} rows={5} maxLength={500} placeholder="Conte sobre sua experiência..." className="w-full bg-background border border-border rounded-lg px-3 sm:px-4 py-3 text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed focus:border-primary outline-none transition-colors resize-none" />
            <div className="flex justify-between mt-2">
              <p className="text-[10px] text-muted">Esta descrição aparece no seu perfil público</p>
              <p className="text-[10px] text-muted">{profile.bio.length}/500</p>
            </div>
          </motion.div>

          {/* Vídeos */}
          <motion.div className="bg-surface border border-border rounded-xl p-4 sm:p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <div className="flex items-center gap-2 mb-4"><Video className="w-5 h-5 text-primary" /><h2 className="text-base sm:text-lg font-bold text-white">Vídeos</h2></div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Vídeo de Apresentação</label>
                <p className="text-xs text-muted mb-3">Grave um vídeo se apresentando e cole o link do YouTube</p>
                {editing ? (
                  <input type="url" value={profile.videos.presentation} onChange={e => setProfile({ ...profile, videos: { ...profile.videos, presentation: e.target.value } })} placeholder="https://www.youtube.com/watch?v=..." className="w-full bg-background border border-border rounded-lg px-3 sm:px-4 py-3 text-white text-sm focus:border-primary outline-none transition-colors" />
                ) : profile.videos.presentation ? (
                  <YouTubeEmbed videoUrl={profile.videos.presentation} title="Vídeo de Apresentação" />
                ) : (
                  <div className="aspect-video w-full bg-background border border-dashed border-border rounded-xl flex items-center justify-center">
                    <p className="text-muted text-xs">Nenhum vídeo adicionado</p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Portfólio de Serviços</label>
                <p className="text-xs text-muted mb-3">Adicione até 5 vídeos mostrando seus trabalhos</p>
                {profile.videos.portfolio.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {profile.videos.portfolio.map((url, i) => (
                      <div key={i} className="relative group">
                        <YouTubeEmbed videoUrl={url} title={`Trabalho ${i + 1}`} showThumbnail />
                        {editing && (
                          <button onClick={() => removePortfolioVideo(i)} className="absolute top-2 right-2 w-9 h-9 bg-red-500/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600">
                            <Trash2 className="w-4 h-4 text-white" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {editing && profile.videos.portfolio.length < 5 && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input type="url" value={newVideoUrl} onChange={e => { setNewVideoUrl(e.target.value); setVideoError('') }} onKeyPress={e => e.key === 'Enter' && addPortfolioVideo()} placeholder="https://www.youtube.com/watch?v=..." className="flex-1 bg-background border border-border rounded-lg px-3 sm:px-4 py-3 text-white text-sm focus:border-primary outline-none transition-colors" />
                      <button onClick={addPortfolioVideo} className="px-4 py-3 bg-primary text-background text-sm font-bold rounded-lg flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Adicionar
                      </button>
                    </div>
                    {videoError && (<div className="flex items-center gap-2 text-red-400 text-xs"><AlertCircle className="w-4 h-4" />{videoError}</div>)}
                    <p className="text-[10px] text-muted">Cole o link do YouTube ({profile.videos.portfolio.length}/5)</p>
                  </div>
                )}
                {!editing && profile.videos.portfolio.length === 0 && (
                  <div className="aspect-video w-full bg-background border border-dashed border-border rounded-xl flex items-center justify-center">
                    <p className="text-muted text-xs">Nenhum vídeo no portfólio</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
