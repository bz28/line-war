/** Run a serializable MatchSpec (used in-process and by workers). */
import { isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { arenaById, runMatch, type CreateBots } from './runner';
import type { MatchRecord, MatchSpec } from './types';

const loaded = new Map<string, Promise<CreateBots>>();

/** Import a module exporting `createBots` (path relative to cwd, absolute, or a package name). */
export function loadCreateBots(spec: string): Promise<CreateBots> {
  let p = loaded.get(spec);
  if (!p) {
    const url = spec.startsWith('.') || isAbsolute(spec) ? pathToFileURL(resolve(spec)).href : spec;
    p = import(url).then((m: { createBots?: CreateBots }) => {
      if (typeof m.createBots !== 'function') throw new Error(`bots module '${spec}' does not export createBots`);
      return m.createBots;
    });
    loaded.set(spec, p);
  }
  return p;
}

export async function runSpec(spec: MatchSpec): Promise<MatchRecord> {
  const createBots = spec.botsModule ? await loadCreateBots(spec.botsModule) : undefined;
  return runMatch({
    arena: arenaById(spec.arena),
    seed: spec.seed,
    slots: spec.slots,
    config: spec.config,
    tuning: spec.tuning,
    maxTicks: spec.maxTicks,
    stuckSeconds: spec.stuckSeconds,
    createBots,
  });
}
