/**
 * notifications.ts — Cloud Functions de notificação
 *
 * IMPORTANTE: O trigger do Firestore é gerenciado manualmente via gcloud
 * porque o banco está em nam5 e a função em southamerica-east1.
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

export const onNovaMensagemChat = onDocumentCreated(
  {
    document: 'chats/{chatId}/messages/{messageId}',
    region: REGION,
    secrets: [MAIL_USER, MAIL_PASS],
  },
  async (event) => {
    logger.info('[Chat] Trigger disparado', { chatId: event.params.chatId, messageId: event.params.messageId });

    const msg = event.data?.data();
    logger.info('[Chat] Dados da mensagem:', JSON.stringify(msg));

    if (!msg) {
      logger.warn('[Chat] msg é null/undefined — abortando');
      return;
    }

    const { senderId, text } = msg;
    logger.info(`[Chat] senderId=${senderId} text=${text}`);

    if (!senderId || !text) {
      logger.warn(`[Chat] senderId ou text vazio — abortando. senderId=${senderId} text=${text}`);
      return;
    }

    const chatSnap = await admin
      .firestore()
      .doc(`chats/${event.params.chatId}`)
      .get();

    if (!chatSnap.exists) {
      logger.warn(`[Chat] Chat ${event.params.chatId} não encontrado`);
      return;
    }

    const chatData = chatSnap.data() as Record<string, any>;
    const participants: string[] = chatData.participants || [];
    logger.info('[Chat] Participantes:', JSON.stringify(participants));

    const receiverId = participants.find((p) => p !== senderId);
    if (!receiverId) {
      logger.warn('[Chat] receiverId não encontrado');
      return;
    }

    const [destinatario, remetente] = await Promise.all([
      getUserData(receiverId),
      getUserData(senderId),
    ]);

    if (!destinatario) {
      logger.warn(`[Chat] Destinatário ${receiverId} não encontrado no Firestore`);
      return;
    }

    logger.info(`[Chat] fcmToken destinatário: ${destinatario.fcmToken ? 'presente' : 'ausente'}`);

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
      logger.info(`[Chat] Enviando e-mail para ${destinatario.email}`);
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
