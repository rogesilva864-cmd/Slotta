// Workers em processo (lembretes por WhatsApp e avisos ao dono). Fica em um
// arquivo separado, importado só no runtime Node.js, porque dependências como
// web-push usam módulos do Node que não existem no runtime edge.

const globalForWorkers = globalThis as unknown as {
  __reminderWorkerStarted?: boolean;
};

export async function startWorkers() {
  if (process.env.DISABLE_REMINDER_WORKER === 'true') {
    console.log('[reminders] Worker desativado via DISABLE_REMINDER_WORKER.');
    return;
  }

  // Evita registrar o intervalo mais de uma vez (hot-reload em dev, múltiplas chamadas do hook).
  if (globalForWorkers.__reminderWorkerStarted) return;
  globalForWorkers.__reminderWorkerStarted = true;

  const { processDueReminders } = await import('@/lib/reminders/service');
  const { processDailyDigests } = await import('@/lib/owner-notifications');
  const { processBackups } = await import('@/lib/backup');
  const { processReviewRequests } = await import('@/lib/reviews/service');

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
    }
    try {
      const digests = await processDailyDigests();
      if (digests > 0) console.log(`[owner-notifications] resumos diários enviados=${digests}`);
    } catch (error) {
      console.error('[owner-notifications] Erro ao processar resumos diários:', error);
    }
    try {
      const reviews = await processReviewRequests();
      if (reviews.sent + reviews.failed + reviews.skipped > 0) {
        console.log(`[reviews] pedidos de avaliação enviados=${reviews.sent} falhas=${reviews.failed} ignorados=${reviews.skipped}`);
      }
    } catch (error) {
      console.error('[reviews] Erro ao processar pedidos de avaliação:', error);
    }
    try {
      await processBackups();
    } catch (error) {
      console.error('[backup] Erro ao processar backup:', error);
    } finally {
      isRunning = false;
    }
  };

  console.log(`[reminders] Worker de lembretes iniciado (verificando a cada ${intervalMs / 1000}s).`);
  setInterval(tick, intervalMs);
}
