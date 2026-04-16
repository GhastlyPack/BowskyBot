import { Router, type Request, type Response } from 'express';
import { verifyWebhookSignature, processFanBasisEvent, type FanBasisWebhookPayload } from '../../bot/services/fanbasis.js';
import { logger } from '../../lib/logger.js';

const router = Router();

const GUILD_ID = process.env.DISCORD_GUILD_ID || '1055579007107727441';

/**
 * POST /api/v1/webhooks/fanbasis
 *
 * FanBasis will POST payment events here.
 * No auth middleware — verified by webhook signature instead.
 *
 * To test manually:
 * curl -X POST http://localhost:3001/api/v1/webhooks/fanbasis \
 *   -H "Content-Type: application/json" \
 *   -d '{"event":"payment.success","timestamp":"...","data":{"discordId":"USER_ID","productId":"..."}}'
 */
router.post('/fanbasis', async (req: Request, res: Response) => {
  const webhookSecret = process.env.FANBASIS_WEBHOOK_SECRET;

  // Verify signature if secret is configured
  if (webhookSecret) {
    const signature = req.headers['x-fanbasis-signature'] as string
      || req.headers['x-webhook-signature'] as string
      || '';

    const rawBody = JSON.stringify(req.body);
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      logger.warn('FanBasis webhook: invalid signature');
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }
  } else {
    logger.warn('FanBasis webhook: no secret configured — accepting without verification');
  }

  const payload = req.body as FanBasisWebhookPayload;

  if (!payload.event) {
    res.status(400).json({ error: 'Missing event field' });
    return;
  }

  logger.info(`FanBasis webhook received: ${payload.event}`);

  try {
    const result = await processFanBasisEvent(GUILD_ID, payload);
    res.json({ ok: true, action: result.action, details: result.details });
  } catch (err: any) {
    logger.error(err, 'FanBasis webhook processing failed');
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v1/webhooks/fanbasis/test
 *
 * Test endpoint — simulates a FanBasis payment event.
 * Requires API key auth (applied at the router level in server.ts).
 */
router.post('/fanbasis/test', async (req: Request, res: Response) => {
  const { discordId, event, tier } = req.body;

  if (!discordId) {
    res.status(400).json({ success: false, error: 'discordId is required' });
    return;
  }

  const payload: FanBasisWebhookPayload = {
    event: event || 'payment.success',
    timestamp: new Date().toISOString(),
    data: {
      discordId,
      productId: tier === 'boardroom' ? 'test_boardroom' : 'test_blueprint',
    },
  };

  try {
    const result = await processFanBasisEvent(GUILD_ID, payload);
    res.json({ ok: true, action: result.action, details: result.details });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export { router as webhooksRouter };
