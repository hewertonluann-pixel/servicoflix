import { useEffect, useRef, useState, useCallback } from 'react'
import {
  collection, query, orderBy, onSnapshot, doc,
  updateDoc, increment, setDoc, deleteDoc, getDoc,
  addDoc, serverTimestamp, limit
} from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Heart, MessageCircle, Share2, X, Send,
  Play, Pause, VolumeX, Volume2, ChevronUp, Loader2,
  Plus, Upload, Video, Image as ImageIcon, CheckCircle2, AlertCircle
} from 'lucide-react'
import { Link } from 'react-router-dom'

interface Reel {
  id: string
  videoUrl: string
  thumbnailUrl?: string
  description: string
  providerId: string
  providerName: string
  providerAvatar: string
  providerUsername?: string
  category: string
  likesCount: number
  commentsCount: number
  createdAt: any
}

interface Comment {
  id: string
  userId: string
  userName: string
  userAvatar: string
  text: string
  createdAt: any
}

// ─── Modal de Upload ──────────────────────────────────────────────────────
const UploadReelModal = ({
  onClose,
  providerData,
}: {
  onClose: () => void
  providerData: any
}) => {
  const { user } = useSimpleAuth()
  const videoInputRef = useRef<HTMLInputElement>(null)
  const thumbInputRef = useRef<HTMLInputElement>(null)

  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [thumbPreview, setThumbPreview] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(providerData?.providerProfile?.categoryId || '')
  const [uploading, setUploading] = useState(false)
  const [videoProgress, setVideoProgress] = useState(0)
  const [thumbProgress, setThumbProgress] = useState(0)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 100 * 1024 * 1024) {
      setError('O video deve ter no maximo 100MB.')
      return
    }
    setError(null)
    setVideoFile(file)
    setVideoPreview(URL.createObjectURL(file))
  }

  const handleThumbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setThumbFile(file)
    setThumbPreview(URL.createObjectURL(file))
  }

  const uploadFile = (file: File, path: string, onProgress: (p: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, path)
      const task = uploadBytesResumable(storageRef, file)
      task.on(
        'state_changed',
        snap => onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        reject,
        async () => resolve(await getDownloadURL(task.snapshot.ref))
      )
    })
  }

  const handleSubmit = async () => {
    if (!videoFile || !description.trim() || !user?.uid) return
    setUploading(true)
    setError(null)
    try {
      const ts = Date.now()
      const videoUrl = await uploadFile(
        videoFile,
        `reels/${user.uid}/${ts}_video`,
        setVideoProgress
      )

      let thumbnailUrl: string | undefined
      if (thumbFile) {
        thumbnailUrl = await uploadFile(
          thumbFile,
          `reels/${user.uid}/${ts}_thumb`,
          setThumbProgress
        )
      }

      const profile = providerData?.providerProfile || {}
      await addDoc(collection(db, 'reels'), {
        videoUrl,
        thumbnailUrl: thumbnailUrl || null,
        description: description.trim(),
        providerId: user.uid,
        providerName: profile.professionalName || providerData?.name || user.displayName || 'Prestador',
        providerAvatar: profile.avatar || profile.photoURL || user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
        providerUsername: profile.username || null,
        category: category || profile.categoryId || 'servicos',
        likesCount: 0,
        commentsCount: 0,
        createdAt: serverTimestamp(),
      })

      setSuccess(true)
      setTimeout(() => onClose(), 2000)
    } catch (err: any) {
      setError('Erro ao enviar o video. Tente novamente.')
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  const canSubmit = videoFile && description.trim().length > 0 && !uploading

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="bg-surface border-t sm:border border-border rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-border px-5 py-4 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/20 rounded-xl flex items-center justify-center">
              <Video className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Postar Reel</h2>
              <p className="text-xs text-muted">Mostre seu trabalho em video</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-background rounded-lg transition-colors">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* Sucesso */}
          {success && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center py-8 text-center"
            >
              <CheckCircle2 className="w-16 h-16 text-green-400 mb-3" />
              <p className="text-white font-bold text-lg">Reel publicado!</p>
              <p className="text-muted text-sm mt-1">Seu video ja esta disponivel na aba Reels.</p>
            </motion.div>
          )}

          {!success && (
            <>
              {/* Upload de video */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Video *</label>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/mov,video/avi,video/webm"
                  className="hidden"
                  onChange={handleVideoChange}
                />
                {videoPreview ? (
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-64">
                    <video
                      src={videoPreview}
                      className="w-full h-full object-cover"
                      controls
                    />
                    <button
                      onClick={() => { setVideoFile(null); setVideoPreview(null) }}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                    {uploading && videoProgress > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-3 py-2">
                        <div className="flex items-center justify-between text-xs text-white mb-1">
                          <span>Enviando video...</span>
                          <span>{videoProgress}%</span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-1.5">
                          <div
                            className="bg-primary h-1.5 rounded-full transition-all"
                            style={{ width: `${videoProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-8 flex flex-col items-center gap-3 transition-colors group"
                  >
                    <div className="w-14 h-14 bg-background group-hover:bg-primary/10 rounded-2xl flex items-center justify-center transition-colors">
                      <Upload className="w-7 h-7 text-muted group-hover:text-primary transition-colors" />
                    </div>
                    <div className="text-center">
                      <p className="text-white font-semibold text-sm">Selecionar video</p>
                      <p className="text-muted text-xs mt-0.5">MP4, MOV, AVI, WebM - max 100MB</p>
                    </div>
                  </button>
                )}
              </div>

              {/* Thumbnail opcional */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Capa (opcional)
                  <span className="text-muted font-normal ml-1">- imagem de destaque do reel</span>
                </label>
                <input
                  ref={thumbInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleThumbChange}
                />
                {thumbPreview ? (
                  <div className="relative w-24 h-32 rounded-xl overflow-hidden bg-black">
                    <img src={thumbPreview} alt="capa" className="w-full h-full object-cover" />
                    <button
                      onClick={() => { setThumbFile(null); setThumbPreview(null) }}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded-full"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => thumbInputRef.current?.click()}
                    className="flex items-center gap-3 px-4 py-3 bg-background border border-border hover:border-primary/40 rounded-xl transition-colors w-full text-left"
                  >
                    <ImageIcon className="w-5 h-5 text-muted" />
                    <span className="text-muted text-sm">Adicionar imagem de capa</span>
                  </button>
                )}
                {uploading && thumbProgress > 0 && thumbProgress < 100 && (
                  <div className="mt-2">
                    <div className="w-full bg-border rounded-full h-1">
                      <div className="bg-primary h-1 rounded-full transition-all" style={{ width: `${thumbProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Descricao */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Descricao *</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Descreva o servico mostrado no video..."
                  maxLength={300}
                  rows={3}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-muted resize-none focus:border-primary/50 transition-colors"
                />
                <div className="flex justify-end mt-1">
                  <span className="text-muted text-xs">{description.length}/300</span>
                </div>
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Categoria</label>
                <input
                  type="text"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  placeholder="ex: musica, limpeza, reformas..."
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-muted focus:border-primary/50 transition-colors"
                />
              </div>

              {/* Erro */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="sticky bottom-0 bg-surface border-t border-border p-4">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full py-3.5 bg-primary text-background font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              {uploading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Publicando...</>
              ) : (
                <><Upload className="w-5 h-5" /> Publicar Reel</>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ─── Componente de cada Reel ───────────────────────────────────────────────
const ReelCard = ({
  reel,
  isActive,
  onOpenComments,
}: {
  reel: Reel
  isActive: boolean
  onOpenComments: (reel: Reel) => void
}) => {
  const { user } = useSimpleAuth()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(reel.likesCount ?? 0)
  const [likeAnim, setLikeAnim] = useState(false)
  const [showPlayIcon, setShowPlayIcon] = useState(false)
  const playIconTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!user?.uid) return
    const likeRef = doc(db, 'reels', reel.id, 'likes', user.uid)
    getDoc(likeRef).then(snap => setLiked(snap.exists()))
  }, [reel.id, user?.uid])

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'reels', reel.id), snap => {
      if (snap.exists()) setLikesCount(snap.data().likesCount ?? 0)
    })
    return () => unsub()
  }, [reel.id])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (isActive) {
      video.play().then(() => setIsPlaying(true)).catch(() => {})
    } else {
      video.pause()
      video.currentTime = 0
      setIsPlaying(false)
    }
  }, [isActive])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {})
    } else {
      video.pause()
      setIsPlaying(false)
    }
    setShowPlayIcon(true)
    if (playIconTimer.current) clearTimeout(playIconTimer.current)
    playIconTimer.current = setTimeout(() => setShowPlayIcon(false), 800)
  }

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user?.uid) return
    const likeRef = doc(db, 'reels', reel.id, 'likes', user.uid)
    const reelRef = doc(db, 'reels', reel.id)
    if (liked) {
      await deleteDoc(likeRef)
      await updateDoc(reelRef, { likesCount: increment(-1) })
      setLiked(false)
    } else {
      await setDoc(likeRef, { userId: user.uid, createdAt: serverTimestamp() })
      await updateDoc(reelRef, { likesCount: increment(1) })
      setLiked(true)
      setLikeAnim(true)
      setTimeout(() => setLikeAnim(false), 600)
    }
  }

  const handleDoubleTap = () => {
    if (!liked && user?.uid) handleLike({ stopPropagation: () => {} } as any)
    togglePlay()
  }

  const formatCount = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none">
      <video
        ref={videoRef}
        src={reel.videoUrl}
        poster={reel.thumbnailUrl}
        loop
        muted={isMuted}
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        onClick={togglePlay}
        onDoubleClick={handleDoubleTap}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

      <AnimatePresence>
        {showPlayIcon && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.3 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="w-20 h-20 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm">
              {isPlaying
                ? <Pause className="w-10 h-10 text-white" />
                : <Play className="w-10 h-10 text-white ml-1" />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {likeAnim && (
          <motion.div
            initial={{ opacity: 1, scale: 0.5, y: 0 }}
            animate={{ opacity: 0, scale: 1.8, y: -80 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <Heart className="w-24 h-24 text-red-500 fill-red-500 drop-shadow-lg" />
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={(e) => { e.stopPropagation(); setIsMuted(m => !m) }}
        className="absolute top-4 right-4 p-2 bg-black/40 rounded-full backdrop-blur-sm z-10"
      >
        {isMuted
          ? <VolumeX className="w-5 h-5 text-white" />
          : <Volume2 className="w-5 h-5 text-white" />}
      </button>

      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-10">
        <button onClick={handleLike} className="flex flex-col items-center gap-1">
          <motion.div
            whileTap={{ scale: 1.3 }}
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              liked ? 'bg-red-500/20' : 'bg-black/40'
            } backdrop-blur-sm border ${
              liked ? 'border-red-500/50' : 'border-white/10'
            }`}
          >
            <Heart className={`w-6 h-6 transition-all ${
              liked ? 'text-red-500 fill-red-500' : 'text-white'
            }`} />
          </motion.div>
          <span className="text-white text-xs font-bold drop-shadow">{formatCount(likesCount)}</span>
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onOpenComments(reel) }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-12 h-12 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-bold drop-shadow">{formatCount(reel.commentsCount ?? 0)}</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation()
            if (navigator.share) {
              navigator.share({ title: reel.providerName, text: reel.description, url: window.location.href })
            }
          }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-12 h-12 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-bold drop-shadow">Compartilhar</span>
        </button>

        <Link
          to={`/profissional/${reel.providerId}`}
          onClick={e => e.stopPropagation()}
          className="relative"
        >
          <img
            src={reel.providerAvatar}
            alt={reel.providerName}
            className="w-12 h-12 rounded-full border-2 border-primary object-cover"
          />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-black">
            <span className="text-white text-[8px] font-black">+</span>
          </div>
        </Link>
      </div>

      <div className="absolute left-4 right-20 bottom-6 z-10">
        <Link
          to={`/profissional/${reel.providerId}`}
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-2 mb-2"
        >
          <span className="text-white font-bold text-sm drop-shadow">@{reel.providerUsername || reel.providerName}</span>
          <span className="text-xs px-2 py-0.5 bg-primary/80 text-white rounded-full">{reel.category}</span>
        </Link>
        <p className="text-white/90 text-sm leading-snug line-clamp-3 drop-shadow">{reel.description}</p>
      </div>
    </div>
  )
}

// ─── Painel de Comentarios ─────────────────────────────────────────────────
const CommentsPanel = ({
  reel,
  onClose,
}: {
  reel: Reel
  onClose: () => void
}) => {
  const { user } = useSimpleAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const q = query(
      collection(db, 'reels', reel.id, 'comments'),
      orderBy('createdAt', 'asc')
    )
    const unsub = onSnapshot(q, snap => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment)))
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    })
    return () => unsub()
  }, [reel.id])

  const sendComment = async () => {
    if (!text.trim() || !user?.uid || sending) return
    setSending(true)
    try {
      await addDoc(collection(db, 'reels', reel.id, 'comments'), {
        userId: user.uid,
        userName: user.displayName || 'Usuario',
        userAvatar: user.photoURL || `https://i.pravatar.cc/40?u=${user.uid}`,
        text: text.trim(),
        createdAt: serverTimestamp(),
      })
      await updateDoc(doc(db, 'reels', reel.id), { commentsCount: increment(1) })
      setText('')
    } finally {
      setSending(false)
    }
  }

  const formatTime = (ts: any) => {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    const diff = Math.floor((Date.now() - d.getTime()) / 1000)
    if (diff < 60) return 'agora'
    if (diff < 3600) return `${Math.floor(diff / 60)}min`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return `${Math.floor(diff / 86400)}d`
  }

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="absolute inset-x-0 bottom-0 z-50 bg-surface rounded-t-3xl flex flex-col"
      style={{ height: '70vh' }}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="text-white font-bold text-base">Comentarios</h3>
        <button onClick={onClose} className="p-1.5 hover:bg-background rounded-lg transition-colors">
          <X className="w-5 h-5 text-muted" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {comments.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-muted">
            <MessageCircle className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">Seja o primeiro a comentar!</p>
          </div>
        )}
        {comments.map(c => (
          <div key={c.id} className="flex gap-3">
            <img src={c.userAvatar} alt={c.userName} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-white text-sm font-semibold">{c.userName}</span>
                <span className="text-muted text-xs">{formatTime(c.createdAt)}</span>
              </div>
              <p className="text-white/80 text-sm mt-0.5 leading-snug">{c.text}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-border pb-safe">
        {user ? (
          <div className="flex items-center gap-3">
            <img
              src={user.photoURL || `https://i.pravatar.cc/40?u=${user.uid}`}
              alt=""
              className="w-9 h-9 rounded-full object-cover flex-shrink-0"
            />
            <div className="flex-1 flex items-center gap-2 bg-background border border-border rounded-2xl px-4 py-2.5">
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendComment()}
                placeholder="Adicione um comentario..."
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-muted"
                maxLength={300}
              />
              <button
                onClick={sendComment}
                disabled={!text.trim() || sending}
                className="text-primary disabled:opacity-40 transition-opacity"
              >
                {sending
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-muted text-sm mb-2">Faca login para comentar</p>
            <Link to="/entrar" className="text-primary text-sm font-semibold">Entrar agora</Link>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Pagina Principal ─────────────────────────────────────────────────────
export const ReelsPage = () => {
  const { user } = useSimpleAuth()
  const [reels, setReels] = useState<Reel[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [commentReel, setCommentReel] = useState<Reel | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [providerData, setProviderData] = useState<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  // Verificar se o usuario logado e prestador
  useEffect(() => {
    if (!user?.uid) return
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (snap.exists()) {
        const data = snap.data()
        const isProvider = data.roles?.includes('provider') &&
          ['approved', 'ativo'].includes(data.providerProfile?.status)
        if (isProvider) setProviderData({ ...data, id: snap.id })
      }
    })
  }, [user?.uid])

  useEffect(() => {
    const q = query(collection(db, 'reels'), orderBy('createdAt', 'desc'), limit(30))
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Reel))
      setReels(data)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (reels.length === 0) return
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = itemRefs.current.findIndex(r => r === entry.target)
            if (idx !== -1) setActiveIndex(idx)
          }
        })
      },
      { threshold: 0.6 }
    )
    itemRefs.current.forEach(ref => ref && observer.observe(ref))
    return () => observer.disconnect()
  }, [reels])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-3" />
          <p className="text-white/60 text-sm">Carregando reels...</p>
        </div>
      </div>
    )
  }

  if (reels.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center px-8">
          <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
            <Play className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-white text-xl font-black mb-2">Nenhum reel ainda</h2>
          <p className="text-white/50 text-sm mb-6">
            Em breve os prestadores vao publicar videos mostrando seus servicos.
          </p>
          {providerData && (
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-background font-bold rounded-2xl mx-auto"
            >
              <Plus className="w-5 h-5" />
              Seja o primeiro a postar
            </button>
          )}
        </div>

        <AnimatePresence>
          {showUpload && (
            <UploadReelModal
              onClose={() => setShowUpload(false)}
              providerData={providerData}
            />
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black z-0">
      {/* Feed vertical com scroll snap */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-y-scroll"
        style={{ scrollSnapType: 'y mandatory', scrollbarWidth: 'none' }}
      >
        {reels.map((reel, idx) => (
          <div
            key={reel.id}
            ref={el => { itemRefs.current[idx] = el }}
            className="relative w-full"
            style={{ height: '100dvh', scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
          >
            <ReelCard
              reel={reel}
              isActive={idx === activeIndex && commentReel === null}
              onOpenComments={setCommentReel}
            />
          </div>
        ))}
      </div>

      {/* Botao publicar reel - visivel apenas para prestadores */}
      {providerData && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setShowUpload(true)}
          className="absolute bottom-24 left-4 z-30 flex items-center gap-2 px-4 py-2.5 bg-primary text-background text-sm font-bold rounded-2xl shadow-lg shadow-primary/40"
        >
          <Plus className="w-5 h-5" />
          Postar
        </motion.button>
      )}

      {activeIndex === 0 && reels.length > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <ChevronUp className="w-6 h-6 text-white/40" />
          </motion.div>
          <span className="text-white/40 text-xs">Deslize para cima</span>
        </motion.div>
      )}

      <AnimatePresence>
        {commentReel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 z-40"
              onClick={() => setCommentReel(null)}
            />
            <CommentsPanel
              reel={commentReel}
              onClose={() => setCommentReel(null)}
            />
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUpload && (
          <UploadReelModal
            onClose={() => setShowUpload(false)}
            providerData={providerData}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
