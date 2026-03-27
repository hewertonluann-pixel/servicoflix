import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Camera, Save, ArrowLeft, Upload, X, Play, Music, Image as ImageIcon,
  Video, Loader2, AlertCircle, CheckCircle, GripVertical, Trash2, Plus,
  Sparkles, FileAudio, Instagram, Facebook, Youtube, MessageCircle, Globe, Link2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'
import { useCities } from '@/hooks/useCities'
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { storage, db } from '@/lib/firebase'
import { YouTubeEmbed, isValidYouTubeUrl } from '@/components/YouTubeEmbed'
import { SocialLinks } from '@/types'

type TabType = 'fotos' | 'videos' | 'audios' | 'dados'

interface MediaItem {
  id: string
  url: string
  type: 'photo' | 'video' | 'audio'
  title?: string
  file?: File
  uploading?: boolean
  progress?: number
}

export const EditProviderProfilePage = () => {
  const { user } = useSimpleAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>('fotos')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploadError, setUploadError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const { cities, loading: loadingCities } = useCities()

  const photoInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const [googleAvatar, setGoogleAvatar] = useState('')

  const [profile, setProfile] = useState({
    name: '',
    professionalName: '',
    specialty: '',
    bio: '',
    city: '',
    neighborhood: '',
    priceFrom: 100,
    skills: [] as string[],
    providerAvatar: '',
    coverImage: '',
    phone: '',
    email: '',
    responseTime: 'Menos de 1 hora',
    completedJobs: 150,
    rating: 4.8,
    reviewCount: 127,
    verified: true,
  })

  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    instagram: '',
    facebook: '',
    youtube: '',
    whatsapp: '',
    tiktok: '',
    linkedin: '',
    website: ''
  })

  // ── Username personalizado ────────────────────────────────────────────────
  const [username, setUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const checkUsername = useCallback(async (value: string) => {
    if (value.length < 3) { setUsernameStatus('idle'); return }
    setUsernameStatus('checking')
    try {
      const q = query(collection(db, 'users'), where('username', '==', value))
      const snap = await getDocs(q)
      const taken = snap.docs.some(d => d.id !== user?.id)
      setUsernameStatus(taken ? 'taken' : 'available')
    } catch {
      setUsernameStatus('idle')
    }
  }, [user?.id])

  const handleUsernameChange = (raw: string) => {
    const value = raw.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setUsername(value)
    setUsernameStatus('idle')
    if (usernameTimer.current) clearTimeout(usernameTimer.current)
    if (value.length >= 3) {
      usernameTimer.current = setTimeout(() => checkUsername(value), 600)
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const [photos, setPhotos] = useState<MediaItem[]>([])
  const [videos, setVideos] = useState<MediaItem[]>([])
  const [audios, setAudios] = useState<MediaItem[]>([])
  const [newVideoUrl, setNewVideoUrl] = useState('')
  const [videoError, setVideoError] = useState('')
  const [newSkill, setNewSkill] = useState('')

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

          setGoogleAvatar(data.avatar || '')
          setUsername(data.username || '')

          setProfile({
            name: data.name || user.name || '',
            professionalName: providerProfile.professionalName || data.name || user.name || '',
            specialty: providerProfile.specialty || '',
            bio: providerProfile.bio || '',
            city: providerProfile.city || '',
            neighborhood: providerProfile.neighborhood || 'Centro',
            priceFrom: providerProfile.priceFrom || 100,
            skills: providerProfile.skills || [],
            providerAvatar: providerProfile.avatar || '',
            coverImage: providerProfile.coverImage || '',
            phone: providerProfile.phone || '',
            email: data.email || user.email || '',
            responseTime: providerProfile.responseTime || 'Menos de 1 hora',
            completedJobs: providerProfile.completedJobs || 150,
            rating: providerProfile.rating || 4.8,
            reviewCount: providerProfile.reviewCount || 127,
            verified: providerProfile.verified !== false,
          })
          setSocialLinks(providerProfile.socialLinks || {
            instagram: '', facebook: '', youtube: '', whatsapp: '', tiktok: '', linkedin: '', website: ''
          })
          const media = providerProfile.media || {}
          setPhotos((media.photos || []).map((url: string, i: number) => ({ id: `photo-${i}`, url, type: 'photo' as const })))
          setVideos((media.videos || []).map((url: string, i: number) => ({ id: `video-${i}`, url, type: 'video' as const })))
          setAudios((media.audios || []).map((url: string, i: number) => ({ id: `audio-${i}`, url, type: 'audio' as const })))
        }
      } catch (error) {
        console.error('Erro ao carregar perfil:', error)
        setUploadError('Erro ao carregar perfil')
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [user])

  useEffect(() => {
    if (!profile.city && cities.length > 0) {
      setProfile(prev => ({ ...prev, city: cities[0].nome }))
    }
  }, [cities, profile.city])

  const uploadFile = async (file: File, path: string, onProgress: (p: number) => void): Promise<string> => {
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length || !user?.id) return
    if (photos.length + files.length > 10) { setUploadError('Máximo de 10 fotos'); return }
    setUploadError('')
    const newPhotos: MediaItem[] = files.map((file, i) => ({ id: `temp-photo-${Date.now()}-${i}`, url: URL.createObjectURL(file), type: 'photo', file, uploading: true, progress: 0 }))
    setPhotos(prev => [...prev, ...newPhotos])
    for (let i = 0; i < newPhotos.length; i++) {
      const item = newPhotos[i]
      if (!item.file) continue
      try {
        const url = await uploadFile(item.file, `portfolio/${user.id}/photos/${Date.now()}_${item.file.name}`, (progress) => { setPhotos(prev => prev.map(p => p.id === item.id ? { ...p, progress } : p)) })
        setPhotos(prev => prev.map(p => p.id === item.id ? { ...p, url, uploading: false, file: undefined } : p))
      } catch (err) {
        setPhotos(prev => prev.filter(p => p.id !== item.id))
        setUploadError('Erro ao fazer upload de uma foto')
      }
    }
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length || !user?.id) return
    if (videos.length + files.length > 5) { setUploadError('Máximo de 5 vídeos'); return }
    setUploadError('')
    const newVideos: MediaItem[] = files.map((file, i) => ({ id: `temp-video-${Date.now()}-${i}`, url: URL.createObjectURL(file), type: 'video', file, uploading: true, progress: 0 }))
    setVideos(prev => [...prev, ...newVideos])
    for (let i = 0; i < newVideos.length; i++) {
      const item = newVideos[i]
      if (!item.file) continue
      try {
        const url = await uploadFile(item.file, `portfolio/${user.id}/videos/${Date.now()}_${item.file.name}`, (progress) => { setVideos(prev => prev.map(v => v.id === item.id ? { ...v, progress } : v)) })
        setVideos(prev => prev.map(v => v.id === item.id ? { ...v, url, uploading: false, file: undefined } : v))
      } catch (err) {
        setVideos(prev => prev.filter(v => v.id !== item.id))
        setUploadError('Erro ao fazer upload de um vídeo')
      }
    }
    if (videoInputRef.current) videoInputRef.current.value = ''
  }

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length || !user?.id) return
    if (audios.length + files.length > 3) { setUploadError('Máximo de 3 áudios'); return }
    setUploadError('')
    const newAudios: MediaItem[] = files.map((file, i) => ({ id: `temp-audio-${Date.now()}-${i}`, url: URL.createObjectURL(file), type: 'audio', title: file.name, file, uploading: true, progress: 0 }))
    setAudios(prev => [...prev, ...newAudios])
    for (let i = 0; i < newAudios.length; i++) {
      const item = newAudios[i]
      if (!item.file) continue
      try {
        const url = await uploadFile(item.file, `portfolio/${user.id}/audios/${Date.now()}_${item.file.name}`, (progress) => { setAudios(prev => prev.map(a => a.id === item.id ? { ...a, progress } : a)) })
        setAudios(prev => prev.map(a => a.id === item.id ? { ...a, url, uploading: false, file: undefined } : a))
      } catch (err) {
        setAudios(prev => prev.filter(a => a.id !== item.id))
        setUploadError('Erro ao fazer upload de um áudio')
      }
    }
    if (audioInputRef.current) audioInputRef.current.value = ''
  }

  const addYouTubeVideo = () => {
    setVideoError('')
    if (!newVideoUrl.trim()) { setVideoError('Digite a URL do vídeo'); return }
    if (!isValidYouTubeUrl(newVideoUrl)) { setVideoError('URL inválida. Use um link do YouTube'); return }
    if (videos.length >= 5) { setVideoError('Máximo de 5 vídeos'); return }
    setVideos(prev => [...prev, { id: `youtube-${Date.now()}`, url: newVideoUrl.trim(), type: 'video' }])
    setNewVideoUrl('')
  }

  const removeItem = (type: 'photo' | 'video' | 'audio', id: string) => {
    if (type === 'photo') setPhotos(prev => prev.filter(p => p.id !== id))
    if (type === 'video') setVideos(prev => prev.filter(v => v.id !== id))
    if (type === 'audio') setAudios(prev => prev.filter(a => a.id !== id))
  }

  const addSkill = () => {
    if (newSkill.trim() && profile.skills.length < 8 && !profile.skills.includes(newSkill.trim())) {
      setProfile(prev => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }))
      setNewSkill('')
    }
  }

  const removeSkill = (index: number) => {
    setProfile(prev => ({ ...prev, skills: prev.skills.filter((_, i) => i !== index) }))
  }

  const handleSave = async () => {
    if (!user?.id) return
    const hasUploading = [...photos, ...videos, ...audios].some(item => item.uploading)
    if (hasUploading) { setUploadError('Aguarde o upload de todos os arquivos'); return }
    if (usernameStatus === 'taken') { setUploadError('O link personalizado escolhido já está em uso'); return }
    setSaving(true)
    setUploadError('')
    setSuccessMessage('')
    try {
      await setDoc(
        doc(db, 'users', user.id),
        {
          name: profile.name,
          username: username.toLowerCase().trim(),
          providerProfile: {
            professionalName: profile.professionalName,
            specialty: profile.specialty,
            bio: profile.bio,
            city: profile.city,
            neighborhood: profile.neighborhood,
            priceFrom: profile.priceFrom,
            skills: profile.skills,
            phone: profile.phone,
            avatar: profile.providerAvatar,
            coverImage: profile.coverImage,
            responseTime: profile.responseTime,
            completedJobs: profile.completedJobs,
            rating: profile.rating,
            reviewCount: profile.reviewCount,
            verified: profile.verified,
            socialLinks: socialLinks,
            media: {
              photos: photos.map(p => p.url),
              videos: videos.map(v => v.url),
              audios: audios.map(a => a.url)
            }
          },
        },
        { merge: true }
      )
      setSuccessMessage('Perfil salvo com sucesso! 🎉')
      setTimeout(() => { navigate('/meu-perfil') }, 1500)
    } catch (err) {
      console.error('Erro ao salvar:', err)
      setUploadError('Erro ao salvar perfil. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return
    if (file.size > 5 * 1024 * 1024) { setUploadError('Avatar deve ter no máximo 5MB'); return }
    try {
      const url = await uploadFile(file, `provider-avatars/${user.id}/${Date.now()}_${file.name}`, () => {})
      setProfile(prev => ({ ...prev, providerAvatar: url }))
    } catch (err) {
      setUploadError('Erro ao fazer upload do avatar')
    }
    if (avatarInputRef.current) avatarInputRef.current.value = ''
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return
    if (file.size > 10 * 1024 * 1024) { setUploadError('Capa deve ter no máximo 10MB'); return }
    try {
      const url = await uploadFile(file, `covers/${user.id}/${Date.now()}_${file.name}`, () => {})
      setProfile(prev => ({ ...prev, coverImage: url }))
    } catch (err) {
      setUploadError('Erro ao fazer upload da capa')
    }
    if (coverInputRef.current) coverInputRef.current.value = ''
  }

  const avatarPreview = profile.providerAvatar || googleAvatar
  const usingGooglePhoto = !profile.providerAvatar && !!googleAvatar

  if (loading) {
    return (
      <div className="min-h-screen pt-16 pb-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  const tabs = [
    { id: 'fotos' as TabType, label: 'Fotos', icon: ImageIcon, count: photos.length },
    { id: 'videos' as TabType, label: 'Vídeos', icon: Video, count: videos.length },
    { id: 'audios' as TabType, label: 'Áudios', icon: FileAudio, count: audios.length },
    { id: 'dados' as TabType, label: 'Dados', icon: Camera, count: 0 },
  ]

  return (
    <div className="min-h-screen pt-16 pb-20 bg-background">
      <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
      <input ref={videoInputRef} type="file" accept="video/*" multiple className="hidden" onChange={handleVideoUpload} />
      <input ref={audioInputRef} type="file" accept="audio/*" multiple className="hidden" onChange={handleAudioUpload} />
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
      <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />

      <div className="bg-surface border-b border-border sticky top-16 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/meu-perfil')} className="p-2 hover:bg-background rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-muted" />
              </button>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Portfólio Multimídia
                </h1>
                <p className="text-xs text-muted">Adicione fotos, vídeos e áudios</p>
              </div>
            </div>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-primary text-background font-bold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm">
              {saving ? (<><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>) : (<><Save className="w-4 h-4" />Salvar</>)}
            </button>
          </div>
          <div className="flex gap-1 overflow-x-auto hide-scrollbar">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${ activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-white' }`}>
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count > 0 && (<span className="bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded-full">{tab.count}</span>)}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        {uploadError && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2 text-red-400 text-sm mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />{uploadError}
            <button onClick={() => setUploadError('')} className="ml-auto text-lg">×</button>
          </motion.div>
        )}
        {successMessage && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center gap-2 text-green-400 text-sm mb-4">
            <CheckCircle className="w-4 h-4 shrink-0" />{successMessage}
          </motion.div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <AnimatePresence mode="wait">
          {activeTab === 'fotos' && (
            <motion.div key="fotos" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="bg-surface border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div><h2 className="text-lg font-bold text-white">Galeria de Fotos</h2><p className="text-sm text-muted">Até 10 fotos do seu trabalho</p></div>
                  <button onClick={() => photoInputRef.current?.click()} disabled={photos.length >= 10} className="flex items-center gap-2 px-4 py-2 bg-primary text-background font-bold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm"><Plus className="w-4 h-4" />Adicionar</button>
                </div>
                {photos.length === 0 ? (
                  <div className="border-2 border-dashed border-border rounded-xl p-12 text-center"><ImageIcon className="w-12 h-12 text-muted mx-auto mb-4" /><p className="text-muted mb-4">Nenhuma foto adicionada</p><button onClick={() => photoInputRef.current?.click()} className="px-4 py-2 bg-primary text-background font-bold rounded-lg hover:bg-primary-dark transition-colors text-sm">Adicionar Fotos</button></div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {photos.map(photo => (
                      <div key={photo.id} className="relative group aspect-square">
                        <img src={photo.url} alt="Portfolio" className={`w-full h-full object-cover rounded-lg ${ photo.uploading ? 'opacity-50' : '' }`} />
                        {photo.uploading && (<div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-lg"><Loader2 className="w-6 h-6 text-white animate-spin mb-2" /><span className="text-white text-sm">{photo.progress}%</span></div>)}
                        {!photo.uploading && (<button onClick={() => removeItem('photo', photo.id)} className="absolute top-2 right-2 w-8 h-8 bg-red-500/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"><X className="w-4 h-4 text-white" /></button>)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'videos' && (
            <motion.div key="videos" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="bg-surface border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div><h2 className="text-lg font-bold text-white">Vídeos</h2><p className="text-sm text-muted">Até 5 vídeos (arquivos ou YouTube)</p></div>
                  <button onClick={() => videoInputRef.current?.click()} disabled={videos.length >= 5} className="flex items-center gap-2 px-4 py-2 bg-surface border border-primary text-primary font-bold rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-50 text-sm"><Upload className="w-4 h-4" />Arquivo</button>
                </div>
                {videos.length < 5 && (
                  <div className="mb-6">
                    <label className="block text-sm text-muted mb-2">Ou adicione um vídeo do YouTube:</label>
                    <div className="flex gap-2">
                      <input type="url" value={newVideoUrl} onChange={e => { setNewVideoUrl(e.target.value); setVideoError('') }} onKeyPress={e => e.key === 'Enter' && addYouTubeVideo()} placeholder="https://www.youtube.com/watch?v=..." className="flex-1 bg-background border border-border rounded-lg px-4 py-3 text-white text-sm focus:border-primary outline-none transition-colors" />
                      <button onClick={addYouTubeVideo} className="px-4 py-3 bg-primary text-background text-sm font-bold rounded-lg flex items-center gap-2 hover:bg-primary-dark transition-colors"><Plus className="w-4 h-4" />Adicionar</button>
                    </div>
                    {videoError && (<p className="text-red-400 text-xs mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{videoError}</p>)}
                  </div>
                )}
                {videos.length === 0 ? (
                  <div className="border-2 border-dashed border-border rounded-xl p-12 text-center"><Video className="w-12 h-12 text-muted mx-auto mb-4" /><p className="text-muted mb-4">Nenhum vídeo adicionado</p></div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {videos.map(video => (
                      <div key={video.id} className="relative group">
                        {isValidYouTubeUrl(video.url) ? (<YouTubeEmbed videoUrl={video.url} title="Vídeo" showThumbnail />) : (
                          <div className="aspect-video bg-background rounded-lg overflow-hidden">
                            {video.uploading ? (<div className="w-full h-full flex flex-col items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin mb-2" /><span className="text-white text-sm">{video.progress}%</span></div>) : (<video src={video.url} controls className="w-full h-full object-cover" />)}
                          </div>
                        )}
                        {!video.uploading && (<button onClick={() => removeItem('video', video.id)} className="absolute top-2 right-2 w-8 h-8 bg-red-500/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"><X className="w-4 h-4 text-white" /></button>)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'audios' && (
            <motion.div key="audios" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="bg-surface border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div><h2 className="text-lg font-bold text-white">Áudios</h2><p className="text-sm text-muted">Até 3 arquivos de áudio</p></div>
                  <button onClick={() => audioInputRef.current?.click()} disabled={audios.length >= 3} className="flex items-center gap-2 px-4 py-2 bg-primary text-background font-bold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm"><Plus className="w-4 h-4" />Adicionar</button>
                </div>
                {audios.length === 0 ? (
                  <div className="border-2 border-dashed border-border rounded-xl p-12 text-center"><FileAudio className="w-12 h-12 text-muted mx-auto mb-4" /><p className="text-muted mb-4">Nenhum áudio adicionado</p><button onClick={() => audioInputRef.current?.click()} className="px-4 py-2 bg-primary text-background font-bold rounded-lg hover:bg-primary-dark transition-colors text-sm">Adicionar Áudios</button></div>
                ) : (
                  <div className="space-y-3">
                    {audios.map(audio => (
                      <div key={audio.id} className="bg-background border border-border rounded-lg p-4 flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center shrink-0"><Music className="w-5 h-5 text-primary" /></div>
                        <div className="flex-1 min-w-0">
                          {audio.uploading ? (<div><p className="text-white text-sm mb-1">Enviando...</p><div className="w-full bg-background-dark rounded-full h-2"><div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${audio.progress}%` }} /></div></div>) : (<audio src={audio.url} controls className="w-full" />)}
                        </div>
                        {!audio.uploading && (<button onClick={() => removeItem('audio', audio.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'dados' && (
            <motion.div key="dados" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="bg-surface border border-border rounded-xl p-6">
                <h2 className="text-lg font-bold text-white mb-1">Imagens do Perfil Profissional</h2>
                <p className="text-xs text-muted mb-4 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                  💡 A foto aqui é exclusiva do seu <strong className="text-primary">perfil de prestador</strong>. Sua foto de conta pessoal (Google) permanece inalterada.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-muted mb-2">Foto do Prestador</label>
                    <div className="relative w-32 h-32">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar do Prestador" className="w-full h-full rounded-xl object-cover border-4 border-background" />
                      ) : (
                        <div className="w-full h-full rounded-xl border-4 border-background bg-primary/20 flex items-center justify-center">
                          <Camera className="w-10 h-10 text-primary/60" />
                        </div>
                      )}
                      <button onClick={() => avatarInputRef.current?.click()} className="absolute bottom-0 right-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center hover:bg-primary-dark transition-colors">
                        <Camera className="w-5 h-5 text-background" />
                      </button>
                    </div>
                    {usingGooglePhoto && (
                      <p className="mt-2 text-xs text-primary/70 flex items-center gap-1">👤 Usando foto do Google — clique na câmera para trocar</p>
                    )}
                    {profile.providerAvatar && (
                      <button onClick={() => setProfile(prev => ({ ...prev, providerAvatar: '' }))} className="mt-2 text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1">
                        <X className="w-3 h-3" /> Remover foto personalizada
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-muted mb-2">Capa</label>
                    <div className="relative w-full aspect-video">
                      <img src={profile.coverImage || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80'} alt="Capa" className="w-full h-full rounded-xl object-cover" />
                      <button onClick={() => coverInputRef.current?.click()} className="absolute bottom-2 right-2 px-3 py-2 bg-black/60 backdrop-blur-sm text-white rounded-lg flex items-center gap-2 text-sm hover:bg-black/80 transition-colors">
                        <Camera className="w-4 h-4" />Alterar
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-surface border border-border rounded-xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Dados Básicos</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-muted mb-2">Nome</label>
                    <input type="text" value={profile.name} onChange={e => setProfile(prev => ({ ...prev, name: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white focus:border-primary outline-none transition-colors" placeholder="Seu nome" />
                  </div>

                  <div>
                    <label className="block text-sm text-muted mb-2">Nome profissional (como prestador)</label>
                    <input type="text" value={profile.professionalName} onChange={e => setProfile(prev => ({ ...prev, professionalName: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white focus:border-primary outline-none transition-colors" placeholder="Ex: Carol Fotografia, DJ Silva..." />
                    <p className="text-xs text-muted mt-1">Exibido nos cards e no seu perfil público</p>
                  </div>

                  {/* ── Link personalizado ── */}
                  <div>
                    <label className="block text-sm text-muted mb-2 flex items-center gap-2">
                      <Link2 className="w-4 h-4" />
                      Link personalizado do perfil
                    </label>
                    <div className={`flex items-center bg-background border rounded-lg overflow-hidden transition-colors ${
                      usernameStatus === 'available' ? 'border-green-500' :
                      usernameStatus === 'taken'     ? 'border-red-500' :
                      'border-border focus-within:border-primary'
                    }`}>
                      <span className="px-3 py-3 text-muted text-sm border-r border-border bg-surface whitespace-nowrap select-none">
                        servicoflix.com/
                      </span>
                      <input
                        type="text"
                        value={username}
                        onChange={e => handleUsernameChange(e.target.value)}
                        className="flex-1 bg-transparent px-3 py-3 text-white outline-none text-sm"
                        placeholder="seunome"
                        maxLength={30}
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <div className="pr-3">
                        {usernameStatus === 'checking'  && <Loader2 className="w-4 h-4 text-muted animate-spin" />}
                        {usernameStatus === 'available' && <CheckCircle className="w-4 h-4 text-green-400" />}
                        {usernameStatus === 'taken'     && <AlertCircle className="w-4 h-4 text-red-400" />}
                      </div>
                    </div>
                    {usernameStatus === 'available' && (
                      <p className="text-green-400 text-xs mt-1.5 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Disponível! Seu link será: <span className="font-mono font-bold">servicoflix.com/{username}</span>
                      </p>
                    )}
                    {usernameStatus === 'taken' && (
                      <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Este link já está em uso, tente outro
                      </p>
                    )}
                    {usernameStatus === 'idle' && username.length > 0 && username.length < 3 && (
                      <p className="text-muted text-xs mt-1.5">Mínimo de 3 caracteres</p>
                    )}
                    <p className="text-muted text-xs mt-1">Apenas letras minúsculas, números e hífens. Ex: <span className="font-mono">carolbrito</span>, <span className="font-mono">dj-silva</span></p>
                  </div>

                  <div>
                    <label className="block text-sm text-muted mb-2">Especialidade</label>
                    <input type="text" value={profile.specialty} onChange={e => setProfile(prev => ({ ...prev, specialty: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white focus:border-primary outline-none transition-colors" placeholder="Ex: Músico, Eletricista, Designer" />
                  </div>
                  <div>
                    <label className="block text-sm text-muted mb-2">Sobre você</label>
                    <textarea value={profile.bio} onChange={e => setProfile(prev => ({ ...prev, bio: e.target.value }))} rows={5} maxLength={500} className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white focus:border-primary outline-none transition-colors resize-none" placeholder="Conte sobre sua experiência profissional..." />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-muted mb-2">Cidade *</label>
                      {loadingCities ? (<div className="w-full bg-background border border-border rounded-lg px-4 py-3 flex items-center gap-2 text-muted"><Loader2 className="w-4 h-4 animate-spin" />Carregando cidades...</div>) : cities.length === 0 ? (<div className="w-full bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">Nenhuma cidade disponível. Contate o administrador.</div>) : (
                        <select value={profile.city} onChange={e => setProfile(prev => ({ ...prev, city: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white focus:border-primary outline-none transition-colors">
                          {cities.map(city => (<option key={city.id} value={city.nome}>{city.nome} - {city.uf}</option>))}
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm text-muted mb-2">Bairro</label>
                      <input type="text" value={profile.neighborhood} onChange={e => setProfile(prev => ({ ...prev, neighborhood: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white focus:border-primary outline-none transition-colors" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-muted mb-2">Telefone</label>
                    <input type="tel" value={profile.phone} onChange={e => setProfile(prev => ({ ...prev, phone: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white focus:border-primary outline-none transition-colors" placeholder="(38) 99999-9999" />
                  </div>
                  <div>
                    <label className="block text-sm text-muted mb-2">Preço inicial (R$)</label>
                    <input type="number" value={profile.priceFrom} onChange={e => setProfile(prev => ({ ...prev, priceFrom: parseInt(e.target.value) || 0 }))} min="0" step="10" className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white focus:border-primary outline-none transition-colors" />
                  </div>
                </div>
              </div>

              <div className="bg-surface border border-border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4"><Globe className="w-5 h-5 text-primary" /><h2 className="text-lg font-bold text-white">Redes Sociais</h2></div>
                <div className="space-y-4">
                  <div><label className="block text-sm text-muted mb-2 flex items-center gap-2"><Instagram className="w-4 h-4" />Instagram</label><input type="text" value={socialLinks.instagram || ''} onChange={e => setSocialLinks(prev => ({ ...prev, instagram: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white focus:border-primary outline-none transition-colors" placeholder="@seuusuario ou link completo" /></div>
                  <div><label className="block text-sm text-muted mb-2 flex items-center gap-2"><Facebook className="w-4 h-4" />Facebook</label><input type="text" value={socialLinks.facebook || ''} onChange={e => setSocialLinks(prev => ({ ...prev, facebook: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white focus:border-primary outline-none transition-colors" placeholder="Link do seu perfil" /></div>
                  <div><label className="block text-sm text-muted mb-2 flex items-center gap-2"><Youtube className="w-4 h-4" />YouTube</label><input type="text" value={socialLinks.youtube || ''} onChange={e => setSocialLinks(prev => ({ ...prev, youtube: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white focus:border-primary outline-none transition-colors" placeholder="Link do seu canal" /></div>
                  <div><label className="block text-sm text-muted mb-2 flex items-center gap-2"><MessageCircle className="w-4 h-4" />WhatsApp</label><input type="tel" value={socialLinks.whatsapp || ''} onChange={e => setSocialLinks(prev => ({ ...prev, whatsapp: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white focus:border-primary outline-none transition-colors" placeholder="(38) 99999-9999" /></div>
                  <div><label className="block text-sm text-muted mb-2">TikTok</label><input type="text" value={socialLinks.tiktok || ''} onChange={e => setSocialLinks(prev => ({ ...prev, tiktok: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white focus:border-primary outline-none transition-colors" placeholder="@seuusuario ou link completo" /></div>
                  <div><label className="block text-sm text-muted mb-2">LinkedIn</label><input type="text" value={socialLinks.linkedin || ''} onChange={e => setSocialLinks(prev => ({ ...prev, linkedin: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white focus:border-primary outline-none transition-colors" placeholder="Link do seu perfil" /></div>
                  <div><label className="block text-sm text-muted mb-2 flex items-center gap-2"><Globe className="w-4 h-4" />Site / Portfólio</label><input type="url" value={socialLinks.website || ''} onChange={e => setSocialLinks(prev => ({ ...prev, website: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white focus:border-primary outline-none transition-colors" placeholder="https://seusite.com.br" /></div>
                </div>
              </div>

              <div className="bg-surface border border-border rounded-xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Habilidades</h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  {profile.skills.map((skill, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-full text-sm text-white">
                      {skill}
                      <button onClick={() => removeSkill(i)} className="text-muted hover:text-red-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
                {profile.skills.length < 8 && (
                  <div className="flex gap-2">
                    <input type="text" value={newSkill} onChange={e => setNewSkill(e.target.value)} onKeyPress={e => e.key === 'Enter' && addSkill()} placeholder="Nova habilidade" className="flex-1 bg-background border border-border rounded-lg px-4 py-3 text-white focus:border-primary outline-none transition-colors" />
                    <button onClick={addSkill} disabled={!newSkill.trim()} className="px-4 py-3 bg-primary text-background font-bold rounded-lg disabled:opacity-50 hover:bg-primary-dark transition-colors"><Plus className="w-5 h-5" /></button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
