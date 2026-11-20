/**
 * Runs MatchSpecs across worker threads. Results come back in spec order, and every match is fully
 * determined by its own spec (seed included), so the output does not depend on the worker count or
 * on which worker ran which match. `workers: 0` runs everything in-process.
 */
import { createRequire } from 'node:module';
import { availableParallelism } from 'node:os';
import { pathToFileURL } from 'node:url';
import { Worker } from 'node:worker_threads';
import { runSpec } from './spec';
import type { MatchRecord, MatchSpec } from './types';

export const defaultWorkers = (): number => Math.max(1, availableParallelism() - 1);

/** Workers load TypeScript sources (ours and the workspace packages) through tsx's loader. */
function tsxLoader(): string {
  return pathToFileURL(createRequire(import.meta.url).resolve('tsx')).href;
}

type Reply = { id: number; record: MatchRecord } | { id: number; error: string };

export class MatchPool {
  private readonly workers: Worker[] = [];

  constructor(readonly size: number) {
    if (size <= 0) return;
    const url = new URL('./worker.ts', import.meta.url);
    const loader = tsxLoader();
    for (let i = 0; i < size; i++) this.workers.push(new Worker(url, { execArgv: ['--import', loader] }));
  }

  /** Run all specs; onDone is called after each finished match (for progress output). */
  async run(specs: readonly MatchSpec[], onDone?: (done: number, total: number) => void): Promise<MatchRecord[]> {
    const results: MatchRecord[] = new Array(specs.length);
    let done = 0;
    if (this.workers.length === 0) {
      for (let i = 0; i < specs.length; i++) {
        results[i] = await runSpec(specs[i]!);
        onDone?.(++done, specs.length);
      }
      return results;
    }
    let next = 0;
    await Promise.all(
      this.workers.map(
        (w) =>
          new Promise<void>((resolve, reject) => {
            const feed = (): void => {
              if (next >= specs.length) {
                w.off('message', onMessage);
                w.off('error', reject);
                resolve();
                return;
              }
              const id = next++;
              w.postMessage({ id, spec: specs[id] });
            };
            const onMessage = (msg: Reply): void => {
              if ('error' in msg) {
                reject(new Error(`match ${msg.id} (seed ${specs[msg.id]?.seed}) failed: ${msg.error}`));
                return;
              }
              results[msg.id] = msg.record;
              onDone?.(++done, specs.length);
              feed();
            };
            w.on('message', onMessage);
            w.on('error', reject);
            feed();
          }),
      ),
    );
    return results;
  }

  async close(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.terminate()));
  }
}
