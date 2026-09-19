import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { sendPushToUser } from '@/lib/push';

export async function POST() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const delivered = await sendPushToUser(sessionUser.id, {
    title: 'Slotta',
    body: 'Tudo certo! As notificações estão funcionando neste aparelho.',
    url: '/admin',
    tag: 'push-test',
  });

  if (delivered === 0) {
    return NextResponse.json({ message: 'Nenhum aparelho ativo encontrado. Ative as notificações primeiro.' }, { status: 409 });
  }

  return NextResponse.json({ message: `Notificação de teste enviada para ${delivered} aparelho(s).` });
}
