// Hook oficial do Next.js executado uma vez quando o servidor sobe (requer
// experimental.instrumentationHook em next.config.js). Usado aqui para
// iniciar o worker de lembretes por WhatsApp em processo — sem precisar de
// nenhuma infraestrutura de cron externa, compatível com o deploy atual
// (processo Node único e persistente no Railway).

const globalForReminderWorker = globalThis as unknown as {
  __reminderWorkerStarted?: boolean;
};

export async function register() {
  // Só roda no runtime Node.js real do servidor (evita duplicar no runtime edge/build).
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  if (process.env.DISABLE_REMINDER_WORKER === 'true') {
    console.log('[reminders] Worker desativado via DISABLE_REMINDER_WORKER.');
    return;
  }

  // Evita registrar o intervalo mais de uma vez (hot-reload em dev, múltiplas chamadas do hook).
  if (globalForReminderWorker.__reminderWorkerStarted) return;
  globalForReminderWorker.__reminderWorkerStarted = true;

  const { processDueReminders } = await import('@/lib/reminders/service');

  const intervalSeconds = Number(process.env.REMINDER_WORKER_INTERVAL_SECONDS || 60);
  const intervalMs = Math.max(15, intervalSeconds) * 1000;

  let isRunning = false;

  const tick = async () => {
    if (isRunning) return; // impede sobreposição se uma passada demorar mais que o intervalo
    isRunning = true;
    try {
      const result = await processDueReminders();
      if (result.processed > 0) {
        console.log(
          `[reminders] processados=${result.processed} enviados=${result.sent} falhas=${result.failed} ignorados=${result.skipped}`
        );
      }
    } catch (error) {
      console.error('[reminders] Erro ao processar lembretes:', error);
    } finally {
      isRunning = false;
    }
  };

  console.log(`[reminders] Worker de lembretes iniciado (verificando a cada ${intervalMs / 1000}s).`);
  setInterval(tick, intervalMs);
}
