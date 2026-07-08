export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startWebhookWorker } = await import('./lib/webhookWorker');
    startWebhookWorker();
  }
}
