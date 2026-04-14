#!/usr/bin/env bun

import type { Command } from "./lib/command";
import { log, colors } from "./lib/colors";
import { commands as loadedCommands } from "./commands/index";

async function main() {
  const args = Bun.argv.slice(2);
  const commandName = args[0];
  const commands: Command[] = loadedCommands;

  function showHelp() {
    console.log(`\nUsage: dev-agents <command> [subcommand] [options]\n\nCommands:`);
    for (const cmd of commands) {
      console.log(`  ${colors.bold(cmd.name.padEnd(10))}  ${cmd.description}`);
    }
    console.log(`\nRun 'dev-agents <command> --help' for more information.\n`);
  }

  if (!commandName || commandName === "--help" || commandName === "-h") {
    showHelp();
    process.exit(0);
  }

  const command = commands.find((c) => c.name === commandName);
  if (!command) {
    log.error(`Unknown command: ${commandName}`);
    showHelp();
    process.exit(1);
  }

  try {
    await command.handler(args.slice(1));
  } catch (error) {
    log.error(`${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main();
