import type { WhatsappProvider, WhatsappSendRequest, WhatsappSendResult } from '../types';

/**
 * Provider padrão usado quando nenhum provedor real de WhatsApp está
 * configurado (sem WHATSAPP_PROVIDER no .env). Não envia nada de verdade —
 * apenas registra a mensagem no log do servidor, para permitir desenvolver e
 * testar o fluxo de lembretes sem depender de credenciais externas.
 *
 * Mesmo padrão usado em lib/mailer.ts para o e-mail de recuperação de senha.
 */
export class ConsoleWhatsappProvider implements WhatsappProvider {
  name = 'console';

  async send(request: WhatsappSendRequest): Promise<WhatsappSendResult> {
    console.warn(
      `[whatsapp:console] Nenhum provedor de WhatsApp configurado. Mensagem para ${request.to} (${request.templateType}):\n${request.renderedText}`
    );
    return { success: true, providerMessageId: `console-${Date.now()}` };
  }
}
