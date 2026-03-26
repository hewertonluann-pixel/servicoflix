import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, LogOut, RefreshCw, TrendingUp, TrendingDown,
  Users, Briefcase, CreditCard, DollarSign, MapPin, Activity,
  BarChart2, ArrowRight, Loader2, AlertTriangle, Calendar,
  CheckCircle2, Clock, Star
} from 'lucide-react'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'
import { useAdminMetrics, type MonthlyPoint, type CityMetric } from '@/hooks/useAdminMetrics'

const ADMIN_UIDS = ['Glhzl4mWRkNjttVBLaLhoUWLWxf1', '5KqkZ0SPnpMkKO684W7fZBWHo4J2']
const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const PCT = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(1) + '%'

type Period = '7d' | 'month' | 'quarter' | 'year'

// ── Mini bar chart (pure CSS, sem dependência) ──
function MiniBar({ data, color = '#10b981' }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-[3px] h-10">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all"
          style={{ height: `${(v / max) * 100}%`, backgroundColor: color, opacity: 0.7 + (i / data.length) * 0.3 }}
        />
      ))}
    </div>
  )
}

// ── SVG Line chart ──
function LineChart({ series, colors, labels }: { series: number[][]; colors: string[]; labels: string[] }) {
  const W = 560; const H = 120; const PAD = 10
  const allVals = series.flat()
  const max = Math.max(...allVals, 1)
  const pts = (data: number[]) =>
    data.map((v, i) => [
      PAD + (i / (data.length - 1)) * (W - PAD * 2),
      H - PAD - (v / max) * (H - PAD * 2),
    ] as [number, number])

  const polyline = (data: number[], color: string, idx: number) => {
    const points = pts(data)
    const d = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ')
    return (
      <g key={idx}>
        <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3} fill={color} />
        ))}
      </g>
    )
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full" style={{ minWidth: 260 }}>
        {series.map((data, idx) => polyline(data, colors[idx], idx))}
        {labels.map((l, i) => (
          <text
            key={i}
            x={PAD + (i / (labels.length - 1)) * (W - PAD * 2)}
            y={H + 16}
            textAnchor="middle"
            fontSize={10}
            fill="#6b7280"
          >{l}</text>
        ))}
      </svg>
    </div>
  )
}

// ── Grouped bar chart ──
function GroupedBar({ monthly }: { monthly: MonthlyPoint[] }) {
  const max = Math.max(...monthly.flatMap(m => [m.subscriptions, m.credits]), 1)
  return (
    <div className="flex items-end justify-around gap-2 h-32 pt-2">
      {monthly.map((m, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex items-end justify-center gap-[2px]" style={{ height: 96 }}>
            <div
              className="flex-1 rounded-t-sm bg-primary/70 transition-all"
              style={{ height: `${(m.subscriptions / max) * 96}px` }}
              title={`Assinaturas: ${m.subscriptions}`}
            />
            <div
              className="flex-1 rounded-t-sm bg-blue-400/70 transition-all"
              style={{ height: `${(m.credits / max) * 96}px` }}
              title={`Créditos: ${m.credits}`}
            />
          </div>
          <span className="text-[10px] text-muted">{m.label}</span>
        </div>
      ))}
    </div>
  )
}

export const AdminRelatoriosPage = () => {
  const { user, loading: authLoading } = useSimpleAuth()
  const navigate = useNavigate()
  const [period, setPeriod] = useState<Period>('month')
  const metrics = useAdminMetrics()

  const isAdmin = user && ADMIN_UIDS.includes(user.id)

  // ── Derived: variação MoM ──
  const prevMonth = metrics.monthly[metrics.monthly.length - 2]
  const curMonth = metrics.monthly[metrics.monthly.length - 1]
  const revChange = prevMonth && prevMonth.revenue > 0
    ? ((curMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100
    : 0
  const usersChange = prevMonth
    ? ((curMonth.clients + curMonth.providers) - (prevMonth.clients + prevMonth.providers))
    : 0

  // ── KPI cards ──
  const kpis = useMemo(() => [
    {
      label: 'Receita Total',
      value: BRL(metrics.totalRevenue),
      sub: PCT(revChange) + ' vs mês ant.',
      icon: DollarSign,
      color: 'text-primary',
      bg: 'bg-primary/10 border-primary/30',
      trend: revChange >= 0,
      sparkData: metrics.monthly.map(m => m.revenue),
    },
    {
      label: 'Usuários',
      value: metrics.totalUsers,
      sub: (usersChange >= 0 ? '+' : '') + usersChange + ' novos este mês',
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/30',
      trend: usersChange >= 0,
      sparkData: metrics.monthly.map(m => m.clients + m.providers),
    },
    {
      label: 'Clientes',
      value: metrics.totalClients,
      sub: '+' + (curMonth?.clients ?? 0) + ' este mês',
      icon: Users,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/30',
      trend: true,
      sparkData: metrics.monthly.map(m => m.clients),
    },
    {
      label: 'Prestadores',
      value: metrics.totalProviders,
      sub: metrics.activeProviders + ' com score ativo',
      icon: Briefcase,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/30',
      trend: true,
      sparkData: metrics.monthly.map(m => m.providers),
    },
    {
      label: 'Assinaturas',
      value: metrics.totalSubscriptions,
      sub: BRL(metrics.totalSubscriptionRevenue) + ' MRR',
      icon: CreditCard,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10 border-yellow-500/30',
      trend: true,
      sparkData: metrics.monthly.map(m => m.subscriptions),
    },
    {
      label: 'Receita Créditos',
      value: BRL(metrics.totalCreditRevenue),
      sub: 'Pacotes de dias vendidos',
      icon: Star,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10 border-orange-500/30',
      trend: true,
      sparkData: metrics.monthly.map(m => m.credits),
    },
  ], [metrics, revChange, usersChange, curMonth, prevMonth])

  // ── Auth guards ──
  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!user) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-2xl font-black text-white mb-2">Login Necessário</h1>
        <button onClick={() => navigate('/entrar')} className="px-6 py-3 bg-primary text-background font-bold rounded-xl">Fazer Login</button>
      </div>
    </div>
  )
  if (!isAdmin) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-2xl font-black text-white mb-2">Acesso Negado</h1>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-primary text-background font-bold rounded-xl">Voltar ao Início</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">

      {/* ── Header ── */}
      <div className="bg-surface border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-black text-white">Relatórios & Métricas</h1>
              <p className="text-xs text-muted">ServiçoFlix Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={metrics.reload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border text-muted hover:text-white text-xs rounded-lg transition-colors"
            >
              {metrics.loading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <RefreshCw className="w-3.5 h-3.5" />}
              Atualizar
            </button>
            <Link
              to="/admin"
              className="flex items-center gap-2 text-sm text-muted hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" /> Painel
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">

        {/* ── Período tabs ── */}
        <div className="flex gap-1.5 bg-surface border border-border rounded-xl p-1 w-fit">
          {(['7d', 'month', 'quarter', 'year'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                period === p ? 'bg-primary text-background' : 'text-muted hover:text-white'
              }`}
            >
              {{ '7d': '7 dias', month: 'Mensal', quarter: 'Trimestral', year: 'Anual' }[p]}
            </button>
          ))}
        </div>

        {/* ── Error banner ── */}
        <AnimatePresence>
          {metrics.error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-3 text-red-400 text-sm"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {metrics.error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {kpis.map((kpi, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`bg-surface border rounded-xl p-4 flex flex-col gap-3 ${
                metrics.loading ? 'animate-pulse opacity-60' : ''
              } ${kpi.bg}`}
            >
              <div className="flex items-center justify-between">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-black/20`}>
                  <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
                {kpi.trend
                  ? <TrendingUp className="w-4 h-4 text-green-400 opacity-70" />
                  : <TrendingDown className="w-4 h-4 text-red-400 opacity-70" />}
              </div>
              <div>
                <p className={`text-2xl font-black text-white ${metrics.loading ? 'blur-sm' : ''}`}>
                  {metrics.loading ? '——' : kpi.value}
                </p>
                <p className="text-xs text-muted font-medium">{kpi.label}</p>
              </div>
              {!metrics.loading && kpi.sparkData.length > 1 && (
                <MiniBar data={kpi.sparkData} color={kpi.color.replace('text-', '#').replace('primary', '10b981').replace('blue-400', '60a5fa').replace('cyan-400', '22d3ee').replace('purple-400', 'c084fc').replace('yellow-400', 'facc15').replace('orange-400', 'fb923c')} />
              )}
              <p className="text-[11px] text-muted">{kpi.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Gráficos ── */}
        {!metrics.loading && metrics.monthly.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-4">

            {/* Receita por mês */}
            <div className="bg-surface border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-white">Receita — últimos 6 meses</h3>
              </div>
              <MiniBar data={metrics.monthly.map(m => m.revenue)} color="#10b981" />
              <div className="flex justify-between mt-2">
                {metrics.monthly.map((m, i) => (
                  <span key={i} className="text-[10px] text-muted">{m.label}</span>
                ))}
              </div>
            </div>

            {/* Evolução clientes x prestadores */}
            <div className="bg-surface border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Crescimento de Usuários</h3>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-muted mb-2">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400" /> Clientes</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400" /> Prestadores</span>
              </div>
              <LineChart
                series={[
                  metrics.monthly.map(m => m.clients),
                  metrics.monthly.map(m => m.providers),
                ]}
                colors={['#22d3ee', '#c084fc']}
                labels={metrics.monthly.map(m => m.label)}
              />
            </div>
          </div>
        )}

        {/* Assinaturas & Créditos agrupados */}
        {!metrics.loading && metrics.monthly.length > 0 && (
          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-yellow-400" />
                <h3 className="text-sm font-bold text-white">Assinaturas e Créditos — por mês</h3>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary/70" /> Assinaturas</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400/70" /> Créditos</span>
              </div>
            </div>
            <GroupedBar monthly={metrics.monthly} />
          </div>
        )}

        {/* ── Tabela por cidade ── */}
        {!metrics.loading && metrics.cityMetrics.length > 0 && (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-white">Desempenho por Cidade</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Cidade', 'UF', 'Prestadores', 'Clientes', 'Ativos', 'Receita', 'Progresso'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-muted font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metrics.cityMetrics.slice(0, 12).map((c, i) => {
                    const maxP = Math.max(...metrics.cityMetrics.map(x => x.providers), 1)
                    const pct = Math.round((c.providers / maxP) * 100)
                    return (
                      <motion.tr
                        key={c.slug}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b border-border/50 hover:bg-background/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-semibold text-white">{c.nome}</td>
                        <td className="px-4 py-3 text-muted">
                          <span className="px-2 py-0.5 bg-background border border-border rounded-full text-[10px]">{c.uf}</span>
                        </td>
                        <td className="px-4 py-3 text-white">{c.providers}</td>
                        <td className="px-4 py-3 text-muted">{c.clients}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold ${
                            c.activeProviders > 0 ? 'text-green-400' : 'text-muted'
                          }`}>{c.activeProviders}</span>
                        </td>
                        <td className="px-4 py-3 text-primary font-semibold">
                          {c.revenue > 0 ? BRL(c.revenue) : <span className="text-muted">—</span>}
                        </td>
                        <td className="px-4 py-3 w-32">
                          <div className="h-1.5 bg-background rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Atividade recente ── */}
        {!metrics.loading && metrics.recentActivity.length > 0 && (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Atividade Recente</h3>
              </div>
              <Link to="/admin" className="text-xs text-primary hover:underline flex items-center gap-1">
                Ver tudo <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-border/50">
              {metrics.recentActivity.slice(0, 8).map((act, i) => (
                <motion.div
                  key={act.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-background/50 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    act.type === 'subscription' ? 'bg-yellow-500/15' :
                    act.type === 'credit' ? 'bg-primary/15' : 'bg-blue-500/15'
                  }`}>
                    {act.type === 'subscription'
                      ? <CreditCard className="w-4 h-4 text-yellow-400" />
                      : act.type === 'credit'
                        ? <Star className="w-4 h-4 text-primary" />
                        : <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{act.label}</p>
                    <p className="text-xs text-muted">{act.sub}</p>
                  </div>
                  {act.value !== undefined && act.value > 0 && (
                    <span className="text-sm font-bold text-primary shrink-0">{BRL(act.value)}</span>
                  )}
                  <span className="text-[10px] text-muted shrink-0">
                    {act.createdAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {metrics.loading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted">Carregando métricas...</p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
