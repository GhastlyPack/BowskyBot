import { ChannelType, type Message } from 'discord.js';
import { handleTicketMessage, handleDmMessage } from '../services/tickets.js';

export async function onMessageCreate(message: Message) {
  if (message.author.bot) return;

  // DM messages — route to DM verification handler
  if (message.channel.type === ChannelType.DM) {
    await handleDmMessage(message);
    return;
  }

  // Server messages — route to ticket handler
  await handleTicketMessage(message);
}
