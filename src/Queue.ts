import type { AnyCall } from './types';
import type Config from './Config';

export default class Queue {
  #config: Config;
  #queue: AnyCall[] = [];
  #flushing: boolean = false;
  #flushTimeout: any | null = null;

  constructor(config: Config) {
    this.#config = config;
  }

  push(call: AnyCall): void {
    this.#queue = [...this.#queue, call];
    if (!this.#flushTimeout) {
      this.#flushTimeout = setTimeout(this.flushSafely, 10000);
    }
    this._checkFlush();
  }

  _checkFlush(): void {
    if (this.#queue.length > 10) {
      this.flushSafely();
    }
  }

  /**
   * Flush without rejecting. Callers that fire and forget must use this -
   * a rejected flush() with no handler is an unhandled promise rejection.
   */
  flushSafely = (): void => {
    this.flush().catch((err) => {
      this.#config.options.onFlushError?.(err);
    });
  };

  flush = async (): Promise<void> => {
    if (!this.#config.endpointUrl) {
      throw new Error(
        "[unlocked-analytics] endpointUrl is missing.  Make sure you've called analytics.load"
      );
    }
    if (!this.#config.writeKey) {
      throw new Error(
        "[unlocked-analytics] writeKey is missing.  Make sure you've called analytics.load"
      );
    }

    if (this.#flushing || this.#queue.length === 0) {
      return;
    }

    this.#flushing = true;
    if (this.#flushTimeout) {
      clearTimeout(this.#flushTimeout);
      this.#flushTimeout = null;
    }

    const batch = [...this.#queue];
    const payload = { batch, context: this.#config.context };
    const headers = {
      'Content-Type': 'application/json',
      ...(this.#config.options.headers || {}),
    };

    try {
      const response = await fetch(`${this.#config.endpointUrl}/batch`, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers,
        ...(this.#config.options.credentials
          ? { credentials: this.#config.options.credentials }
          : {}),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      this.#queue = this.#queue.slice(batch.length);
    } finally {
      this.#flushing = false;
    }
  };
}
