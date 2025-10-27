import { describe, it, expect } from 'vitest';
import { slAsync } from '../../commands/slAsync';
import type { CommandContext } from '../../core/TerminalCore';

function io() {
  const out: string[] = [],
    err: string[] = [];
  return {
    stdout: { write: (d: string) => out.push(d), on: () => {} },
    stderr: { write: (d: string) => err.push(d), on: () => {} },
    stdin: { read: () => '', on: () => {} },
    _stdout: out,
    _stderr: err,
  } as any;
}
function ctx(): CommandContext {
  return {
    env: {
      PWD: '/home/busykoala',
      HOME: '/home/busykoala',
      USER: 'busykoala',
      SHELL: '/bin/zsh',
      PATH: '/bin',
      EDITOR: 'nvim',
      COMMANDS: {},
      LAST_EXIT_CODE: '0',
    },
    version: '2.0.0',
    history: [],
    files: {},
    terminal: {} as any,
    shell: null as any,
  } as any;
}

describe('sl (steam locomotive)', () => {
  it('creates a full-page overlay that blocks interactions and then removes it after animation completes', async () => {
    const c = ctx();
    const streams = io();
    const promise = slAsync([], c, streams);
    const overlay = document.querySelector('.sl-overlay') as HTMLDivElement | null;
    expect(overlay).toBeTruthy();
    if (overlay) {
      expect(getComputedStyle(overlay).position).toBe('fixed');
      expect(overlay.style.pointerEvents).toBe('auto');
    }
    await promise;
    expect(document.querySelector('.sl-overlay')).toBeNull();
  });

  it('supports -l (little) by scaling down the locomotive', async () => {
    const c = ctx();
    const streams = io();
    const p = slAsync(['-l'], c, streams);
    const overlay = document.querySelector('.sl-overlay') as HTMLElement;
    expect(overlay).toBeTruthy();
    const container = overlay?.querySelector('div');
    expect(container?.style.transform).toContain('scale(0.8)');
    await p;
  });

  it('supports -F (fly) by moving across top part of the screen', async () => {
    const c = ctx();
    const streams = io();
    const p = slAsync(['-F'], c, streams);
    const overlay = document.querySelector('.sl-overlay') as HTMLElement;
    expect(overlay).toBeTruthy();
    const container = overlay?.querySelector('div');
    expect(container?.style.top).toBe('20%');
    await p;
  });

  it('supports -a (accident) by tagging overlay class', async () => {
    const c = ctx();
    const streams = io();
    const p = slAsync(['-a'], c, streams);
    const overlay = document.querySelector('.sl-overlay') as HTMLElement;
    expect(overlay?.classList.contains('sl-accident')).toBe(true);
    await p;
  });

  it('shows help', async () => {
    const c = ctx();
    const streams = io();
    const code = await slAsync(['--help'], c, streams);
    expect(code).toBe(0);
    expect((streams as any)._stdout.join('').toLowerCase()).toContain('sl');
  });
});
