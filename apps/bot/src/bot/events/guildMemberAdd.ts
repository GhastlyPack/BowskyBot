import type { GuildMember } from 'discord.js';
import { handleMemberJoin } from '../services/onboarding.js';

export function onGuildMemberAdd(member: GuildMember) {
  handleMemberJoin(member).catch(() => {});
}
