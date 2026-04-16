import { client } from '../client.js';
import { onReady } from './ready.js';
import { onInteractionCreate } from './interactionCreate.js';
import { onVoiceStateUpdate } from './voiceStateUpdate.js';
import { onGuildMemberAdd } from './guildMemberAdd.js';
import { onGuildMemberRemove } from './guildMemberRemove.js';
import { onMessageCreate } from './messageCreate.js';

export function registerEvents() {
  client.once('clientReady', onReady);
  client.on('interactionCreate', onInteractionCreate);
  client.on('voiceStateUpdate', onVoiceStateUpdate);
  client.on('guildMemberAdd', onGuildMemberAdd);
  client.on('guildMemberRemove', onGuildMemberRemove);
  client.on('messageCreate', onMessageCreate);
}
