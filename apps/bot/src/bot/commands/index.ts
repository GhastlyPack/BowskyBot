import { commands } from '../client.js';
import { ping } from './ping.js';

export function registerCommands() {
  const allCommands = [ping];
  for (const cmd of allCommands) {
    commands.set(cmd.data.name, cmd);
  }
  return allCommands;
}
