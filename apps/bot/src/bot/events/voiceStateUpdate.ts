import type { VoiceState } from 'discord.js';
import { trackVoiceJoin, trackVoiceLeave } from '../services/scheduler.js';

export function onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
  // Member joined a voice channel
  if (!oldState.channelId && newState.channelId) {
    trackVoiceJoin(newState);
  }
  // Member left a voice channel
  else if (oldState.channelId && !newState.channelId) {
    trackVoiceLeave(oldState);
  }
  // Member moved between voice channels
  else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
    trackVoiceLeave(oldState);
    trackVoiceJoin(newState);
  }
}
