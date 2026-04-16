import type { Message } from 'discord.js';
import { handleTicketMessage } from '../services/tickets.js';

export async function onMessageCreate(message: Message) {
  if (message.author.bot) return;
  // Route to ticket handler (it checks if the channel is an active ticket)
  await handleTicketMessage(message);
}
