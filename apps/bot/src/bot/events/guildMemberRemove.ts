import type { GuildMember, PartialGuildMember } from 'discord.js';
import { handleMemberLeave } from '../services/onboarding.js';

export function onGuildMemberRemove(member: GuildMember | PartialGuildMember) {
  if (member.partial) return;
  handleMemberLeave(member as GuildMember).catch(() => {});
}
