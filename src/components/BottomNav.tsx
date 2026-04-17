import { Link, useLocation } from 'react-router-dom'
import { Home, Search, MessageCircle, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'

export const BottomNav = () => {
  const location = useLocation()
  const { user } = useSimpleAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user?.uid) return
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    )
    const unsub = onSnapshot(q, (snap) => {
      let count = 0
      snap.docs.forEach(doc => {
        const data = doc.data()
        const unread = data.unreadCount?.[user.uid] ?? 0
        count += unread
      })
      setUnreadCount(count)
    })
    return () => unsub()
  }, [user?.uid])

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const tabs = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/buscar', icon: Search, label: 'Buscar' },
    { path: '/chats', icon: MessageCircle, label: 'Chats', badge: unreadCount },
    { path: '/minha-conta', icon: User, label: 'Conta' },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border">
      <div className="flex items-center justify-around px-2 py-2 pb-safe">
        {tabs.map(({ path, icon: Icon, label, badge }) => {
          const active = isActive(path)
          return (
            <Link
              key={path}
              to={path}
              className="flex flex-col items-center gap-1 flex-1 py-1 relative"
            >
              <div className="relative">
                <Icon
                  className={`w-6 h-6 transition-colors ${
                    active ? 'text-primary' : 'text-muted'
                  }`}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                {badge != null && badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-1 border-2 border-background">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-semibold transition-colors ${
                  active ? 'text-primary' : 'text-muted'
                }`}
              >
                {label}
              </span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
