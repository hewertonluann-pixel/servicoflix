import * as admin from 'firebase-admin'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'

admin.initializeApp()
const db = admin.firestore()

/**
 * CRON DIARIO — roda todo dia à meia-noite (horário de Brasília)
 *
 * Para cada prestador aprovado:
 *   1. Se subscriptionStatus === 'active' → não faz nada (assinatura mensal)
 *   2. Se scoreExpiresAt existe e ainda não expirou → não faz nada
 *   3. Se scoreExpiresAt já passou → garante que status não seja 'approved'
 *      (a lógica de exibição já usa scoreExpiresAt, mas aqui podemos marcar
 *       providerProfile.active = false para facilitar queries futuras)
 */
export const dailyScoreDecrement = onSchedule(
  {
    schedule: '0 3 * * *', // 03:00 UTC = meia-noite BRT
    timeZone: 'America/Sao_Paulo',
    region: 'southamerica-east1',
  },
  async () => {
    const now = admin.firestore.Timestamp.now()
    const batch = db.batch()
    let updated = 0
    let skipped = 0

    try {
      const usersSnap = await db
        .collection('users')
        .where('roles', 'array-contains', 'provider')
        .get()

      logger.info(`[dailyScoreDecrement] Processando ${usersSnap.size} prestadores`)

      for (const docSnap of usersSnap.docs) {
        const data = docSnap.data()
        const p = data.providerProfile || {}

        // 1. Assinatura mensal ativa → pula
        if (p.subscriptionStatus === 'active') {
          skipped++
          continue
        }

        // 2. Sem scoreExpiresAt → não tem score comprado, marca como inativo
        if (!p.scoreExpiresAt) {
          batch.update(docSnap.ref, {
            'providerProfile.active': false,
            'providerProfile.status': 'expirado',
            'providerProfile.diasScore': 0,
          })
          updated++
          continue
        }

        const expiry: admin.firestore.Timestamp = p.scoreExpiresAt

        // 3. Score expirou → marca inativo e status expirado
        if (expiry.toMillis() <= now.toMillis()) {
          batch.update(docSnap.ref, {
            'providerProfile.active': false,
            'providerProfile.status': 'expirado',
            'providerProfile.diasScore': 0,
            'providerProfile.scoreExpiresAt': null,
          })
          updated++
          logger.info(`[expire] ${docSnap.id} — ${p.professionalName || 'sem nome'} expirou`)
          continue
        }

        // 4. Score ainda válido → atualiza diasScore com base na diferença
        const msRestantes = expiry.toMillis() - now.toMillis()
        const diasRestantes = Math.ceil(msRestantes / (1000 * 60 * 60 * 24))

        batch.update(docSnap.ref, {
          'providerProfile.active': true,
          'providerProfile.status': 'ativo',
          'providerProfile.diasScore': diasRestantes,
        })
        skipped++
      }

      await batch.commit()

      logger.info(
        `[dailyScoreDecrement] Concluído — atualizados: ${updated}, sem alteração: ${skipped}`
      )
    } catch (err) {
      logger.error('[dailyScoreDecrement] Erro:', err)
      throw err
    }
  }
)

/**
 * WEBHOOK STRIPE — chamado pelo Stripe ao confirmar pagamento
 *
 * Evento: checkout.session.completed
 * Adiciona dias ao scoreExpiresAt do prestador OU ativa assinatura mensal.
 */
export const stripeWebhook = require('./stripeWebhook').stripeWebhook

/**
 * NOTIFICAÇÕES — Push FCM (PWA instalado) ou fallback por e-mail
 *
 * onNovaSolicitacao  → dispara ao criar /solicitacoes/{id}
 * onNovaMensagemChat → dispara ao criar /chats/{chatId}/mensagens/{msgId}
 */
export { onNovaSolicitacao, onNovaMensagemChat } from './notifications'
