// Hook oficial do Next.js executado uma vez quando o servidor sobe (requer
// experimental.instrumentationHook em next.config.js). Usado para iniciar os
// workers em processo (lembretes por WhatsApp e avisos ao dono) — sem precisar
// de nenhuma infraestrutura de cron externa, compatível com o deploy atual
// (processo Node único e persistente no Railway).

export async function register() {
  // Só roda no runtime Node.js real do servidor (evita duplicar no runtime edge/build).
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startWorkers } = await import('./instrumentation-node');
    await startWorkers();
  }
}
