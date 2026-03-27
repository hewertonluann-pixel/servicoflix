/**
 * mailer.ts — Envio de e-mails transacionais via Nodemailer
 * Usa Gmail como transport. Para produção, considere Resend ou SendGrid.
 */
import * as nodemailer from 'nodemailer';
import { defineSecret } from 'firebase-functions/params';

export const MAIL_USER = defineSecret('MAIL_USER');
export const MAIL_PASS = defineSecret('MAIL_PASS');

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Cria o transporter usando as secrets do Firebase.
 * Deve ser chamado dentro de uma Cloud Function que declare os secrets.
 */
export function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: MAIL_USER.value(),
      pass: MAIL_PASS.value(),
    },
  });
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"Servicoflix" <${MAIL_USER.value()}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
}

// ── Templates ────────────────────────────────────────────────────────────────

export function templateNovaSolicitacao(params: {
  prestadorNome: string;
  clienteNome: string;
  servico: string;
  appUrl: string;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #6366f1; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">🔔 Nova Solicitação de Serviço</h1>
      </div>
      <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
        <p style="color: #374151;">Olá, <strong>${params.prestadorNome}</strong>!</p>
        <p style="color: #374151;">
          O cliente <strong>${params.clienteNome}</strong> enviou uma solicitação para o serviço:
        </p>
        <div style="background: white; border-left: 4px solid #6366f1; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
          <strong style="color: #1f2937;">${params.servico}</strong>
        </div>
        <a href="${params.appUrl}/solicitacoes"
           style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px;
                  border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 8px;">
          Ver Solicitação
        </a>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
          Instale o app Servicoflix para receber notificações em tempo real sem precisar de e-mail.
        </p>
      </div>
    </div>
  `;
}

export function templateNovaMensagem(params: {
  destinatarioNome: string;
  remetenteNome: string;
  previewTexto: string;
  chatUrl: string;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #6366f1; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">💬 Nova Mensagem</h1>
      </div>
      <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
        <p style="color: #374151;">Olá, <strong>${params.destinatarioNome}</strong>!</p>
        <p style="color: #374151;">
          <strong>${params.remetenteNome}</strong> enviou uma mensagem:
        </p>
        <div style="background: white; border-left: 4px solid #6366f1; padding: 12px 16px; margin: 16px 0;
                    border-radius: 4px; color: #4b5563; font-style: italic;">
          "${params.previewTexto}"
        </div>
        <a href="${params.chatUrl}"
           style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px;
                  border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 8px;">
          Responder
        </a>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
          Instale o app Servicoflix para receber notificações em tempo real sem precisar de e-mail.
        </p>
      </div>
    </div>
  `;
}
