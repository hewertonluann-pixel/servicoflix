import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'
import { motion } from 'framer-motion'
import { MessageCircle, Loader2, ArrowLeft, Compass } from 'lucide-react'
import { ChatMeta } from '@/lib/chatUtils'
import { UserAvatar } from '@/components/UserAvatar'

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
      <div className="min-h-screen pt-16 flex items-center justify-center px-4">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 text-muted mx-auto mb-4" />
          <p className="text-white font-semibold mb-2">Faça login para ver suas mensagens</p>
          <button onClick={() => navigate('/entrar?redirect=/chats')} className="mt-2 px-6 py-2.5 bg-primary text-background font-bold rounded-xl text-sm">Entrar</button>
        </div>
      </div>
    )
  }

  const totalUnread = chats.reduce((sum, c) => sum + (c.unreadCount?.[user.id] || 0), 0)

  return (
    <div className="min-h-screen pt-16 pb-20 bg-background">
      <div className="bg-surface border-b border-border sticky top-16 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-background rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-muted" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              Mensagens
              {totalUnread > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-primary text-background text-[11px] font-black rounded-full">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
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
            <Link
              to="/buscar"
              className="mt-2 flex items-center gap-2 px-6 py-2.5 bg-primary text-background font-bold rounded-xl hover:bg-primary-dark transition-colors text-sm"
            >
              <Compass className="w-4 h-4" />
              Explorar prestadores
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {chats.map((chat, i) => {
              const otherId = chat.participants.find((p) => p !== user.id) || ''
              const otherInfo = chat.participantsInfo?.[otherId]
              const unread = chat.unreadCount?.[user.id] || 0
              const otherAvatar = otherInfo?.providerAvatar || otherInfo?.avatar || ''
              const otherName = otherInfo?.name || 'Usuário'

              return (
                <motion.button
                  key={chat.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => navigate(`/chat/${chat.id}`)}
                  className={`w-full border rounded-xl p-4 flex items-center gap-4 hover:border-primary/50 transition-all text-left ${
                    unread > 0 ? 'bg-primary/5 border-primary/30' : 'bg-surface border-border'
                  }`}
                >
                  <div className="relative shrink-0">
                    <UserAvatar src={otherAvatar} name={otherName} size={48} />
                    {unread > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-primary text-background text-[10px] font-black rounded-full flex items-center justify-center px-1">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className={`text-sm truncate ${ unread > 0 ? 'font-bold text-white' : 'font-semibold text-white/80' }`}>
                        {otherName}
                      </p>
                      <p className={`text-[11px] shrink-0 ml-2 ${ unread > 0 ? 'text-primary font-semibold' : 'text-muted' }`}>
                        {formatRelative(chat.lastMessageAt)}
                      </p>
                    </div>
                    <p className={`text-xs truncate ${ unread > 0 ? 'text-white/70 font-medium' : 'text-muted' }`}>
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
