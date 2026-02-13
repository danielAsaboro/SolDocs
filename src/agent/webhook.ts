import { Documentation } from '../types';

export interface WebhookPayload {
  event: 'doc.completed';
  programId: string;
  name: string;
  timestamp: string;
  documentation: {
    overview: string;
    instructionCount: number;
    idlHash: string;
    generatedAt: string;
  };
}

export async function sendWebhookNotification(
  webhookUrl: string,
  docs: Documentation,
): Promise<void> {
  const payload: WebhookPayload = {
    event: 'doc.completed',
    programId: docs.programId,
    name: docs.name,
    timestamp: new Date().toISOString(),
    documentation: {
      overview: docs.overview.slice(0, 500),
      instructionCount: docs.instructions.split('###').length - 1 || 1,
      idlHash: docs.idlHash,
      generatedAt: docs.generatedAt,
    },
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Webhook returned HTTP ${response.status}`);
  }
}
