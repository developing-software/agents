// lib/spinner.ts - Animated spinner for async operations

const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

class Spinner {
  private message: string;
  private frameIndex = 0;
  private intervalId: Timer | null = null;

  constructor(message: string) {
    this.message = message;
  }

  start() {
    // Hide cursor for cleaner animation
    process.stdout.write("\x1b[?25l");

    this.intervalId = setInterval(() => {
      const frame = spinnerFrames[this.frameIndex];
      process.stdout.write(`\r${frame} ${this.message}`);
      this.frameIndex = (this.frameIndex + 1) % spinnerFrames.length;
    }, 80);
  }

  update(message: string) {
    this.message = message;
  }

  stop(finalMessage?: string) {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Clear line and show cursor
    process.stdout.write("\r\x1b[K");
    process.stdout.write("\x1b[?25h");

    if (finalMessage) {
      console.log(finalMessage);
    }
  }
}

// Helper function for running async tasks with a spinner
export async function withSpinner<T>(message: string, task: () => Promise<T>): Promise<T> {
  const spinner = new Spinner(message);
  spinner.start();

  try {
    const result = await task();
    spinner.stop(`✓ ${message}`);
    return result;
  } catch (error) {
    spinner.stop(`✗ ${message}`);
    throw error;
  }
}
