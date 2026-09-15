import { renderWhatsappTemplate } from './templates';
import { ConsoleWhatsappProvider } from './providers/console-provider';
import { MetaCloudWhatsappProvider } from './providers/meta-cloud-provider';
import type { WhatsappProvider, WhatsappSendResult, WhatsappTemplateType } from './types';

export * from './types';
export { renderWhatsappTemplate } from './templates';

let cachedProvider: WhatsappProvider | null = null;

/**
 * Ponto único de acesso ao provedor de WhatsApp configurado. Trocar de
 * provedor no futuro (ex: sair da Meta Cloud API para outro gateway) exige
 * apenas adicionar a implementação em `providers/` e um novo `case` aqui —
 * nenhuma lógica que já usa `sendWhatsappMessage` precisa mudar.
 */
function getProvider(): WhatsappProvider {
  if (cachedProvider) return cachedProvider;

  const providerName = process.env.WHATSAPP_PROVIDER;

  switch (providerName) {
    case 'meta':
      cachedProvider = new MetaCloudWhatsappProvider();
      break;
    default:
      cachedProvider = new ConsoleWhatsappProvider();
  }

  return cachedProvider;
}

/** Converte um telefone em formato livre (ex: "(11) 99999-9999") para E.164 assumindo Brasil (+55). */
export function normalizePhoneToE164(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  return `55${digits}`;
}

export async function sendWhatsappMessage(params: {
  to: string;
  templateType: WhatsappTemplateType;
  variables: Record<string, string>;
}): Promise<WhatsappSendResult> {
  const provider = getProvider();
  const renderedText = renderWhatsappTemplate(params.templateType, params.variables);

  return provider.send({
    to: normalizePhoneToE164(params.to),
    templateType: params.templateType,
    variables: params.variables,
    renderedText,
  });
}
