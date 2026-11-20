import { tileCenter, tileOwner } from '@line-war/sim';
import type { IngredientKind, MatchState, PlayerId, TeamId, Vec2 } from '@line-war/sim';
import { padActionLabel } from '../input/gamepad';
import type { SlotController } from '../settings/types';
import { keyLabel } from '../ui/keyNames';

/**
 * First-match coach: a short, skippable run of paper notes that teaches the loop (grab, prep,
 * serve) by watching what the player actually does, plus a bobbing pointer at where to go next.
 * Shown until the player's crew serves once (or it is skipped), then remembered.
 */

export const COACH_STORAGE_KEY = 'line-war:coach:v1';
/** How long the closing "you've got it" note stays up (ms). */
export const OUTRO_MS = 5200;

export type CoachStep = 'grab' | 'prep' | 'serve' | 'done';

/** Key labels for the coached player's controls. */
export interface CoachKeys {
  grab: string;
  work: string;
  dash: string;
}

/** Prompt labels for a local slot: its own key bindings, or the gamepad mapping's buttons. */
export function coachKeysFor(slot: SlotController): CoachKeys | null {
  if (slot.kind === 'keyboard') return { grab: keyLabel(slot.bindings.grab), work: keyLabel(slot.bindings.work), dash: keyLabel(slot.bindings.dash) };
  if (slot.kind === 'gamepad') return { grab: padActionLabel('grab'), work: padActionLabel('work'), dash: padActionLabel('dash') };
  return null;
}

export interface CoachProgress {
  grabbed: boolean;
  prepped: boolean;
  served: boolean;
}

export const newProgress = (): CoachProgress => ({ grabbed: false, prepped: false, served: false });

/** Fold one tick's events into the coached player's progress. */
export function trackProgress(s: MatchState, me: PlayerId, prog: CoachProgress): void {
  const p = s.players[me];
  const team = p.team;
  const held = p.holding;
  if (held) prog.grabbed = true;
  // Prepped: the player has chopped, cooked or plated something themselves.
  if (held?.type === 'plate' && held.contents.length > 0) prog.prepped = true;
  if (held?.type === 'ingredient' && held.state !== 'raw') prog.prepped = true;
  for (const e of s.events) {
    if (e.type === 'grab' && e.player === me) prog.grabbed = true;
    if (e.type === 'drop' && e.player === me && e.tile !== null && s.arena.tiles[e.tile]?.kind === 'stove') prog.prepped = true;
    if (e.type === 'chopDone' && p.working) prog.prepped = true;
    if (e.type === 'delivered' && e.team === team) prog.served = true;
  }
}

export function coachStep(prog: CoachProgress): CoachStep {
  if (prog.served) return 'done';
  if (!prog.grabbed) return 'grab';
  if (!prog.prepped) return 'prep';
  return 'serve';
}

export function coachText(step: CoachStep, keys: CoachKeys): { title: string; body: string } {
  switch (step) {
    case 'grab':
      return { title: 'Fill the tickets', body: `Tickets up top are orders. Walk to a basket or market crate and press ${keys.grab} to grab food.` };
    case 'prep':
      return { title: 'Get it ready', body: `Hold ${keys.work} at a chopping board to chop. Pans and pots cook by themselves; just don’t let them burn.` };
    case 'serve':
      return { title: 'Plate it and serve', body: `Grab a plate, add the food, and bring it to your window. First crew to serve a ticket wins it.` };
    case 'done':
      return { title: 'You’ve got it', body: `Steak and fish are in the market. ${keys.dash} dashes: hit a rival there to knock their food loose.` };
  }
}

const ingredientOf = (s: MatchState, i: number): IngredientKind | undefined => s.arena.tiles[i]?.ingredient;

/** Nearest tile (by centre) to `from` among indices passing `ok`. */
function nearestTile(s: MatchState, from: Vec2, ok: (i: number) => boolean): number | null {
  let best: number | null = null;
  let bestD = Infinity;
  for (let i = 0; i < s.arena.tiles.length; i++) {
    if (!ok(i)) continue;
    const c = tileCenter(s.arena, i);
    const d = (c.x - from.x) ** 2 + (c.y - from.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** What the oldest ticket the crew can see still needs, as raw ingredient kinds. */
function wantedKinds(s: MatchState, team: TeamId): Set<IngredientKind> {
  const out = new Set<IngredientKind>();
  let oldest = null as MatchState['tickets'][number] | null;
  for (const t of s.tickets) {
    if (t.visibleTo !== null && t.visibleTo !== team) continue;
    if (!oldest || t.spawnTick < oldest.spawnTick) oldest = t;
  }
  const recipe = oldest ? s.recipes.find((r) => r.id === oldest!.recipe) : null;
  for (const f of recipe?.ingredients ?? []) out.add(f.kind);
  return out;
}

/** The tile the pointer should hang over for this step, or null for no pointer. */
export function coachTarget(s: MatchState, me: PlayerId, step: CoachStep): number | null {
  const p = s.players[me];
  const team = p.team;
  const tiles = s.arena.tiles;
  const mine = (i: number) => tileOwner(s, i) === team;
  const held = p.holding;
  if (step === 'done') return null;
  if (step === 'grab' || !held) {
    if (held) return null;
    const want = wantedKinds(s, team);
    const source = (i: number) => {
      const t = tiles[i]!;
      if (t.kind === 'crate') return true;
      return t.kind === 'pantry' && mine(i);
    };
    // During prep (no tickets yet) the market is the thing to learn about.
    if (want.size === 0) return nearestTile(s, p.pos, (i) => tiles[i]!.kind === 'crate');
    return nearestTile(s, p.pos, (i) => source(i) && want.has(ingredientOf(s, i)!)) ?? nearestTile(s, p.pos, source);
  }
  if (held.type === 'plate') {
    if (held.contents.length === 0) return null;
    return nearestTile(s, p.pos, (i) => tiles[i]!.kind === 'pass' && mine(i));
  }
  if (held.type === 'charm') return null; // charms (RULES §10) aren't wired into the client yet
  const def = s.ingredients[held.kind];
  if (held.state === 'raw' && def?.choppable) return nearestTile(s, p.pos, (i) => tiles[i]!.kind === 'board' && mine(i));
  if (def?.cook && def.cook.from === held.state) {
    const vessel = def.cook.vessel;
    return nearestTile(s, p.pos, (i) => tiles[i]!.kind === 'stove' && tiles[i]!.vessel === vessel && mine(i));
  }
  if (step === 'serve') return nearestTile(s, p.pos, (i) => tiles[i]!.kind === 'plates' && mine(i));
  return null;
}

export interface CoachStorage {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

const el = (tag: string, cls: string, text?: string): HTMLElement => {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** DOM for the coach: a paper note bottom-centre and a bobbing lantern pointer over the target. */
export class Coach {
  readonly root: HTMLElement;
  private note: HTMLElement;
  private title: HTMLElement;
  private body: HTMLElement;
  private pointer: HTMLElement;
  private prog = newProgress();
  private step: CoachStep | null = null;
  private doneAt = 0;
  private finished = false;
  private away = false;
  private target: number | null = null;
  private px = NaN;
  private py = NaN;

  constructor(
    private me: PlayerId,
    private keys: CoachKeys,
    private now: () => number,
    private locate: ((pos: Vec2) => Vec2 | null) | null,
    private storage: CoachStorage | null,
  ) {
    this.root = el('div', 'lw-coach');
    this.note = el('div', 'lw-coach-note');
    this.note.setAttribute('role', 'status');
    this.title = el('div', 'lw-coach-title');
    this.body = el('div', 'lw-coach-body');
    const skip = el('button', 'lw-coach-skip', 'Skip tips');
    skip.setAttribute('type', 'button');
    skip.tabIndex = -1; // never steals focus from the game keys
    skip.addEventListener('click', () => this.finish());
    this.note.append(this.title, this.body, skip);
    this.pointer = el('div', 'lw-coach-pointer');
    this.pointer.setAttribute('aria-hidden', 'true');
    this.pointer.hidden = true;
    this.root.append(this.pointer, this.note);
  }

  /** True if the coach should run at all (first time on this browser). */
  static wanted(storage: CoachStorage | null): boolean {
    try {
      return storage?.getItem(COACH_STORAGE_KEY) !== 'done';
    } catch {
      return false;
    }
  }

  /** True while the note is on screen (not finished, hidden for a card, or stepped aside). */
  get noteShowing(): boolean {
    return !this.finished && !this.root.hidden && !this.away;
  }

  get currentStep(): CoachStep | null {
    return this.finished ? null : this.step;
  }

  onTick(s: MatchState): void {
    if (this.finished) return;
    trackProgress(s, this.me, this.prog);
  }

  /** `busy`: a phase banner is up, so the note steps aside for it. */
  render(s: MatchState, busy = false): void {
    if (this.finished) return;
    const now = this.now();
    const step = coachStep(this.prog);
    if (step !== this.step) {
      this.step = step;
      const t = coachText(step, this.keys);
      this.title.textContent = t.title;
      this.body.textContent = t.body;
      this.note.dataset.step = step;
      // Re-trigger the note's entrance.
      this.note.classList.remove('lw-coach-note--in');
      void this.note.offsetWidth;
      this.note.classList.add('lw-coach-note--in');
      if (step === 'done') {
        this.doneAt = now;
        this.remember();
      }
    }
    if (step === 'done' && now - this.doneAt > OUTRO_MS) return this.finish();
    if (s.round.phase === 'roundOver' || s.round.phase === 'matchOver') {
      if (s.round.phase === 'matchOver') this.remember(); // one full match is enough coaching
      this.root.hidden = true;
      return;
    }
    this.root.hidden = false;
    if (busy !== this.away) {
      this.away = busy;
      this.note.classList.toggle('lw-coach-note--away', busy);
    }
    this.placePointer(s, step);
  }

  private placePointer(s: MatchState, step: CoachStep): void {
    const tile = this.locate ? coachTarget(s, this.me, step) : null;
    const at = tile !== null && this.locate ? this.locate(tileCenter(s.arena, tile)) : null;
    if (!at) {
      if (!this.pointer.hidden) this.pointer.hidden = true;
      this.target = null;
      return;
    }
    if (this.pointer.hidden) this.pointer.hidden = false;
    if (tile !== this.target || Math.abs(at.x - this.px) > 0.5 || Math.abs(at.y - this.py) > 0.5) {
      this.target = tile;
      this.px = at.x;
      this.py = at.y;
      this.pointer.style.transform = `translate(${Math.round(at.x)}px, ${Math.round(at.y)}px)`;
    }
  }

  private remember(): void {
    try {
      this.storage?.setItem(COACH_STORAGE_KEY, 'done');
    } catch {
      /* storage blocked: the coach just shows again next time */
    }
  }

  /** Skip or complete: hide for good. */
  finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.remember();
    this.root.hidden = true;
  }

  dispose(): void {
    this.root.remove();
  }
}
