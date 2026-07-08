import { getConfig } from './config';
import { getDbPool } from './db';
import { LIVE_EVENTS_QUERY } from './queries';
import dns from 'dns';

// Fix for Node.js fetch failing to resolve .local domains by preferring IPv4
dns.setDefaultResultOrder('ipv4first');

// Allow self-signed certificates for webhook requests
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Type definitions to match AccessEvent
interface AccessEvent {
  PersonId?: string | number;
  Name: string;
  Door: string;
  Zone: string;
  Time: Date; 
  Document: string;
  Type: string;
  PersonType: number;
  PersonImage?: string;
  "Card RFID": string;
  Authorized: boolean;
}

const globalForWorker = global as unknown as { workerStarted?: boolean; lastEventTime?: number };

export function startWebhookWorker() {
  if (globalForWorker.workerStarted) return;
  globalForWorker.workerStarted = true;
  globalForWorker.lastEventTime = 0;

  console.log('[WebhookWorker] Background service started. Polling every 5 seconds.');

  setInterval(async () => {
    try {
      const config = await getConfig().catch(() => null);
      if (!config || !config.webhookEnabled || !config.webhookUrl) {
        return;
      }

      const pool = await getDbPool().catch(() => null);
      if (!pool) return;

      const result = await pool.query(LIVE_EVENTS_QUERY, ['', 1, 0]);
      if (result.rows.length === 0) return;

      const latestEvent = result.rows[0] as AccessEvent;
      const eventTime = new Date(latestEvent.Time).getTime();

      // Initialize the lastEventTime on first fetch without sending to avoid sending old events on startup
      if (globalForWorker.lastEventTime === 0) {
        globalForWorker.lastEventTime = eventTime;
        return;
      }

      if (eventTime > (globalForWorker.lastEventTime || 0)) {
        globalForWorker.lastEventTime = eventTime;

        // Apply filters
        let shouldSend = true;
        if (config.webhookFilterEnabled && config.webhookFilterField && config.webhookFilterValues) {
           const allowedValues = config.webhookFilterValues.split(',').map(v => v.trim()).filter(Boolean);
           if (allowedValues.length > 0) {
              const eventValue = String(latestEvent[config.webhookFilterField as keyof AccessEvent] || '').trim();
              if (!allowedValues.includes(eventValue)) {
                 shouldSend = false;
                 console.log(`[WebhookWorker] Skipped sending webhook: ${config.webhookFilterField} '${eventValue}' not in allowed list.`);
              }
           }
        }

        if (shouldSend) {
          console.log(`[WebhookWorker] New event detected. Sending webhook...`);
          try {
             const res = await fetch(config.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(latestEvent)
             });
             
             if (!res.ok) {
                console.error(`[WebhookWorker] Target returned error: ${res.status} ${res.statusText}`);
             } else {
                console.log(`[WebhookWorker] Webhook sent successfully!`);
             }
          } catch (fetchErr: any) {
             console.error(`[WebhookWorker] Request failed:`, fetchErr.cause?.message || fetchErr.message);
          }
        }
      }
    } catch (err) {
      console.error('[WebhookWorker] Error in polling loop:', err);
    }
  }, 5000);
}
