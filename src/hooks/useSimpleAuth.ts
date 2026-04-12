/**
 * useSimpleAuth.ts — Alias de compatibilidade para useAuth().
 *
 * Mantém a assinatura original para que todos os componentes existentes
 * continuem funcionando sem alteração. Apenas lê do AuthContext global
 * em vez de criar um novo listener do Firebase Auth.
 */
export { useAuth as useSimpleAuth } from '@/contexts/AuthContext'
