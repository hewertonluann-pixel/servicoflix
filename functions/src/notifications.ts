/**
 * notifications.ts — Cloud Functions de notificação
 *
 * Lógica:
 *   - Usuário COM fcmToken → envia Push via FCM
 *   - Usuário SEM fcmToken (ou token inválido) → envia e-mail
 *
 * Triggers:
 *   1. onNovaSolicitacao  — nova doc em /solicitacoes
 *   2. onNovaMensagemChat — nova doc em /chats/{chatId}/messages/{messageId}
 */
import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions/v2';
import {
  sendEmail,
  templateNovaSolicitacao,
  templateNovaMensagem,
  MAIL_USER,
  MAIL_PASS,
} from './mailer';

const APP_URL = 'https://servicoflix.com.br';
const REGION = 'southamerica-east1';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getUserData(userId: string) {
  const snap = await admin.firestore().doc(`users/${userId}`).get();
  return snap.exists ? (snap.data() as Record<string, any>) : null;
}

async function sendPush(
  userId: string,
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  try {
    await admin.messaging().send({
      token,
      notification: { title, body },
      data: data || {},
      webpush: {
        notification: {
          title,
          body,
          icon: `${APP_URL}/icon-192.png`,
          badge: `${APP_URL}/icon-192.png`,
        },
        fcmOptions: { link: data?.url || APP_URL },
      },
    });
    logger.info(`[Push] Enviado para ${userId}`);
    return true;
  } catch (error: any) {
    const invalidTokenCodes = [
      'messaging/registration-token-not-registered',
      'messaging/invalid-registration-token',
    ];
    if (invalidTokenCodes.includes(error?.code)) {
      logger.warn(`[Push] Token inválido para ${userId} — removendo.`);
      await admin.firestore().doc(`users/${userId}`).update({
        fcmToken: null,
        fcmTokenUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      logger.error(`[Push] Erro inesperado para ${userId}:`, error);
    }
    return false;
  }
}

// ── Trigger 1: Nova Solicitação de Serviço ────────────────────────────────────

export const onNovaSolicitacao = onDocumentCreated(
  {
    document: 'solicitacoes/{solicitacaoId}',
    region: REGION,
    secrets: [MAIL_USER, MAIL_PASS],
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const { prestadorId, clienteNome, servico } = data;
    if (!prestadorId) return;

    const prestador = await getUserData(prestadorId);
    if (!prestador) return;

    const title = '🔔 Nova solicitação de serviço!';
    const body = `${clienteNome} quer contratar: ${servico}`;
    const pushUrl = `${APP_URL}/solicitacoes`;

    if (prestador.fcmToken) {
      const sent = await sendPush(prestadorId, prestador.fcmToken, title, body, { url: pushUrl });
      if (sent) return;
    }

    if (prestador.email) {
      await sendEmail({
        to: prestador.email,
        subject: '🔔 Nova solicitação de serviço no Servicoflix',
        html: templateNovaSolicitacao({
          prestadorNome: prestador.displayName || prestador.providerProfile?.professionalName || 'Prestador',
          clienteNome,
          servico,
          appUrl: APP_URL,
        }),
      });
    }
  }
);

// ── Trigger 2: Nova Mensagem no Chat ──────────────────────────────────────────

export const onNovaMensagemChat = onDocumentCreated(
  {
    document: 'chats/{chatId}/messages/{messageId}', // ✅ path correto
    region: REGION,
    secrets: [MAIL_USER, MAIL_PASS],
  },
  async (event) => {
    const msg = event.data?.data();
    if (!msg) return;

    const { senderId, text } = msg; // ✅ campos corretos
    if (!senderId || !text) return;

    // Busca participantes no documento pai do chat
    const chatSnap = await admin
      .firestore()
      .doc(`chats/${event.params.chatId}`)
      .get();

    if (!chatSnap.exists) return;

    const chatData = chatSnap.data() as Record<string, any>;
    const participants: string[] = chatData.participants || [];

    // Destinatário é o participante que NÃO enviou a mensagem
    const receiverId = participants.find((p) => p !== senderId);
    if (!receiverId) return;

    const [destinatario, remetente] = await Promise.all([
      getUserData(receiverId),
      getUserData(senderId),
    ]);

    if (!destinatario) return;

    const remetenteNome =
      remetente?.name ||
      remetente?.providerProfile?.professionalName ||
      'Alguém';
    const previewTexto = (text as string)?.slice(0, 120) || '(mídia)';
    const title = '💬 Nova mensagem no Servicoflix';
    const body = `${remetenteNome}: ${previewTexto}`;
    const chatUrl = `${APP_URL}/chat/${event.params.chatId}`;

    if (destinatario.fcmToken) {
      const sent = await sendPush(receiverId, destinatario.fcmToken, title, body, { url: chatUrl });
      if (sent) return;
    }

    if (destinatario.email) {
      await sendEmail({
        to: destinatario.email,
        subject: `💬 ${remetenteNome} enviou uma mensagem`,
        html: templateNovaMensagem({
          destinatarioNome: destinatario.name || 'Usuário',
          remetenteNome,
          previewTexto,
          chatUrl,
        }),
      });
    }
  }
);
