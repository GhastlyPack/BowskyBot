import { commands } from '../client.js';
import { ping } from './ping.js';
import { analyze } from './analyze.js';
import { roles } from './roles.js';
import { channels } from './channels.js';
import { template } from './template.js';
import { schedule } from './schedule.js';
import { verify } from './verify.js';

export function registerCommands() {
  const allCommands = [ping, analyze, roles, channels, template, schedule, verify];
  for (const cmd of allCommands) {
    commands.set(cmd.data.name, cmd);
  }
  return allCommands;
}
