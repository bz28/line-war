import type { SimEvent, TeamId } from '@line-war/sim';
import { TEAMS } from '../art/tokens';
import { crewMark } from '../hud/icons';
import { h } from './dom';
import { svg } from './screens';

/**
 * The match ledger on the result card: each round's points with its winner marked, then the
 * match total (the sim's `totalScores`, which also breaks a tie on rounds, RULES §9).
 * The sim keeps only totals, so the client records each round from its `roundEnd` event.
 */

export interface RoundResult {
  scores: [number, number];
  winner: TeamId | null;
}

/** Append this tick's finished rounds to `log` (in order). Returns the number added. */
export function recordRoundEnds(events: readonly SimEvent[], log: RoundResult[]): number {
  let n = 0;
  for (const e of events) {
    if (e.type !== 'roundEnd') continue;
    log.push({ scores: [e.scores[0], e.scores[1]], winner: e.winner });
    n++;
  }
  return n;
}

export interface MatchResult {
  winner: TeamId | null;
  roundsWon: [number, number];
  /** Per-round results, oldest first; empty when unknown (the card then shows rounds won only). */
  rounds?: readonly RoundResult[];
  /** Points over the whole match (state.totalScores). */
  totals?: [number, number];
}

/** True when the rounds were level and the total decided the match. */
export const decidedOnTotal = (r: MatchResult): boolean => r.winner !== null && r.roundsWon[0] === r.roundsWon[1];

const fmt = (n: number) => n.toLocaleString('en-US');

/** The ledger table, or null without per-round data. */
export function ledger(r: MatchResult): HTMLElement | null {
  const rounds = r.rounds ?? [];
  if (!rounds.length) return null;
  const totals = r.totals ?? rounds.reduce<[number, number]>((t, x) => [t[0] + x.scores[0], t[1] + x.scores[1]], [0, 0]);
  const cell = (team: TeamId, value: number, won: boolean, cls = '') =>
    h(
      'td',
      { class: `lw-ledger-pts ${team === 0 ? 'lw-crew-a' : 'lw-crew-b'}${won ? ' lw-ledger-won' : ''}${cls}` },
      h('span', {}, fmt(value)),
      won ? svg(crewMark(team), 'lw-ledger-mark') : null,
    );
  const totalWinner: TeamId | null = totals[0] === totals[1] ? null : totals[0] > totals[1] ? 0 : 1;
  const label = (text: string, extra?: HTMLElement | null) => h('th', { scope: 'row' }, text, extra ?? null);
  return h(
    'table',
    { class: 'lw-ledger' },
    h('caption', { class: 'lw-sr' }, 'Points per round'),
    h(
      'thead',
      { class: 'lw-sr' },
      h('tr', {}, h('th', { scope: 'col' }, TEAMS[0].name), h('th', { scope: 'col' }, 'Round'), h('th', { scope: 'col' }, TEAMS[1].name)),
    ),
    h(
      'tbody',
      {},
      rounds.map((x, i) =>
        h(
          'tr',
          { 'data-round': String(i + 1), 'data-winner': x.winner === null ? 'draw' : String(x.winner) },
          cell(0, x.scores[0], x.winner === 0),
          label(`Round ${i + 1}`, x.winner === null ? h('span', { class: 'lw-ledger-draw' }, 'Draw') : null),
          cell(1, x.scores[1], x.winner === 1),
        ),
      ),
    ),
    h(
      'tfoot',
      {},
      h(
        'tr',
        {},
        cell(0, totals[0], decidedOnTotal(r) && totalWinner === 0, ' lw-ledger-total'),
        label('Total'),
        cell(1, totals[1], decidedOnTotal(r) && totalWinner === 1, ' lw-ledger-total'),
      ),
    ),
  );
}
