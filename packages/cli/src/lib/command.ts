export type CommandHandler = (args: string[]) => Promise<void> | void;

export interface Command {
  name: string;
  description: string;
  handler: CommandHandler;
}
