// lib/prompt.ts - Interactive prompt utilities

// Simple text input prompt
export async function prompt(question: string): Promise<string> {
  process.stdout.write(question);

  for await (const line of console) {
    return line;
  }

  return "";
}

// Yes/No confirmation prompt
export async function confirm(question: string, defaultValue = false): Promise<boolean> {
  const hint = defaultValue ? "[Y/n]" : "[y/N]";
  const answer = await prompt(`${question} ${hint} `);

  if (answer === "") return defaultValue;
  return answer.toLowerCase().startsWith("y");
}

// Select from a list of options
export async function select<T extends string>(question: string, options: T[]): Promise<T> {
  console.log(question);

  options.forEach((opt, i) => {
    console.log(`  ${i + 1}. ${opt}`);
  });

  const answer = await prompt("Enter number: ");
  const index = parseInt(answer, 10) - 1;

  if (index >= 0 && index < options.length) {
    const selected = options[index];
    if (selected) {
      return selected;
    }
  }

  console.log("Invalid selection, please try again.");
  return select(question, options);
}
