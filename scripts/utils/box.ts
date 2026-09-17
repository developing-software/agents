/** Frames lines in a box so the one line that matters stands out of the log stream. */
export function boxed(lines: string[]) {
  const width = Math.max(...lines.map((line) => line.length));
  const rule = "═".repeat(width + 2);
  return [
    "",
    `╔${rule}╗`,
    ...lines.map((line) => `║ ${line.padEnd(width, " ")} ║`),
    `╚${rule}╝`,
    "",
  ].join("\n");
}
