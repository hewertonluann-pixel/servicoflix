import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  increment,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Provider, ProviderStatus, HistoricoCredito, CreditoTipo } from '../types'

// ===== COLEÇÕES =====
const PROVIDERS_COL = 'providers'
const HISTORICO_COL = 'historico_creditos'

// ===== LEITURA =====

/**
 * Busca apenas prestadores ATIVOS (status = 'ativo' e diasScore > 0)
 * Usar na Home e SearchPage
 */
export async function getPrestadoresAtivos(): Promise<Provider[]> {
  const q = query(
    collection(db, PROVIDERS_COL),
    where('status', '==', 'ativo'),
    where('diasScore', '>', 0),
    orderBy('diasScore', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Provider))
}

/**
 * Busca todos os prestadores (para o painel admin)
 * Ordenado por diasScore crescente (quem vai expirar primeiro aparece primeiro)
 */
export async function getPrestadoresAdmin(): Promise<Provider[]> {
  const q = query(
    collection(db, PROVIDERS_COL),
    orderBy('diasScore', 'asc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Provider))
}

/**
 * Busca prestadores com crédito baixo (diasScore <= 7)
 * Usado pelo cron de notificações
 */
export async function getPrestadoresExpirando(): Promise<Provider[]> {
  const q = query(
    collection(db, PROVIDERS_COL),
    where('status', '==', 'ativo'),
    where('diasScore', '<=', 7),
    where('diasScore', '>', 0)
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Provider))
}

// ===== ESCRITA =====

/**
 * Adiciona dias ao score de um prestador
 * Usado após pagamento aprovado (Stripe webhook ou compra manual)
 */
export async function adicionarDiasScore(
  providerId: string,
  dias: number,
  tipo: CreditoTipo = 'credito',
  valor: number = 20,
  stripePaymentId?: string,
  observacao?: string
): Promise<void> {
  const providerRef = doc(db, PROVIDERS_COL, providerId)

  // Incrementa o score e garante status ativo
  await updateDoc(providerRef, {
    diasScore: increment(dias),
    status: 'ativo',
  })

  // Registra no histórico
  await addDoc(collection(db, HISTORICO_COL), {
    providerId,
    tipo,
    dias,
    valor,
    stripePaymentId: stripePaymentId ?? null,
    observacao: observacao ?? null,
    createdAt: serverTimestamp(),
  })
}

/**
 * Atualiza o status de um prestador
 * Ex: 'ativo' | 'expirado' | 'bloqueado' | 'pendente'
 */
export async function atualizarStatus(
  providerId: string,
  status: ProviderStatus
): Promise<void> {
  const providerRef = doc(db, PROVIDERS_COL, providerId)
  await updateDoc(providerRef, { status })
}

/**
 * Renova manualmente pelo admin: +30 dias sem cobrança
 */
export async function renovarManualAdmin(
  providerId: string,
  adminId: string
): Promise<void> {
  await adicionarDiasScore(
    providerId,
    30,
    'manual',
    0,
    undefined,
    `Renovado manualmente pelo admin ${adminId}`
  )
}

/**
 * Debita 1 dia do score (chamado pelo cron diário)
 * Se chegar a 0 → status = 'expirado'
 */
export async function debitarUmDia(provider: Provider): Promise<void> {
  const providerRef = doc(db, PROVIDERS_COL, provider.id)

  if (provider.diasScore <= 1) {
    // Zera e expira
    await updateDoc(providerRef, {
      diasScore: 0,
      status: 'expirado',
    })
  } else {
    await updateDoc(providerRef, {
      diasScore: increment(-1),
    })
  }
}

// ===== STRIPE =====

/**
 * Salva o ID do cliente Stripe no prestador
 */
export async function salvarStripeCustomerId(
  providerId: string,
  stripeCustomerId: string
): Promise<void> {
  const providerRef = doc(db, PROVIDERS_COL, providerId)
  await updateDoc(providerRef, { stripeCustomerId })
}

/**
 * Salva o ID da assinatura Stripe ativa
 */
export async function salvarStripeSubscriptionId(
  providerId: string,
  stripeSubscriptionId: string | null
): Promise<void> {
  const providerRef = doc(db, PROVIDERS_COL, providerId)
  await updateDoc(providerRef, { stripeSubscriptionId })
}

// ===== HISTÓRICO =====

/**
 * Busca histórico de créditos de um prestador
 */
export async function getHistoricoCreditos(
  providerId: string
): Promise<HistoricoCredito[]> {
  const q = query(
    collection(db, HISTORICO_COL),
    where('providerId', '==', providerId),
    orderBy('createdAt', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as HistoricoCredito))
}
