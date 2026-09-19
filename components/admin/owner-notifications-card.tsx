'use client';

import { useCallback, useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';

type PushState = 'loading' | 'unsupported' | 'ios-install' | 'not-configured' | 'denied' | 'off' | 'on';

function urlBase64ToUint8Array(base64: string) {
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

export function OwnerNotificationsCard() {
  const [pushState, setPushState] = useState<PushState>('loading');
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [emailFallback, setEmailFallback] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [configResponse, settingsResponse] = await Promise.all([
      fetch('/api/admin/push/config'),
      fetch('/api/admin/notification-settings'),
    ]);
    const config = await configResponse.json();
    const settings = await settingsResponse.json();
    setPublicKey(config.publicKey ?? null);
    setEmailFallback(Boolean(settings.notifyEmailFallback));
    setDailyDigest(Boolean(settings.notifyDailyDigest));

    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setPushState(isIos() && !isStandalone() ? 'ios-install' : 'unsupported');
      return;
    }
    if (!config.publicKey) {
      setPushState('not-configured');
      return;
    }
    if (Notification.permission === 'denied') {
      setPushState('denied');
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    setPushState(subscription && Notification.permission === 'granted' ? 'on' : 'off');
  }, []);

  useEffect(() => {
    refresh().catch(() => setPushState('unsupported'));
  }, [refresh]);

  const enablePush = async () => {
    if (!publicKey) return;
    setBusy(true);
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushState(permission === 'denied' ? 'denied' : 'off');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const response = await fetch('/api/admin/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) throw new Error('Falha ao salvar a inscrição.');

      setPushState('on');
      setMessage('Notificações ativadas neste aparelho.');
    } catch {
      setMessage('Não foi possível ativar as notificações neste aparelho.');
    } finally {
      setBusy(false);
    }
  };

  const disablePush = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch('/api/admin/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setPushState('off');
      setMessage('Notificações desativadas neste aparelho.');
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    setMessage(null);
    const response = await fetch('/api/admin/push/test', { method: 'POST' });
    const data = await response.json();
    setMessage(data.message);
    setBusy(false);
  };

  const savePreference = async (patch: { notifyEmailFallback?: boolean; notifyDailyDigest?: boolean }) => {
    if (patch.notifyEmailFallback !== undefined) setEmailFallback(patch.notifyEmailFallback);
    if (patch.notifyDailyDigest !== undefined) setDailyDigest(patch.notifyDailyDigest);
    await fetch('/api/admin/notification-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
  };

  return (
    <section className="card p-5 md:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
          <BellRing size={20} aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Avisos para você</h2>
          <p className="mt-1 text-sm text-slate-300">
            Receba no celular um alerta a cada novo pedido de agendamento, para não perder nenhum cliente.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
        {pushState === 'loading' ? <p className="text-sm text-slate-400">Verificando este aparelho...</p> : null}

        {pushState === 'unsupported' ? (
          <p className="text-sm text-slate-300">
            Este navegador não suporta notificações. Use o Chrome no Android ou o Safari no iPhone (com o Slotta na tela inicial).
          </p>
        ) : null}

        {pushState === 'ios-install' ? (
          <p className="text-sm text-slate-300">
            No iPhone, primeiro adicione o Slotta à tela inicial: toque em <strong>Compartilhar</strong> e depois em{' '}
            <strong>Adicionar à Tela de Início</strong>. Abra o Slotta por esse ícone e volte aqui para ativar. Requer iOS 16.4 ou mais novo.
          </p>
        ) : null}

        {pushState === 'not-configured' ? (
          <p className="text-sm text-amber-200">As notificações ainda não estão habilitadas no servidor. Avise o suporte do Slotta.</p>
        ) : null}

        {pushState === 'denied' ? (
          <p className="text-sm text-amber-200">
            A permissão de notificações está bloqueada neste aparelho. Libere nas configurações do navegador (ícone de cadeado ao lado do endereço) e recarregue a página.
          </p>
        ) : null}

        {pushState === 'off' ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-300">
              Notificações <strong>desativadas</strong> neste aparelho.
            </p>
            <button type="button" className="btn-primary" onClick={enablePush} disabled={busy}>
              Ativar notificações neste aparelho
            </button>
          </div>
        ) : null}

        {pushState === 'on' ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-emerald-300">
              Notificações <strong>ativas</strong> neste aparelho.
            </p>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" onClick={sendTest} disabled={busy}>
                Enviar teste
              </button>
              <button type="button" className="btn-secondary" onClick={disablePush} disabled={busy}>
                Desativar
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-5 space-y-3">
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-brand-500"
            checked={emailFallback}
            onChange={(event) => savePreference({ notifyEmailFallback: event.target.checked })}
          />
          <span>
            <span className="font-medium">Avisar por e-mail quando eu não tiver notificação ativa</span>
            <span className="block text-slate-400">Se nenhum aparelho estiver com notificações ativas, o pedido chega no seu e-mail de login.</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-brand-500"
            checked={dailyDigest}
            onChange={(event) => savePreference({ notifyDailyDigest: event.target.checked })}
          />
          <span>
            <span className="font-medium">Resumo da agenda do dia, toda manhã</span>
            <span className="block text-slate-400">
              Enviado por e-mail e notificação por volta das 7h30 (horário de Brasília), só nos dias com horários marcados.
            </span>
          </span>
        </label>
      </div>

      {message ? <p className="mt-4 text-sm text-cyan-200">{message}</p> : null}
    </section>
  );
}
