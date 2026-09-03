import type { CommonFields, ContextFields, ConfigOptions } from './types';
import Queue from './Queue';
import Config from './Config';
import { formatISO } from 'date-fns';

export default class Analytics {
  #config: Config;

  #queue: Queue;

  constructor() {
    this.#config = new Config();
    this.#queue = new Queue(this.#config);
  }

  load(writeKey: string, endpointUrl: string): void {
    this.#config.writeKey = writeKey;
    this.#config.endpointUrl = endpointUrl;
  }

  setContext(context: ContextFields): void {
    this.#config.context = context;
  }

  mergeOptions(options: ConfigOptions): void {
    // Force a flush before on old data before the options change
    this.#queue.flushSafely();
    this.#config.options = { ...this.#config.options, ...options };
  }

  screen(name: string, properties?: {}, options?: CommonFields): void {
    this.#queue.push({
      type: 'screen',
      name,
      ...(properties ? { properties } : {}),
      ...options,
      timestamp: formatISO(new Date()),
    });
  }

  track(event: string, properties?: {}, options?: CommonFields): void {
    this.#queue.push({
      type: 'track',
      event,
      ...(properties ? { properties } : {}),
      ...options,
      timestamp: formatISO(new Date()),
    });
  }
}
