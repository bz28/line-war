import type { MatchState } from '@line-war/sim';
import { browserGamepads, type GetGamepads } from '../input/gamepad';
import { loadSettings, saveSettings, type StorageLike } from '../settings/store';
import type { Settings } from '../settings/types';
import { h } from './dom';
import { MenuNav } from './nav';
import { howToScreen } from './howTo';
import { matchOverScreen, pauseScreen, titleScreen } from './screens';
import { SettingsMenu } from './settingsMenu';
import { charmShelfScreen } from './charmShelf';
import { CHARM_IDS, loadCollection, saveCollection, setDisplay } from '../collection/store';
import './styles.css';
import './charms.css';

/** A running match. Built by main.ts so all input/bot/renderer wiring stays in one file. */
export interface MatchSession {
  readonly state: MatchState;
  /** Paused sessions keep rendering but stop advancing the sim. */
  setPaused(paused: boolean): void;
  /** Charms unlocked for the first time during this match (the match-over reveal). */
  readonly newCharms?: readonly string[];
  /** Live-apply settings that do not need a new match (controllers, display). */
  applySettings(settings: Settings): void;
  dispose(): void;
}

export type StartSession = (settings: Settings, host: HTMLElement, hooks: { onMatchOver(): void }) => MatchSession;

export interface AppOptions {
  root: HTMLElement;
  startSession: StartSession;
  storage?: StorageLike | null;
  getGamepads?: GetGamepads;
}

type Screen = 'title' | 'howto' | 'charms' | 'playing' | 'paused' | 'over';

/**
 * Screen flow: Title -> match; Esc / Start pauses (Resume, Restart, Settings, Quit);
 * matchOver shows the result (Play again, Title). Settings open on top of title or pause.
 */
export class App {
  settings: Settings;
  private screen: Screen = 'title';
  private session: MatchSession | null = null;
  private settingsMenu: SettingsMenu | null = null;
  private stage: HTMLElement;
  private overlay: HTMLElement;
  private nav: MenuNav;
  private getGamepads: GetGamepads;
  private raf = 0;
  private storage: StorageLike | null | undefined;

  constructor(private opts: AppOptions) {
    this.storage = opts.storage;
    this.settings = loadSettings(opts.storage);
    this.getGamepads = opts.getGamepads ?? browserGamepads;
    this.stage = h('div', { class: 'lw-stage' });
    this.overlay = h('div', { class: 'lw-overlay' });
    opts.root.replaceChildren(this.stage, this.overlay);
    this.nav = new MenuNav(
      {
        getRoot: () => (this.overlay.hidden ? null : this.overlay),
        onBack: () => this.back(),
        onStart: () => this.togglePause(),
      },
      this.getGamepads,
    );
    window.addEventListener('gamepadconnected', this.onPadsChanged);
    window.addEventListener('gamepaddisconnected', this.onPadsChanged);
    document.addEventListener('visibilitychange', this.onVisibility);
    const frame = (now: number) => {
      this.nav.poll(now);
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
    this.showTitle();
  }

  get currentScreen(): Screen {
    return this.screen;
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.nav.dispose();
    this.closeSettings();
    this.endSession();
    window.removeEventListener('gamepadconnected', this.onPadsChanged);
    window.removeEventListener('gamepaddisconnected', this.onPadsChanged);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }

  // ---------- flow ----------

  play(): void {
    this.endSession();
    this.screen = 'playing';
    this.hideOverlay();
    this.session = this.opts.startSession(this.settings, this.stage, { onMatchOver: () => this.showMatchOver() });
  }

  pause(): void {
    if (this.screen !== 'playing' || !this.session) return;
    this.session.setPaused(true);
    this.screen = 'paused';
    this.showPauseMenu();
  }

  private showPauseMenu(): void {
    this.showPanel(
      pauseScreen({
        resume: () => this.resume(),
        restart: () => this.play(),
        settings: () => this.openSettings('Player, control and display changes apply now; match rules on restart.'),
        quit: () => this.showTitle(),
      }),
    );
  }

  resume(): void {
    if (this.screen !== 'paused' || !this.session) return;
    this.closeSettings();
    this.screen = 'playing';
    this.hideOverlay();
    this.session.setPaused(false);
  }

  showTitle(): void {
    this.endSession();
    this.closeSettings();
    this.screen = 'title';
    this.showPanel(
      titleScreen(this.settings, {
        play: () => this.play(),
        howTo: () => this.showHowTo(),
        settings: () => this.openSettings(),
        pickLevel: (id) => this.pickLevel(id),
        charms: () => this.showCharms(),
      }, this.charmSummary()),
    );
  }

  private charmSummary(): { unlocked: number; total: number; display: string | null } {
    const c = loadCollection(this.storage);
    return { unlocked: c.unlocked.length, total: CHARM_IDS.length, display: c.display };
  }

  /** The charm shelf. `focus` keeps the cursor on a slot after choosing it. */
  showCharms(focus?: string): void {
    this.endSession();
    this.closeSettings();
    this.screen = 'charms';
    const col = loadCollection(this.storage);
    this.showPanel(
      charmShelfScreen(col, {
        pick: (id) => {
          const now = loadCollection(this.storage);
          if (!now.unlocked.includes(id)) return;
          saveCollection(setDisplay(now, now.display === id ? null : id), this.storage);
          this.showCharms(id);
        },
        back: () => {
          this.showTitle();
          this.overlay.querySelector<HTMLElement>('[data-key="menu-Charms"]')?.focus();
        },
      }),
    );
    if (focus) this.overlay.querySelector<HTMLElement>(`[data-charm="${focus}"]`)?.focus();
  }

  /** Choose a level on the title screen; keeps focus on the chosen card. */
  pickLevel(id: string): void {
    if (this.screen !== 'title' || id === this.settings.level) return;
    this.settings = { ...this.settings, level: id };
    saveSettings(this.settings, this.storage);
    this.showTitle();
    this.overlay.querySelector<HTMLElement>(`[data-key="level-${id}"]`)?.focus();
  }

  private showHowTo(): void {
    this.screen = 'howto';
    this.showPanel(howToScreen(this.settings, { back: () => this.showTitle() }));
  }

  private showMatchOver(): void {
    if (!this.session) return;
    this.closeSettings();
    const { state } = this.session;
    this.session.setPaused(true);
    this.screen = 'over';
    this.showPanel(
      matchOverScreen(
        { winner: state.winner, roundsWon: [state.teams[0].roundsWon, state.teams[1].roundsWon] },
        { again: () => this.play(), title: () => this.showTitle(), shelf: () => this.showCharms(this.session?.newCharms?.[0]) },
        this.session.newCharms ?? [],
      ),
    );
  }

  private togglePause(): void {
    if (this.settingsMenu || this.screen === 'howto' || this.screen === 'charms') return this.back();
    if (this.screen === 'playing') this.pause();
    else if (this.screen === 'paused') this.resume();
  }

  /** Esc / B in a menu. */
  private back(): void {
    if (this.settingsMenu) return this.settingsMenu.back();
    if (this.screen === 'paused') this.resume();
    else if (this.screen === 'howto') this.showTitle();
    else if (this.screen === 'charms') {
      this.showTitle();
      this.overlay.querySelector<HTMLElement>('[data-key="menu-Charms"]')?.focus();
    }
  }

  // ---------- settings ----------

  openSettings(note?: string): void {
    const from = this.screen;
    this.settingsMenu = new SettingsMenu({
      settings: this.settings,
      note,
      getGamepads: this.getGamepads,
      onChange: (s) => {
        this.settings = s;
        saveSettings(s, this.storage);
        this.session?.applySettings(s);
      },
      onClose: () => {
        this.closeSettings();
        if (from === 'title') this.showTitle();
        else this.showPauseMenu();
      },
    });
    this.showPanel(this.settingsMenu.el);
  }

  private closeSettings(): void {
    this.settingsMenu?.dispose();
    this.settingsMenu = null;
  }

  private onPadsChanged = () => this.settingsMenu?.refresh();

  private onVisibility = () => {
    if (document.visibilityState === 'hidden') this.pause();
  };

  // ---------- DOM ----------

  private endSession(): void {
    this.session?.dispose();
    this.session = null;
  }

  private showPanel(panel: HTMLElement): void {
    this.overlay.classList.toggle('lw-opaque', this.screen === 'title' || this.screen === 'howto' || this.screen === 'charms');
    this.overlay.replaceChildren(panel);
    this.overlay.hidden = false;
    this.stage.dataset.menu = this.screen;
    // Focus the first control so keyboard and gamepad navigation work immediately.
    panel.querySelector<HTMLElement>('button, select, input')?.focus();
  }

  private hideOverlay(): void {
    this.overlay.hidden = true;
    this.overlay.replaceChildren();
    delete this.stage.dataset.menu;
  }
}
