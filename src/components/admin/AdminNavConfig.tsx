import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ALL_NAV_ITEMS } from '@/components/BottomNav'
import { Home, Search, Clapperboard, MessageCircle, User } from 'lucide-react'

const ICON_MAP: Record<string, React.ElementType> = {
  Home,
  Search,
  Clapperboard,
  MessageCircle,
  User,
}

export const AdminNavConfig = () => {
  const [items, setItems] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ALL_NAV_ITEMS.map(item => [item.path, item.defaultEnabled]))
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const navConfigRef = doc(db, 'config', 'bottomNav')
    const unsub = onSnapshot(navConfigRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        setItems(prev => ({ ...prev, ...data.items }))
      }
    })
    return () => unsub()
  }, [])

  const toggle = async (path: string) => {
    const newItems = { ...items, [path]: !items[path] }
    setItems(newItems)
    setSaving(true)
    try {
      await setDoc(doc(db, 'config', 'bottomNav'), { items: newItems }, { merge: true })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 rounded-xl bg-card border border-border">
      <h2 className="text-lg font-bold mb-4 text-white">Barra de Navegação Inferior</h2>
      <p className="text-sm text-muted mb-4">
        Ative ou desative os itens exibidos para todos os usuários na barra inferior do app.
      </p>
      <div className="space-y-3">
        {ALL_NAV_ITEMS.map(item => {
          const Icon = ICON_MAP[item.icon]
          const enabled = items[item.path] ?? item.defaultEnabled
          return (
            <div
              key={item.path}
              className="flex items-center justify-between p-3 rounded-lg bg-background border border-border"
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-muted" strokeWidth={1.8} />
                <div>
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                  <p className="text-xs text-muted">{item.path}</p>
                </div>
              </div>
              <button
                onClick={() => toggle(item.path)}
                disabled={saving}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  enabled ? 'bg-primary' : 'bg-muted/30'
                } disabled:opacity-50`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )
        })}
      </div>
      {saving && (
        <p className="text-xs text-muted mt-3 text-center">Salvando...</p>
      )}
    </div>
  )
}
