import { detect } from "detect-port";

interface PortManagerOptions {
  basePort: number;
  maxAttempts: number;
  retryDelayMs: number;
}

class Semaphore {
  private counter = 0;
  private readonly queue: (() => void)[] = [];

  constructor(private readonly max: number) {}

  async acquire(): Promise<void> {
    if (this.counter < this.max) {
      this.counter++;
      return;
    }
    return new Promise((resolve) => this.queue.push(resolve));
  }

  release(): void {
    if (this.queue.length > 0) {
      const resolve = this.queue.shift();
      if (resolve) {
        resolve();
      }
    } else {
      this.counter--;
    }
  }
}

export class PortManager {
  private readonly basePort: number;
  private readonly maxAttempts: number;
  private nextPortToTry: number;
  private readonly retryDelayMs: number;
  private readonly semaphore = new Semaphore(1);
  private readonly usedPorts = new Set<number>();

  constructor(options: PortManagerOptions) {
    this.basePort = options.basePort;
    this.maxAttempts = options.maxAttempts;
    this.retryDelayMs = options.retryDelayMs;
    this.nextPortToTry = this.basePort;
  }

  releasePort(port: number): void {
    this.usedPorts.delete(port);
  }

  async reservePort(): Promise<number> {
    await this.semaphore.acquire();

    try {
      // Start from the base port to reuse any released lower ports
      let port = this.basePort;
      const startingPort = port;
      let attempts = 0;

      while (attempts < this.maxAttempts) {
        while (this.usedPorts.has(port)) {
          port++;
          attempts++;
          if (attempts >= this.maxAttempts) {
            break;
          }
        }

        if (attempts >= this.maxAttempts) {
          break;
        }

        // Use detect to check if the port is actually available on the system
        const detectedPort = await detect(port);

        if (detectedPort === port) {
          this.usedPorts.add(port);
          // Update nextPortToTry to be one past this port, but don't go backwards
          this.nextPortToTry = Math.max(this.nextPortToTry, port + 1);
          return port;
        } else {
          await new Promise((resolve) =>
            setTimeout(resolve, this.retryDelayMs),
          );
          port++;
          attempts++;
        }
      }

      throw new Error(
        `Failed to find an available port after trying ${this.maxAttempts} ports starting from ${startingPort}`,
      );
    } finally {
      this.semaphore.release();
    }
  }
}
