/**
 * Retorna a URL do avatar do usuário seguindo a regra:
 * 1. Foto carregada manualmente (user.avatar com URL de Storage)
 * 2. Foto do Google (firebasePhotoURL)
 * 3. String vazia (sem foto)
 *
 * Para prestadores, a foto do perfil de prestador (providerProfile.avatar)
 * é tratada como foto manual e tem prioridade máxima.
 */

import { User } from '@/types'

/**
 * Detecta se uma URL é do Firebase Storage (foto carregada manualmente)
 * vs foto do Google (accounts.google.com / googleusercontent.com)
 */
const isManualUpload = (url: string): boolean => {
  return (
    url.includes('firebasestorage.googleapis.com') ||
    url.includes('storage.googleapis.com')
  )
}

const isGooglePhoto = (url: string): boolean => {
  return (
    url.includes('googleusercontent.com') ||
    url.includes('accounts.google.com')
  )
}

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
 * Prioridade: providerProfile.avatar (manual) > user.avatar (manual) > foto Google
 */
export const getProviderAvatar = (
  user: Pick<User, 'avatar' | 'providerProfile'> | null | undefined,
  firebasePhotoURL?: string | null
): string => {
  const providerAvatar = (user?.providerProfile as any)?.avatar || ''
  const userAvatar = user?.avatar || ''
  const google = firebasePhotoURL || ''

  if (providerAvatar && providerAvatar.startsWith('http')) return providerAvatar
  if (userAvatar && isManualUpload(userAvatar)) return userAvatar
  if (google) return google
  if (userAvatar) return userAvatar
  return ''
}

/**
 * Função universal: detecta se é prestador automaticamente.
 * Use esta quando não souber o tipo de usuário.
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
 * Versão simplificada para dados externos (ex: documentos do Firestore)
 * onde não há acesso ao firebaseUser.
 * Prioridade: providerAvatar > avatar > ''
 */
export const resolveAvatarFromDoc = (data: {
  avatar?: string
  providerProfile?: { avatar?: string }
}): string => {
  return data?.providerProfile?.avatar || data?.avatar || ''
}
