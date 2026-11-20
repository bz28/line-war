/** Worker thread: runs MatchSpecs it is sent and posts back the MatchRecords. */
import { parentPort } from 'node:worker_threads';
import { runSpec } from './spec';
import type { MatchSpec } from './types';

if (!parentPort) throw new Error('worker.ts must run in a worker thread');
const port = parentPort;

port.on('message', (msg: { id: number; spec: MatchSpec }) => {
  runSpec(msg.spec).then(
    (record) => port.postMessage({ id: msg.id, record }),
    (err: unknown) => port.postMessage({ id: msg.id, error: err instanceof Error ? (err.stack ?? err.message) : String(err) }),
  );
});
