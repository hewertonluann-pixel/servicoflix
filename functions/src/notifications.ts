/**
 * notifications.ts — Cloud Functions de notificação
 *
 * Lógica:
 *   - Usuário COM fcmToken → envia Push via FCM
 *   - Usuário SEM fcmToken (ou token inválido) → envia e-mail
 *
 * Triggers:
 *   1. onNovaSolicitacao  — nova doc em /solicitacoes
 *   2. onNovaMensagemChat — nova doc em /chats/{chatId}/mensagens
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

/**
 * Envia push FCM. Retorna true se enviou com sucesso.
 * Se o token for inválido/expirado, remove-o do Firestore e retorna false.
 */
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
          icon: `${APP_URL}/icons/icon-192x192.png`,
          badge: `${APP_URL}/icons/icon-72x72.png`,
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
      logger.warn(`[Push] Token inválido para ${userId} — removendo do Firestore.`);
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

// ── Trigger 1: Nova Solicitação de Serviço ─────────────────────────────────────

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
    if (!prestadorId) {
      logger.warn('[onNovaSolicitacao] Sem prestadorId na solicitação.');
      return;
    }

    const prestador = await getUserData(prestadorId);
    if (!prestador) {
      logger.warn(`[onNovaSolicitacao] Prestador ${prestadorId} não encontrado.`);
      return;
    }

    const title = '🔔 Nova solicitação de serviço!';
    const body = `${clienteNome} quer contratar: ${servico}`;
    const pushUrl = `${APP_URL}/solicitacoes`;

    // Tenta push; se falhar (token inválido), cai no e-mail
    if (prestador.fcmToken) {
      const sent = await sendPush(prestadorId, prestador.fcmToken, title, body, { url: pushUrl });
      if (sent) return;
    }

    // Fallback: e-mail
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
      logger.info(`[onNovaSolicitacao] E-mail enviado para ${prestador.email}`);
    }
  }
);

// ── Trigger 2: Nova Mensagem no Chat ──────────────────────────────────────────

export const onNovaMensagemChat = onDocumentCreated(
  {
    document: 'chats/{chatId}/mensagens/{msgId}',
    region: REGION,
    secrets: [MAIL_USER, MAIL_PASS],
  },
  async (event) => {
    const msg = event.data?.data();
    if (!msg) return;

    const { paraId, deId, texto } = msg;
    if (!paraId || !deId || paraId === deId) return;

    const [destinatario, remetente] = await Promise.all([
      getUserData(paraId),
      getUserData(deId),
    ]);

    if (!destinatario) {
      logger.warn(`[onNovaMensagemChat] Destinatário ${paraId} não encontrado.`);
      return;
    }

    const remetenteNome =
      remetente?.displayName ||
      remetente?.providerProfile?.professionalName ||
      'Alguém';
    const previewTexto = (texto as string)?.slice(0, 120) || '(mídia)';
    const title = '💬 Nova mensagem no Servicoflix';
    const body = `${remetenteNome}: ${previewTexto}`;
    const chatUrl = `${APP_URL}/chat/${event.params.chatId}`;

    if (destinatario.fcmToken) {
      const sent = await sendPush(paraId, destinatario.fcmToken, title, body, { url: chatUrl });
      if (sent) return;
    }

    if (destinatario.email) {
      await sendEmail({
        to: destinatario.email,
        subject: `💬 ${remetenteNome} enviou uma mensagem`,
        html: templateNovaMensagem({
          destinatarioNome: destinatario.displayName || 'Usuário',
          remetenteNome,
          previewTexto,
          chatUrl,
        }),
      });
      logger.info(`[onNovaMensagemChat] E-mail enviado para ${destinatario.email}`);
    }
  }
);
