/**
 * First paint. index.html shows a lantern-bunny glow (#lw-splash) before any script runs; the
 * title mounts once its display and UI fonts are in, so a new player never sees a system-font
 * title snap into Dela Gothic One. A slow font CDN never holds the game: after SPLASH_MAX_MS
 * the title mounts anyway (with the fallback fonts, which swap in when they arrive).
 */

/** The faces the title paints with: the wordmark, then the UI weights on its buttons and lineup. */
export const TITLE_FONTS = ['400 1em "Dela Gothic One"', '800 1em "M PLUS Rounded 1c"', '700 1em "M PLUS Rounded 1c"'] as const;
/** Latin sample, so only the subset the title needs is fetched (M PLUS Rounded 1c ships many). */
export const TITLE_SAMPLE = 'LINE WAR Play';
/** Longest the splash waits for fonts before showing the title anyway. */
export const SPLASH_MAX_MS = 2500;
/** Matches the splash's opacity transition in index.html. */
export const SPLASH_FADE_MS = 350;

export type FontsOutcome = 'fonts' | 'timeout' | 'unsupported';

type FontLoader = Pick<FontFaceSet, 'load'>;

/** Set by index.html: settles when the (non-blocking) Google Fonts stylesheet has loaded or failed. */
export const fontsStylesheet = (): Promise<unknown> => (globalThis as { lwFontsCss?: Promise<unknown> }).lwFontsCss ?? Promise.resolve();

/**
 * Resolves once the font stylesheet is in and every title font has loaded (or failed), or after
 * `maxMs`, whichever is first.
 */
export function titleFontsReady(
  fonts: FontLoader | undefined,
  maxMs = SPLASH_MAX_MS,
  setTimer: (fn: () => void, ms: number) => unknown = setTimeout,
  stylesheet: Promise<unknown> = fontsStylesheet(),
): Promise<FontsOutcome> {
  if (!fonts || typeof fonts.load !== 'function') return Promise.resolve('unsupported');
  const loaded = stylesheet
    .catch(() => undefined)
    .then(() => Promise.all(TITLE_FONTS.map((f) => fonts.load(f, TITLE_SAMPLE).catch(() => []))))
    .then(() => 'fonts' as const);
  const timeout = new Promise<FontsOutcome>((resolve) => setTimer(() => resolve('timeout'), maxMs));
  return Promise.race([loaded, timeout]);
}

/** Fade the splash out, then remove it from the DOM. Safe to call when there is no splash. */
export function liftSplash(el: HTMLElement | null, setTimer: (fn: () => void, ms: number) => unknown = setTimeout): void {
  if (!el || el.classList.contains('lw-splash--out')) return;
  el.classList.add('lw-splash--out');
  el.removeAttribute('role');
  setTimer(() => el.remove(), SPLASH_FADE_MS + 50);
}
