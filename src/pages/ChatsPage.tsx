import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'
import { motion } from 'framer-motion'
import { MessageCircle, Loader2, ArrowLeft } from 'lucide-react'
import { ChatMeta } from '@/lib/chatUtils'

const formatRelative = (timestamp: any): string => {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `${diffMin}min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export const ChatsPage = () => {
  const { user } = useSimpleAuth()
  const navigate = useNavigate()
  const [chats, setChats] = useState<ChatMeta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.id),
      orderBy('lastMessageAt', 'desc')
    )

    const unsub = onSnapshot(q, (snap) => {
      const list: ChatMeta[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ChatMeta, 'id'>),
      }))
      setChats(list)
      setLoading(false)
    }, (err) => {
      console.error('[ChatsPage]', err)
      setLoading(false)
    })

    return () => unsub()
  }, [user?.id])

  if (!user) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <p className="text-muted">Faça login para ver suas mensagens.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-16 pb-20 bg-background">
      {/* Header */}
      <div className="bg-surface border-b border-border sticky top-16 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-background rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-muted" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              Mensagens
            </h1>
            <p className="text-xs text-muted">{chats.length} conversa{chats.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center">
              <MessageCircle className="w-10 h-10 text-muted" />
            </div>
            <p className="text-white font-semibold text-lg">Nenhuma conversa ainda</p>
            <p className="text-muted text-sm max-w-xs">Quando você entrar em contato com um prestador, a conversa aparecerá aqui.</p>
            <button
              onClick={() => navigate('/')}
              className="mt-2 px-6 py-2.5 bg-primary text-background font-bold rounded-xl hover:bg-primary-dark transition-colors text-sm"
            >
              Explorar prestadores
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {chats.map((chat) => {
              const otherId = chat.participants.find((p) => p !== user.id) || ''
              const otherInfo = chat.participantsInfo?.[otherId]
              const unread = chat.unreadCount?.[user.id] || 0
              const otherAvatar = otherInfo?.providerAvatar || otherInfo?.avatar || `https://i.pravatar.cc/40?u=${otherId}`

              return (
                <motion.button
                  key={chat.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => navigate(`/chat/${chat.id}`)}
                  className="w-full bg-surface border border-border rounded-xl p-4 flex items-center gap-4 hover:border-primary/50 transition-all text-left"
                >
                  {/* Avatar com badge */}
                  <div className="relative shrink-0">
                    <img
                      src={otherAvatar}
                      alt={otherInfo?.name || 'Usuário'}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {unread > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-background text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className={`text-sm font-semibold truncate ${ unread > 0 ? 'text-white' : 'text-white/80' }`}>
                        {otherInfo?.name || 'Usuário'}
                      </p>
                      <p className="text-[11px] text-muted shrink-0 ml-2">
                        {formatRelative(chat.lastMessageAt)}
                      </p>
                    </div>
                    <p className={`text-xs truncate ${ unread > 0 ? 'text-white/70' : 'text-muted' }`}>
                      {chat.lastMessageBy === user.id ? 'Você: ' : ''}
                      {chat.lastMessage || 'Sem mensagens ainda'}
                    </p>
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
