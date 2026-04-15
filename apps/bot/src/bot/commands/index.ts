import { commands } from '../client.js';
import { ping } from './ping.js';
import { analyze } from './analyze.js';

export function registerCommands() {
  const allCommands = [ping, analyze];
  for (const cmd of allCommands) {
    commands.set(cmd.data.name, cmd);
  }
  return allCommands;
}
