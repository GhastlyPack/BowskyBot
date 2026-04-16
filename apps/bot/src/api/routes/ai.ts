import { Router } from 'express';
import { handleAiChat } from '../../lib/claude.js';
import { logger } from '../../lib/logger.js';

const router = Router();

// POST /api/v1/servers/:serverId/ai/chat
router.post('/:serverId/ai/chat', async (req, res) => {
  const { message, conversationId } = req.body;

  if (!message) {
    res.status(400).json({ success: false, error: 'message is required' });
    return;
  }

  try {
    logger.info(`AI chat: "${message.slice(0, 100)}"`);
    const result = await handleAiChat(req.params.serverId, message, conversationId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error(error, 'AI chat failed');
    res.status(500).json({ success: false, error: error.message });
  }
});

export { router as aiRouter };
