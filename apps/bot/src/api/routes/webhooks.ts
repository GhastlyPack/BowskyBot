import { Router, type Request, type Response } from 'express';
import { recordPurchase, listPurchases, getPurchaseStats } from '../../bot/services/purchases.js';
import { logger } from '../../lib/logger.js';

const router = Router();

/**
 * POST /api/v1/webhooks/fanbasis
 *
 * Zapier sends purchase data here when someone checks out on FanBasis.
 * We record the purchase in our DB. User then verifies in Discord via /verify.
 *
 * Expected payload from Zapier:
 * {
 *   "email": "buyer@example.com",
 *   "tier": "blueprint" | "boardroom",
 *   "amount": 99,
 *   "fanbasisId": "txn_abc123"   // optional
 * }
 */
router.post('/fanbasis', async (req: Request, res: Response) => {
  const { email, tier, amount, fanbasisId, ...rest } = req.body;

  if (!email) {
    res.status(400).json({ ok: false, error: 'email is required' });
    return;
  }

  const validTier = tier === 'boardroom' ? 'boardroom' : 'blueprint';

  logger.info(`Webhook: New purchase — ${email} → ${validTier}`);

  try {
    const purchase = recordPurchase({
      email,
      tier: validTier,
      amount,
      fanbasisId,
      metadata: Object.keys(rest).length > 0 ? rest : undefined,
    });

    res.json({
      ok: true,
      message: `Purchase recorded. User can verify in Discord with /verify.`,
      purchaseId: purchase.id,
    });
  } catch (err: any) {
    logger.error(err, 'Failed to record purchase');
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/v1/webhooks/fanbasis/purchases
 *
 * List all purchases (admin — requires API key via parent auth middleware).
 * This route is behind the auth middleware since it's under /api/v1/.
 * Access it via the /api/v1/purchases alias below or directly.
 */
router.get('/fanbasis/purchases', (_req: Request, res: Response) => {
  const purchases = listPurchases();
  const stats = getPurchaseStats();
  res.json({ ok: true, stats, data: purchases });
});

export { router as webhooksRouter };
