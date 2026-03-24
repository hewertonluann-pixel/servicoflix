import * as admin from 'firebase-admin'
import { onRequest } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'

const db = admin.firestore()

// Mapeamento de Price IDs para dias de score
// ⚠️ Substitua pelos seus Price IDs reais do Stripe Dashboard
const PRICE_TO_DIAS: Record<string, number> = {
  'price_1TELvUEW46ts4yeZGUhuQvqJ': 30,   // R$ 29,90 — 30 dias
  'price_1TELx3EW46ts4yeZzW1RUOGM': 60,   // R$ 49,90 — 60 dias
  'price_1TELxtEW46ts4yeZQyVS9zHa': 90,   // R$ 69,90 — 90 dias
}

// Price IDs de assinatura mensal
const SUBSCRIPTION_PRICE_IDS = new Set([
  'price_mensal', // R$ 39,90/mês — assinatura recorrente
])

export const stripeWebhook = onRequest(
  {
    region: 'southamerica-east1',
    // Stripe precisa do body cru para validar assinatura
    // rawBody está disponível automaticamente no Firebase Functions v2
  },
  async (req, res) => {
    // Apenas POST
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed')
      return
    }

    // ⚠️ Em produção, valide a assinatura Stripe com:
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    // const sig = req.headers['stripe-signature']!
    // const event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
    // Por ora, confiamos no payload diretamente (adicione validação antes de ir a prod)

    const event = req.body

    logger.info('[stripeWebhook] Evento recebido:', event.type)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const userId: string | undefined = session.metadata?.userId
      const priceId: string | undefined =
        session.metadata?.priceId ||
        session.line_items?.data?.[0]?.price?.id

      if (!userId) {
        logger.warn('[stripeWebhook] userId ausente no metadata da sessão')
        res.status(400).send('userId ausente')
        return
      }

      if (!priceId) {
        logger.warn('[stripeWebhook] priceId ausente')
        res.status(400).send('priceId ausente')
        return
      }

      const userRef = db.collection('users').doc(userId)
      const userSnap = await userRef.get()

      if (!userSnap.exists) {
        logger.warn(`[stripeWebhook] Usuário ${userId} não encontrado`)
        res.status(404).send('Usuário não encontrado')
        return
      }

      // Assinatura mensal
      if (SUBSCRIPTION_PRICE_IDS.has(priceId)) {
        await userRef.update({
          'providerProfile.subscriptionStatus': 'active',
          'providerProfile.subscriptionId': session.subscription || session.id,
          'providerProfile.active': true,
        })
        logger.info(`[stripeWebhook] Assinatura ativada para ${userId}`)
        res.status(200).send('ok')
        return
      }

      // Compra de dias
      const dias = PRICE_TO_DIAS[priceId]
      if (!dias) {
        logger.warn(`[stripeWebhook] priceId desconhecido: ${priceId}`)
        res.status(400).send('priceId desconhecido')
        return
      }

      const data = userSnap.data()!
      const currentExpiry: admin.firestore.Timestamp | null =
        data.providerProfile?.scoreExpiresAt || null

      // Se ainda tem dias restantes, soma em cima do prazo atual
      const baseDate =
        currentExpiry && currentExpiry.toMillis() > Date.now()
          ? currentExpiry.toDate()
          : new Date()

      baseDate.setDate(baseDate.getDate() + dias)
      const newExpiry = admin.firestore.Timestamp.fromDate(baseDate)

      await userRef.update({
        'providerProfile.scoreExpiresAt': newExpiry,
        'providerProfile.diasScore': dias,
        'providerProfile.active': true,
      })

      logger.info(
        `[stripeWebhook] +${dias} dias para ${userId} — expira em ${baseDate.toISOString()}`
      )
    }

    if (event.type === 'customer.subscription.deleted') {
      // Assinatura cancelada/expirada pelo Stripe
      const subscription = event.data.object
      const userId: string | undefined = subscription.metadata?.userId

      if (userId) {
        await db.collection('users').doc(userId).update({
          'providerProfile.subscriptionStatus': 'cancelled',
          'providerProfile.active': false,
        })
        logger.info(`[stripeWebhook] Assinatura cancelada para ${userId}`)
      }
    }

    res.status(200).send('ok')
  }
)
