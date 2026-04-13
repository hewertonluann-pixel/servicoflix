import * as admin from 'firebase-admin'
import { onRequest } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import { defineSecret } from 'firebase-functions/params'
import Stripe from 'stripe'

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY')

// Price IDs reais do seu painel Stripe — ajuste se necessário
const VALID_PRICE_IDS = new Set([
  'price_1TELvUEW46ts4yeZGUhuQvqJ', // R$ 29,90 — 30 dias 
  'price_1TELx3EW46ts4yeZzW1RUOGM', // R$ 49,90 — 60 dias
  'price_1TELxtEW46ts4yeZQyVS9zHa', // R$ 69,90 — 90 dias
  'price_1TEV5OEW46ts4yeZ6YjmgEkC', //  Price ID da assinatura mensal
])

const SUBSCRIPTION_PRICE_IDS = new Set([
  'price_1TEV5OEW46ts4yeZ6YjmgEkC', //  Price ID da assinatura mensal
])

export const createCheckoutSession = onRequest(
  {
    region: 'southamerica-east1',
    secrets: [STRIPE_SECRET_KEY],
    cors: true,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed')
      return
    }

    const { userId, priceId, successUrl, cancelUrl } = req.body

    // Validações
    if (!userId || typeof userId !== 'string') {
      res.status(400).json({ error: 'userId obrigatório' })
      return
    }
    if (!priceId || !VALID_PRICE_IDS.has(priceId)) {
      res.status(400).json({ error: 'priceId inválido' })
      return
    }
    if (!successUrl || !cancelUrl) {
      res.status(400).json({ error: 'successUrl e cancelUrl obrigatórios' })
      return
    }

    // Verifica se usuário existe e é prestador
    const userSnap = await admin.firestore().collection('users').doc(userId).get()
    if (!userSnap.exists) {
      res.status(404).json({ error: 'Usuário não encontrado' })
      return
    }
    const roles: string[] = userSnap.data()?.roles || []
    if (!roles.includes('provider')) {
      res.status(403).json({ error: 'Acesso restrito a prestadores' })
      return
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY.value())
    const isSubscription = SUBSCRIPTION_PRICE_IDS.has(priceId)

    try {
      const session = await stripe.checkout.sessions.create({
        mode: isSubscription ? 'subscription' : 'payment',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        metadata: {
          userId,
          priceId,
        },
        // Para assinaturas, o metadata também precisa ir no subscription
        ...(isSubscription && {
          subscription_data: {
            metadata: { userId, priceId },
          },
        }),
        success_url: successUrl,
        cancel_url: cancelUrl,
        locale: 'pt-BR',
        payment_method_types: ['card'],
      })

      logger.info(`[createCheckoutSession] Sessão criada: ${session.id} para userId: ${userId}`)
      res.status(200).json({ url: session.url })
    } catch (err: any) {
      logger.error('[createCheckoutSession] Erro ao criar sessão:', err.message)
      res.status(500).json({ error: 'Erro interno ao criar sessão de pagamento' })
    }
  }
)
