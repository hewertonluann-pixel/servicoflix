/**
 * Retorna a URL do avatar do usuário seguindo a regra:
 * 1. Foto carregada manualmente (Storage)
 * 2. Foto do Google (firebasePhotoURL)
 * 3. String vazia
 *
 * Para prestadores, providerProfile.avatar tem prioridade máxima
 * se for uma URL válida de Storage. Caso contrário, cai no Google.
 */

import { User } from '@/types'

const isManualUpload = (url: string): boolean =>
  url.includes('firebasestorage.googleapis.com') ||
  url.includes('storage.googleapis.com')

const isGooglePhoto = (url: string): boolean =>
  url.includes('googleusercontent.com') ||
  url.includes('accounts.google.com')

/**
 * Retorna o avatar correto para um usuário comum (cliente).
 * Prioridade: foto manual (Storage) > foto Google
 */
export const getClientAvatar = (
  user: Pick<User, 'avatar'> | null | undefined,
  firebasePhotoURL?: string | null
): string => {
  const stored = user?.avatar || ''
  const google = firebasePhotoURL || ''

  if (stored && isManualUpload(stored)) return stored
  if (stored && !isGooglePhoto(stored) && stored.startsWith('http')) return stored
  if (google) return google
  if (stored) return stored
  return ''
}

/**
 * Retorna o avatar correto para um prestador.
 * Prioridade: providerProfile.avatar (Storage manual) > user.avatar (Storage) > foto Google
 *
 * URLs do Google no providerProfile são ignoradas (podem ser antigas/expiradas).
 * O firebasePhotoURL sempre serve como último recurso válido.
 */
export const getProviderAvatar = (
  user: Pick<User, 'avatar' | 'providerProfile'> | null | undefined,
  firebasePhotoURL?: string | null
): string => {
  const providerAvatar = (user?.providerProfile as any)?.avatar || ''
  const userAvatar = user?.avatar || ''
  const google = firebasePhotoURL || ''

  // Só usa providerProfile.avatar se for upload manual do Storage
  if (providerAvatar && isManualUpload(providerAvatar)) return providerAvatar

  // user.avatar manual
  if (userAvatar && isManualUpload(userAvatar)) return userAvatar

  // Foto do Google — fonte mais confiável como fallback
  if (google) return google

  // Último recurso: qualquer URL salva
  if (providerAvatar && providerAvatar.startsWith('http')) return providerAvatar
  if (userAvatar && userAvatar.startsWith('http')) return userAvatar

  return ''
}

/**
 * Função universal: detecta se é prestador automaticamente.
 */
export const getAvatarUrl = (
  user: Pick<User, 'avatar' | 'roles' | 'providerProfile'> | null | undefined,
  firebasePhotoURL?: string | null
): string => {
  if (!user) return ''
  const isProvider = user.roles?.includes('provider')
  if (isProvider) return getProviderAvatar(user, firebasePhotoURL)
  return getClientAvatar(user, firebasePhotoURL)
}

/**
 * Versão simplificada para dados externos (documentos do Firestore)
 * onde não há acesso ao firebaseUser.
 * Prioridade: providerAvatar (Storage) > avatar > googlePhotoURL salvo no doc
 */
export const resolveAvatarFromDoc = (data: {
  avatar?: string
  googlePhotoURL?: string
  providerProfile?: { avatar?: string }
}): string => {
  const providerAvatar = data?.providerProfile?.avatar || ''
  const userAvatar = data?.avatar || ''
  const google = data?.googlePhotoURL || ''

  if (providerAvatar && isManualUpload(providerAvatar)) return providerAvatar
  if (userAvatar && isManualUpload(userAvatar)) return userAvatar
  if (google) return google
  if (providerAvatar && providerAvatar.startsWith('http')) return providerAvatar
  if (userAvatar && userAvatar.startsWith('http')) return userAvatar
  return ''
}
