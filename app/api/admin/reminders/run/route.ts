import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { processDueReminders } from '@/lib/reminders/service';

/**
 * Dispara manualmente o processamento de lembretes — apenas os da própria
 * empresa (nunca de outras). Serve para testar o envio sem esperar o
 * intervalo real (48h/24h/2h): configure o "modo de teste" com um intervalo
 * curto e use este botão para processar na hora.
 */
export async function POST() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const result = await processDueReminders({ companyId: sessionUser.companyId });

  return NextResponse.json({
    message: `Processamento concluído: ${result.sent} enviado(s), ${result.failed} falha(s), ${result.skipped} ignorado(s) de ${result.processed} verificado(s).`,
    result,
  });
}
