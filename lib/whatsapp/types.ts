// Tipos do serviço de WhatsApp. Mantidos independentes de qualquer provedor
// específico para permitir trocar a implementação (Meta Cloud API, Twilio,
// outro gateway) sem alterar a lógica principal do Slotta que consome
// `sendWhatsappMessage`.

export type WhatsappTemplateType = 'APPOINTMENT_CONFIRMED' | 'APPOINTMENT_REMINDER' | 'APPOINTMENT_CANCELLED';

export type WhatsappSendRequest = {
  to: string;
  templateType: WhatsappTemplateType;
  variables: Record<string, string>;
  /** Texto já renderizado (fallback para provedores baseados em texto livre e para o provider de console/dev). */
  renderedText: string;
};

export type WhatsappSendResult =
  | { success: true; providerMessageId?: string }
  | { success: false; error: string };

export interface WhatsappProvider {
  name: string;
  send(request: WhatsappSendRequest): Promise<WhatsappSendResult>;
}
