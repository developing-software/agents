// lib/progress.ts - Progress bar for operations with known length

export class ProgressBar {
  private total: number;
  private current = 0;
  private width = 40;
  private label: string;

  constructor(total: number, label = "Progress") {
    this.total = total;
    this.label = label;
  }

  update(current: number) {
    this.current = current;
    this.render();
  }

  increment(amount = 1) {
    this.current += amount;
    this.render();
  }

  private render() {
    const percentage = Math.min(100, Math.round((this.current / this.total) * 100));
    const filled = Math.round((this.current / this.total) * this.width);
    const empty = this.width - filled;

    const bar = "█".repeat(filled) + "░".repeat(empty);
    const output = `\r${this.label}: [${bar}] ${percentage}% (${this.current}/${this.total})`;

    process.stdout.write(output);

    if (this.current >= this.total) {
      console.log(); // New line when complete
    }
  }

  complete() {
    this.current = this.total;
    this.render();
  }
}
