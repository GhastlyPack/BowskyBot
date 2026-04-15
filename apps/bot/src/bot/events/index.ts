import { client } from '../client.js';
import { onReady } from './ready.js';
import { onInteractionCreate } from './interactionCreate.js';
import { onVoiceStateUpdate } from './voiceStateUpdate.js';

export function registerEvents() {
  client.once('clientReady', onReady);
  client.on('interactionCreate', onInteractionCreate);
  client.on('voiceStateUpdate', onVoiceStateUpdate);
}
