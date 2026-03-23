// lib/args.ts - Reusable argument parsing utility

interface ParsedArgs {
  flags: Record<string, boolean>;
  options: Record<string, string>;
  positionals: string[];
}

export function parseArguments(argv: string[]): ParsedArgs {
  const flags: Record<string, boolean> = {};
  const options: Record<string, string> = {};
  const positionals: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg) {
      continue;
    }

    if (arg.startsWith("--")) {
      // Long option: --name=value or --flag
      const [key, value] = arg.slice(2).split("=");
      if (!key) {
        continue;
      }
      if (value !== undefined) {
        options[key] = value;
      } else if (argv[i + 1] && !argv[i + 1]?.startsWith("-")) {
        options[key] = argv[++i]!;
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith("-")) {
      // Short option: -n value or -f
      const key = arg.slice(1);
      if (argv[i + 1] && !argv[i + 1]?.startsWith("-")) {
        options[key] = argv[++i]!;
      } else {
        flags[key] = true;
      }
    } else {
      positionals.push(arg);
    }
  }

  return { flags, options, positionals };
}
