#!/usr/bin/env bun

// cli.ts - CLI with subcommand support

import type { Command } from "./lib/command";

// Define available commands with their handlers
const commands: Command[] = [
  {
    name: "init",
    description: "Initialize a new project",
    handler: handleInit,
  },
  {
    name: "build",
    description: "Build the project",
    handler: handleBuild,
  },
  {
    name: "deploy",
    description: "Deploy to production",
    handler: handleDeploy,
  },
];

async function handleInit(args: string[]) {
  const projectName = args[0] || "my-project";
  console.log(`Initializing project: ${projectName}`);
  // Implementation here
}

async function handleBuild(args: string[]) {
  const target = args[0] || "production";
  console.log(`Building for: ${target}`);
  // Implementation here
}

async function handleDeploy(args: string[]) {
  console.log("Deploying to production...");
  // Implementation here
}

function showHelp() {
  console.log(`
Usage: my-cli <command> [options]

Commands:`);

  for (const cmd of commands) {
    console.log(`  ${cmd.name.padEnd(12)} ${cmd.description}`);
  }

  console.log(`
Run 'my-cli <command> --help' for more information on a command.`);
}

// Main execution logic
async function main() {
  const args = Bun.argv.slice(2);
  const commandName = args[0];

  if (!commandName || commandName === "--help" || commandName === "-h") {
    showHelp();
    process.exit(0);
  }

  const command = commands.find((c) => c.name === commandName);

  if (!command) {
    console.error(`Unknown command: ${commandName}`);
    showHelp();
    process.exit(1);
  }

  try {
    await command.handler(args.slice(1));
  } catch (error) {
    console.error(`Error executing ${commandName}:`, error);
    process.exit(1);
  }
}

main();
