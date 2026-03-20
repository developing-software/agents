// lib/colors.ts - Terminal color utilities using ANSI escape codes

const isColorSupported =
  process.env.FORCE_COLOR !== "0" &&
  (process.env.FORCE_COLOR || process.stdout.isTTY);

// ANSI color codes wrapped in a simple API
export const colors = {
  // Text colors
  red: (text: string) => isColorSupported ? `\x1b[31m${text}\x1b[0m` : text,
  green: (text: string) => isColorSupported ? `\x1b[32m${text}\x1b[0m` : text,
  yellow: (text: string) => isColorSupported ? `\x1b[33m${text}\x1b[0m` : text,
  blue: (text: string) => isColorSupported ? `\x1b[34m${text}\x1b[0m` : text,
  magenta: (text: string) => isColorSupported ? `\x1b[35m${text}\x1b[0m` : text,
  cyan: (text: string) => isColorSupported ? `\x1b[36m${text}\x1b[0m` : text,
  white: (text: string) => isColorSupported ? `\x1b[37m${text}\x1b[0m` : text,
  gray: (text: string) => isColorSupported ? `\x1b[90m${text}\x1b[0m` : text,

  // Text styles
  bold: (text: string) => isColorSupported ? `\x1b[1m${text}\x1b[0m` : text,
  dim: (text: string) => isColorSupported ? `\x1b[2m${text}\x1b[0m` : text,
  italic: (text: string) => isColorSupported ? `\x1b[3m${text}\x1b[0m` : text,
  underline: (text: string) => isColorSupported ? `\x1b[4m${text}\x1b[0m` : text,

  // Background colors
  bgRed: (text: string) => isColorSupported ? `\x1b[41m${text}\x1b[0m` : text,
  bgGreen: (text: string) => isColorSupported ? `\x1b[42m${text}\x1b[0m` : text,
  bgYellow: (text: string) => isColorSupported ? `\x1b[43m${text}\x1b[0m` : text,
  bgBlue: (text: string) => isColorSupported ? `\x1b[44m${text}\x1b[0m` : text,
};

// Semantic helpers for common CLI output patterns
export const log = {
  info: (msg: string) => console.log(colors.blue("ℹ"), msg),
  success: (msg: string) => console.log(colors.green("✓"), msg),
  warning: (msg: string) => console.log(colors.yellow("⚠"), msg),
  error: (msg: string) => console.error(colors.red("✗"), msg),
};
