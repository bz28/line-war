import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TEAMS } from '../../src/art/tokens';
import { darken, mix, TEAM_COLORS, TEAM_NAMES, withAlpha } from '../../src/render/palette';

describe('colour helpers', () => {
  it('darken, mix and withAlpha', () => {
    expect(darken('#ffffff', 0.5)).toBe('#808080');
    expect(darken('#123456', 0)).toBe('#123456');
    expect(darken('#ffffff', 1)).toBe('#000000');
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mix('#102030', '#405060', 0)).toBe('#102030');
    expect(mix('#102030', '#405060', 2)).toBe('#405060');
    expect(withAlpha('#ff0000', 0.5)).toBe('rgba(255,0,0,0.5)');
    expect(withAlpha('#ff0000', 3)).toBe('rgba(255,0,0,1)');
  });

  it('team colours and names come from the art tokens', () => {
    expect(TEAM_COLORS[0]).toBe(TEAMS[0].main);
    expect(TEAM_COLORS[1]).toBe(TEAMS[1].main);
    expect(TEAM_NAMES).toEqual({ 0: 'Jade', 1: 'Ember' });
  });
});

describe('art bible: no stray colours', () => {
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
    });

  it('the world renderer uses only token colours (no hex literals outside art/tokens.ts)', () => {
    const dir = join(__dirname, '../../src/render');
    const offenders = files(dir).filter((f) => /['"`]#[0-9a-fA-F]{3,8}['"`]/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
