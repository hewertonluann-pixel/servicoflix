import {
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

/** Motivos disponíveis para denúncia */
export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'inappropriate_content'
  | 'fake_profile'
  | 'scam'
  | 'other'

/** Labels legíveis para exibir na UI */
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: 'Spam ou propaganda',
  harassment: 'Assédio ou ameaças',
  inappropriate_content: 'Conteúdo inapropriado',
  fake_profile: 'Perfil falso',
  scam: 'Golpe ou fraude',
  other: 'Outro motivo',
}

export interface ReportData {
  reportedBy: string       // userId de quem denuncia
  reportedUser: string     // userId do denunciado
  chatId: string           // chat onde ocorreu
  reason: ReportReason     // motivo selecionado
  description?: string     // descrição opcional
  createdAt: any
  status: 'pending'        // começa sempre como pending
}

/**
 * Envia uma denúncia para a coleção `reports` no Firestore.
 */
export const submitReport = async (
  reportedBy: string,
  reportedUser: string,
  chatId: string,
  reason: ReportReason,
  description?: string
): Promise<void> => {
  const reportsRef = collection(db, 'reports')
  await addDoc(reportsRef, {
    reportedBy,
    reportedUser,
    chatId,
    reason,
    description: description?.trim() || '',
    createdAt: serverTimestamp(),
    status: 'pending',
  })
}
