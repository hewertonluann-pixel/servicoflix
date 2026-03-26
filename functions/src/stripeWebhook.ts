import * as admin from 'firebase-admin'
import { onRequest } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import { defineSecret } from 'firebase-functions/params'
import Stripe from 'stripe'

const db = admin.firestore()

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY')
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET')

// Mapeamento de Price IDs para dias de score
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
    secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET],
  },
  async (req, res) => {
    // Apenas POST
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed')
      return
    }

    // Validar assinatura do Stripe
    const stripe = new Stripe(STRIPE_SECRET_KEY.value())
    const sig = req.headers['stripe-signature']

    if (!sig) {
      logger.warn('[stripeWebhook] stripe-signature ausente')
      res.status(400).send('stripe-signature ausente')
      return
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        (req as any).rawBody,
        sig,
        STRIPE_WEBHOOK_SECRET.value()
      )
    } catch (err: any) {
      logger.warn('[stripeWebhook] Assinatura inválida:', err.message)
      res.status(400).send(`Webhook Error: ${err.message}`)
      return
    }

    logger.info('[stripeWebhook] Evento recebido:', event.type)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const userId: string | undefined = session.metadata?.userId
      const priceId: string | undefined = session.metadata?.priceId

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
          'providerProfile.status': 'ativo',
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
        'providerProfile.status': 'ativo',
        'providerProfile.active': true,
      })

      logger.info(
        `[stripeWebhook] +${dias} dias para ${userId} — expira em ${baseDate.toISOString()}`
      )
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      const userId: string | undefined = subscription.metadata?.userId

      if (userId) {
        await db.collection('users').doc(userId).update({
          'providerProfile.subscriptionStatus': 'cancelled',
          'providerProfile.status': 'expirado',
          'providerProfile.active': false,
        })
        logger.info(`[stripeWebhook] Assinatura cancelada para ${userId}`)
      }
    }

    res.status(200).send('ok')
  }
)
