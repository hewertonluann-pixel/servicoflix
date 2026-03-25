import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, LogOut, Megaphone, Plus, Trash2, Edit2,
  Save, X, ToggleLeft, ToggleRight, RefreshCw, Loader2,
  ExternalLink, Image, AlertTriangle, Eye, EyeOff
} from 'lucide-react'
import {
  collection, getDocs, doc, updateDoc, deleteDoc,
  setDoc, serverTimestamp, addDoc
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'

const ADMIN_UIDS = ['Glhzl4mWRkNjttVBLaLhoUWLWxf1', '5KqkZ0SPnpMkKO684W7fZBWHo4J2']

type Posicao = 'home_top' | 'home_middle' | 'busca_topo' | 'perfil_banner'

interface Banner {
  id: string
  titulo: string
  descricao?: string
  imageUrl?: string
  linkUrl?: string
  posicao: Posicao
  ativo: boolean
  ordem: number
  anunciante?: string
  createdAt?: any
}

const POSICOES: { key: Posicao; label: string; desc: string }[] = [
  { key: 'home_top',      label: 'Home — Topo',         desc: 'Banner principal acima das categorias' },
  { key: 'home_middle',   label: 'Home — Meio',          desc: 'Card destacado entre os carrosséis' },
  { key: 'busca_topo',    label: 'Busca — Topo',         desc: 'Banner no topo da página de busca' },
  { key: 'perfil_banner', label: 'Perfil — Banner',      desc: 'Banner no rodapé de perfis de prestadores' },
]

const EMPTY_FORM = {
  titulo: '',
  descricao: '',
  imageUrl: '',
  linkUrl: '',
  posicao: 'home_top' as Posicao,
  anunciante: '',
  ativo: true,
  ordem: 1,
}

export const PublicidadePage = () => {
  const { user, loading: authLoading } = useSimpleAuth()
  const navigate = useNavigate()

  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editing, setEditing] = useState<Banner | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [filterPos, setFilterPos] = useState<Posicao | 'all'>('all')

  const isAdmin = user && ADMIN_UIDS.includes(user.id)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const loadBanners = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'banners'))
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Banner))
      list.sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99))
      setBanners(list)
    } catch (err: any) {
      showToast('Erro ao carregar banners: ' + (err?.message || ''), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && isAdmin) loadBanners()
  }, [authLoading, isAdmin])

  const openNew = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, ordem: banners.length + 1 })
    setModal(true)
  }

  const openEdit = (b: Banner) => {
    setEditing(b)
    setForm({
      titulo: b.titulo || '',
      descricao: b.descricao || '',
      imageUrl: b.imageUrl || '',
      linkUrl: b.linkUrl || '',
      posicao: b.posicao || 'home_top',
      anunciante: b.anunciante || '',
      ativo: b.ativo ?? true,
      ordem: b.ordem ?? 1,
    })
    setModal(true)
  }

  const saveBanner = async () => {
    if (!form.titulo.trim()) return
    setSaving(true)
    try {
      const payload = {
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim(),
        imageUrl: form.imageUrl.trim(),
        linkUrl: form.linkUrl.trim(),
        posicao: form.posicao,
        anunciante: form.anunciante.trim(),
        ativo: form.ativo,
        ordem: Number(form.ordem) || 1,
        updatedAt: serverTimestamp(),
      }
      if (editing) {
        await updateDoc(doc(db, 'banners', editing.id), payload)
        setBanners(prev => prev.map(b => b.id === editing.id ? { ...b, ...payload } : b))
        showToast('Banner atualizado!')
      } else {
        const ref = await addDoc(collection(db, 'banners'), { ...payload, createdAt: serverTimestamp() })
        setBanners(prev => [...prev, { id: ref.id, ...payload } as Banner])
        showToast('Banner criado!')
      }
      setModal(false)
      setEditing(null)
    } catch (err: any) {
      showToast('Erro ao salvar: ' + (err?.message || ''), 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleBanner = async (b: Banner) => {
    try {
      await updateDoc(doc(db, 'banners', b.id), { ativo: !b.ativo })
      setBanners(prev => prev.map(x => x.id === b.id ? { ...x, ativo: !x.ativo } : x))
      showToast(b.ativo ? 'Banner desativado' : 'Banner ativado!')
    } catch (err: any) {
      showToast('Erro: ' + (err?.message || ''), 'error')
    }
  }

  const deleteBanner = async (id: string) => {
    if (!confirm('Excluir este banner permanentemente?')) return
    try {
      await deleteDoc(doc(db, 'banners', id))
      setBanners(prev => prev.filter(b => b.id !== id))
      showToast('Banner excluído!')
    } catch (err: any) {
      showToast('Erro ao excluir: ' + (err?.message || ''), 'error')
    }
  }

  const inputCls = 'w-full bg-background border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary transition-colors placeholder:text-muted'

  const filtered = filterPos === 'all' ? banners : banners.filter(b => b.posicao === filterPos)
  const ativos = banners.filter(b => b.ativo).length

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!user || !isAdmin) return (
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
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl font-semibold text-sm shadow-lg max-w-sm ${
              toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}>{toast.msg}</motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-surface border-b border-border sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin')} className="p-2 rounded-lg hover:bg-background text-muted hover:text-white transition-colors">
              <Shield className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-border" />
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-black text-white">Publicidade</h1>
              <p className="text-xs text-muted">Gerenciar banners e anúncios</p>
            </div>
          </div>
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-muted hover:text-white transition-colors">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total de banners', value: banners.length, color: 'text-blue-400' },
            { label: 'Banners ativos',   value: ativos,          color: 'text-green-400' },
            { label: 'Desativados',      value: banners.length - ativos, color: 'text-red-400' },
          ].map((s, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-4">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filtro por posição */}
        <div className="flex gap-1.5 mb-5 bg-surface border border-border rounded-xl p-1 flex-wrap">
          <button onClick={() => setFilterPos('all')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${ filterPos === 'all' ? 'bg-primary text-background' : 'text-muted hover:text-white' }`}>
            Todas ({banners.length})
          </button>
          {POSICOES.map(p => {
            const count = banners.filter(b => b.posicao === p.key).length
            return (
              <button key={p.key} onClick={() => setFilterPos(p.key)}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${ filterPos === p.key ? 'bg-primary text-background' : 'text-muted hover:text-white' }`}>
                {p.label} ({count})
              </button>
            )
          })}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-muted">{filtered.length} banners</p>
          <div className="flex gap-2">
            <button onClick={loadBanners}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border text-muted hover:text-white text-xs rounded-lg transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Atualizar
            </button>
            <button onClick={openNew}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-background text-xs font-bold rounded-lg">
              <Plus className="w-3.5 h-3.5" /> Novo Banner
            </button>
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30 text-muted" />
            <p className="font-semibold text-white">Nenhum banner cadastrado</p>
            <p className="text-xs text-muted mt-1">Clique em "Novo Banner" para começar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(b => {
              const pos = POSICOES.find(p => p.key === b.posicao)
              return (
                <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={`bg-surface border rounded-xl p-4 flex gap-4 ${ b.ativo ? 'border-primary/30' : 'border-border opacity-60' }`}>

                  {/* Thumb */}
                  <div className="w-20 h-14 rounded-lg overflow-hidden bg-background border border-border shrink-0 flex items-center justify-center">
                    {b.imageUrl
                      ? <img src={b.imageUrl} alt={b.titulo} className="w-full h-full object-cover" />
                      : <Image className="w-5 h-5 text-muted" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-bold text-white">{b.titulo}</p>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${ b.ativo ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400' }`}>
                        {b.ativo ? '🟢 Ativo' : '🔴 Inativo'}
                      </span>
                      {b.anunciante && (
                        <span className="px-2 py-0.5 bg-background border border-border text-muted text-[10px] rounded-full">{b.anunciante}</span>
                      )}
                    </div>
                    {b.descricao && <p className="text-xs text-muted line-clamp-1 mb-1">{b.descricao}</p>}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="px-2 py-0.5 bg-primary/10 border border-primary/30 text-primary text-[10px] font-semibold rounded-full">
                        {pos?.label || b.posicao}
                      </span>
                      {b.linkUrl && (
                        <a href={b.linkUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] text-blue-400 hover:underline">
                          <ExternalLink className="w-3 h-3" /> {b.linkUrl.slice(0, 30)}{b.linkUrl.length > 30 ? '…' : ''}
                        </a>
                      )}
                      <span className="text-[10px] text-muted">ordem #{b.ordem}</span>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => toggleBanner(b)} className="p-1.5 rounded-lg hover:bg-background transition-colors" title={b.ativo ? 'Desativar' : 'Ativar'}>
                      {b.ativo ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5 text-muted" />}
                    </button>
                    <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg hover:bg-background text-muted hover:text-white transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteBanner(b.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

      </div>

      {/* MODAL */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !saving && setModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-surface border border-border rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">

              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary/20 rounded-xl flex items-center justify-center">
                    <Megaphone className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-lg font-black text-white">{editing ? 'Editar Banner' : 'Novo Banner'}</h2>
                </div>
                <button onClick={() => setModal(false)} className="p-1.5 rounded-lg text-muted hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">

                {/* Preview */}
                {form.imageUrl && (
                  <div className="w-full h-32 rounded-xl overflow-hidden border border-border">
                    <img src={form.imageUrl} alt="preview" className="w-full h-full object-cover" />
                  </div>
                )}

                <div>
                  <label className="block text-xs text-muted mb-1.5">Título *</label>
                  <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Promoção de Verão" className={inputCls} />
                </div>

                <div>
                  <label className="block text-xs text-muted mb-1.5">Anunciante</label>
                  <input value={form.anunciante} onChange={e => setForm(f => ({ ...f, anunciante: e.target.value }))} placeholder="Ex: Loja XYZ, ServiçoFlix" className={inputCls} />
                </div>

                <div>
                  <label className="block text-xs text-muted mb-1.5">Descrição curta</label>
                  <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Texto de apoio (opcional)" className={inputCls} />
                </div>

                <div>
                  <label className="block text-xs text-muted mb-1.5">URL da imagem</label>
                  <input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." className={inputCls} />
                </div>

                <div>
                  <label className="block text-xs text-muted mb-1.5">URL do link (ao clicar)</label>
                  <input value={form.linkUrl} onChange={e => setForm(f => ({ ...f, linkUrl: e.target.value }))} placeholder="https://... ou /buscar?cat=limpeza" className={inputCls} />
                </div>

                <div>
                  <label className="block text-xs text-muted mb-1.5">Posição na plataforma</label>
                  <select value={form.posicao} onChange={e => setForm(f => ({ ...f, posicao: e.target.value as Posicao }))} className={inputCls}>
                    {POSICOES.map(p => (
                      <option key={p.key} value={p.key}>{p.label} — {p.desc}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-muted mb-1.5">Ordem de exibição</label>
                  <input type="number" min={1} value={form.ordem} onChange={e => setForm(f => ({ ...f, ordem: Number(e.target.value) }))} className={inputCls} />
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <div onClick={() => setForm(f => ({ ...f, ativo: !f.ativo }))}
                    className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${form.ativo ? 'bg-primary' : 'bg-border'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${form.ativo ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                  <span className="text-sm text-white">Banner ativo</span>
                </label>

              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setModal(false)} disabled={saving}
                  className="flex-1 py-3 bg-background border border-border text-muted font-semibold rounded-xl hover:text-white transition-colors disabled:opacity-50">
                  Cancelar
                </button>
                <button onClick={saveBanner} disabled={saving || !form.titulo.trim()}
                  className="flex-1 py-3 bg-primary text-background font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editing ? 'Salvar alterações' : 'Criar banner'}
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
