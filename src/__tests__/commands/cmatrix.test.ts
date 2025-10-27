import { describe, it, expect } from 'vitest';
import { cmatrixAsync } from '../../commands/cmatrixAsync';
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

describe('cmatrix', () => {
  it('creates a fullscreen overlay that blocks interactions and then removes it after animation completes', async () => {
    const c = ctx();
    const streams = io();
    const promise = cmatrixAsync([], c, streams);
    const overlay = document.querySelector('.cmatrix-overlay') as HTMLDivElement | null;
    expect(overlay).toBeTruthy();
    if (overlay) {
      const style = getComputedStyle(overlay);
      expect(style.position).toBe('fixed');
      expect(overlay.style.pointerEvents).toBe('auto');
      expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    }
    // end via Ctrl+C
    document.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 'c' }));
    await promise;
    expect(document.querySelector('.cmatrix-overlay')).toBeNull();
  });

  it('supports -B (all bold) by making text bold', async () => {
    const c = ctx();
    const streams = io();
    const p = cmatrixAsync(['-B'], c, streams);
    const overlay = document.querySelector('.cmatrix-overlay') as HTMLElement;
    expect(overlay).toBeTruthy();
    const pre = overlay?.querySelector('pre') as HTMLElement | null;
    expect(pre?.style.fontWeight).toBe('bold');
    document.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 'c' }));
    await p;
  });

  it('supports -a (async) by tagging overlay class', async () => {
    const c = ctx();
    const streams = io();
    const p = cmatrixAsync(['-a'], c, streams);
    const overlay = document.querySelector('.cmatrix-overlay') as HTMLElement;
    expect(overlay?.classList.contains('cmatrix-async')).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 'c' }));
    await p;
  });

  it('supports -s (screensaver) by tagging overlay class', async () => {
    const c = ctx();
    const streams = io();
    const p = cmatrixAsync(['-s'], c, streams);
    const overlay = document.querySelector('.cmatrix-overlay') as HTMLElement;
    expect(overlay?.classList.contains('cmatrix-screensaver')).toBe(true);
    // end via click
    overlay?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await p;
  });

  it('supports -u DELAY by storing the value on overlay dataset', async () => {
    const c = ctx();
    const streams = io();
    const p = cmatrixAsync(['-u', '5000'], c, streams);
    const overlay = document.querySelector('.cmatrix-overlay') as HTMLElement;
    expect(overlay?.dataset.delay).toBe('5000');
    document.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 'c' }));
    await p;
  });

  it('shows help', async () => {
    const c = ctx();
    const streams = io();
    const code = await cmatrixAsync(['--help'], c, streams);
    expect(code).toBe(0);
    expect((streams as any)._stdout.join('').toLowerCase()).toContain('cmatrix');
  });

  it('supports Ctrl+C to quit early', async () => {
    const c = ctx();
    const streams = io();
    const p = cmatrixAsync(['--test-long'], c, streams);
    // ensure overlay present
    const overlay = document.querySelector('.cmatrix-overlay') as HTMLElement;
    expect(overlay).toBeTruthy();
    // dispatch Ctrl+C
    const evt = new KeyboardEvent('keydown', { ctrlKey: true, key: 'c' });
    document.dispatchEvent(evt);
    await p; // should resolve early
    expect(document.querySelector('.cmatrix-overlay')).toBeNull();
  });

  it('supports -b (partial bold heads) by tagging overlay class', async () => {
    const c = ctx();
    const streams = io();
    const p = cmatrixAsync(['-b'], c, streams);
    const overlay = document.querySelector('.cmatrix-overlay') as HTMLElement;
    expect(overlay?.classList.contains('cmatrix-bold')).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 'c' }));
    await p;
  });

  it('supports -f (force highlight) by tagging overlay class', async () => {
    const c = ctx();
    const streams = io();
    const p = cmatrixAsync(['-f'], c, streams);
    const overlay = document.querySelector('.cmatrix-overlay') as HTMLElement;
    expect(overlay?.classList.contains('cmatrix-force')).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 'c' }));
    await p;
  });

  it('supports -r (rainbow) by tagging overlay class', async () => {
    const c = ctx();
    const streams = io();
    const p = cmatrixAsync(['-r'], c, streams);
    const overlay = document.querySelector('.cmatrix-overlay') as HTMLElement;
    expect(overlay?.classList.contains('cmatrix-rainbow')).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 'c' }));
    await p;
  });

  it('supports -C COLOR by applying overlay color', async () => {
    const c = ctx();
    const streams = io();
    const p = cmatrixAsync(['-C', 'red'], c, streams);
    const overlay = document.querySelector('.cmatrix-overlay') as HTMLElement;
    expect(getComputedStyle(overlay).color).toBe('rgb(255, 0, 0)');
    document.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 'c' }));
    await p;
  });
});
