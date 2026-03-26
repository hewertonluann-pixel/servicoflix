import { useState, useEffect, useCallback } from 'react'
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface CityMetric {
  slug: string
  nome: string
  uf: string
  providers: number
  clients: number
  activeProviders: number
  revenue: number
}

export interface MonthlyPoint {
  label: string   // 'Jan', 'Fev', ...
  month: number   // 0-11
  year: number
  clients: number
  providers: number
  subscriptions: number
  credits: number
  revenue: number
}

export interface RecentActivity {
  id: string
  type: 'subscription' | 'credit' | 'provider_approved' | 'new_user'
  label: string
  sub: string
  value?: number
  createdAt: Date
}

export interface AdminMetrics {
  totalUsers: number
  totalClients: number
  totalProviders: number
  activeProviders: number
  totalSubscriptions: number
  totalCreditRevenue: number
  totalSubscriptionRevenue: number
  totalRevenue: number
  cityMetrics: CityMetric[]
  monthly: MonthlyPoint[]
  recentActivity: RecentActivity[]
  loading: boolean
  error: string | null
  reload: () => void
}

const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const toMs = (ts: any): number => {
  if (!ts) return 0
  if (ts?.toMillis) return ts.toMillis()
  if (ts?.seconds) return ts.seconds * 1000
  if (ts instanceof Date) return ts.getTime()
  return 0
}

export function useAdminMetrics(): AdminMetrics {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<Omit<AdminMetrics, 'loading' | 'error' | 'reload'>>({
    totalUsers: 0, totalClients: 0, totalProviders: 0, activeProviders: 0,
    totalSubscriptions: 0, totalCreditRevenue: 0, totalSubscriptionRevenue: 0, totalRevenue: 0,
    cityMetrics: [], monthly: [], recentActivity: [],
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [usersSnap, citiesSnap, creditosSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'cities')),
        getDocs(query(collection(db, 'historico_creditos'), orderBy('createdAt', 'desc'))),
      ])

      const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as any))
      const cities = citiesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any))
      const creditos = creditosSnap.docs.map(d => ({ id: d.id, ...d.data() } as any))

      const providers = users.filter((u: any) => u.roles?.includes('provider'))
      const clients = users.filter((u: any) => !u.roles?.includes('provider'))

      const now = Date.now()
      const activeProviders = providers.filter((u: any) => {
        const p = u.providerProfile || {}
        if (p.subscriptionStatus === 'active') return true
        if (p.scoreExpiresAt) {
          return toMs(p.scoreExpiresAt) > now
        }
        return false
      })

      // ── Receita por créditos (historico_creditos) ──
      const creditRevenue = creditos.reduce((sum: number, c: any) => {
        if (c.tipo === 'manual') return sum
        return sum + (Number(c.valor) || 0)
      }, 0)

      // ── Assinaturas ──
      const subscriptionProviders = providers.filter((u: any) => u.providerProfile?.subscriptionStatus === 'active')
      const subscriptionRevenue = subscriptionProviders.length * 29.9

      // ── Métricas por cidade ──
      const cityMap: Record<string, CityMetric> = {}
      cities.forEach((c: any) => {
        if (c.status !== 'ativa') return
        cityMap[c.slug] = { slug: c.slug, nome: c.nome, uf: c.uf, providers: 0, clients: 0, activeProviders: 0, revenue: 0 }
      })

      providers.forEach((u: any) => {
        const p = u.providerProfile || {}
        const slug = p.city_base || p.city?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'outros'
        if (!cityMap[slug]) cityMap[slug] = { slug, nome: p.city || slug, uf: '—', providers: 0, clients: 0, activeProviders: 0, revenue: 0 }
        cityMap[slug].providers += 1
        if (activeProviders.find((a: any) => a.id === u.id)) cityMap[slug].activeProviders += 1
      })

      clients.forEach((u: any) => {
        const cp = u.clientProfile || {}
        const slug = cp.city?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'outros'
        if (!cityMap[slug]) return
        cityMap[slug].clients += 1
      })

      creditos.forEach((c: any) => {
        if (!c.providerId || c.tipo === 'manual') return
        const provider = providers.find((u: any) => u.id === c.providerId)
        if (!provider) return
        const p = provider.providerProfile || {}
        const slug = p.city_base || p.city?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'outros'
        if (cityMap[slug]) cityMap[slug].revenue += Number(c.valor) || 0
      })

      // ── Série mensal: últimos 6 meses ──
      const monthly: MonthlyPoint[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setDate(1)
        d.setMonth(d.getMonth() - i)
        const y = d.getFullYear()
        const m = d.getMonth()
        monthly.push({
          label: MONTHS_PT[m],
          month: m,
          year: y,
          clients: 0,
          providers: 0,
          subscriptions: 0,
          credits: 0,
          revenue: 0,
        })
      }

      users.forEach((u: any) => {
        const ms = toMs(u.createdAt)
        if (!ms) return
        const d = new Date(ms)
        const pt = monthly.find(p => p.month === d.getMonth() && p.year === d.getFullYear())
        if (!pt) return
        if (u.roles?.includes('provider')) pt.providers += 1
        else pt.clients += 1
      })

      creditos.forEach((c: any) => {
        const ms = toMs(c.createdAt)
        if (!ms || c.tipo === 'manual') return
        const d = new Date(ms)
        const pt = monthly.find(p => p.month === d.getMonth() && p.year === d.getFullYear())
        if (!pt) return
        pt.credits += 1
        pt.revenue += Number(c.valor) || 0
      })

      providers.forEach((u: any) => {
        if (u.providerProfile?.subscriptionStatus !== 'active') return
        const ms = toMs(u.providerProfile?.subscriptionStartAt || u.createdAt)
        if (!ms) return
        const d = new Date(ms)
        const pt = monthly.find(p => p.month === d.getMonth() && p.year === d.getFullYear())
        if (!pt) return
        pt.subscriptions += 1
        pt.revenue += 29.9
      })

      // ── Atividade recente (últimos 20 créditos) ──
      const recentActivity: RecentActivity[] = creditos.slice(0, 20).map((c: any) => {
        const provider = providers.find((u: any) => u.id === c.providerId)
        const name = provider?.providerProfile?.professionalName || provider?.name || c.providerId
        if (c.tipo === 'assinatura') {
          return {
            id: c.id, type: 'subscription' as const,
            label: `Assinatura — ${name}`,
            sub: 'Plano mensal ativado',
            value: 29.9,
            createdAt: new Date(toMs(c.createdAt)),
          }
        }
        return {
          id: c.id, type: 'credit' as const,
          label: `Créditos — ${name}`,
          sub: `+${c.dias ?? '?'} dias`,
          value: Number(c.valor) || 0,
          createdAt: new Date(toMs(c.createdAt)),
        }
      })

      setMetrics({
        totalUsers: users.length,
        totalClients: clients.length,
        totalProviders: providers.length,
        activeProviders: activeProviders.length,
        totalSubscriptions: subscriptionProviders.length,
        totalCreditRevenue: creditRevenue,
        totalSubscriptionRevenue: subscriptionRevenue,
        totalRevenue: creditRevenue + subscriptionRevenue,
        cityMetrics: Object.values(cityMap).sort((a, b) => b.providers - a.providers),
        monthly,
        recentActivity,
      })
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar métricas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { ...metrics, loading, error, reload: load }
}
