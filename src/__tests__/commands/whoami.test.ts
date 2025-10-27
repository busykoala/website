import { describe, it, expect } from 'vitest';
import { whoamiAsync } from '../../commands/whoamiAsync';
import type { CommandContext } from '../../core/TerminalCore';
import type { IOStreams } from '../../core/streams';

function io(): IOStreams {
  return {
    stdout: { write: () => {} } as any,
    stderr: { write: () => {} } as any,
    stdin: { read: () => '', on: () => {} } as any,
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
  };
}

describe('whoami', () => {
  it('prints username', async () => {
    const out: string[] = [];
    const streams = { ...io(), stdout: { write: (d: string) => out.push(d), on: () => {} } } as any;
    const code = await whoamiAsync([], ctx(), streams);
    expect(code).toBe(0);
    expect(out.join('')).toBe('busykoala');
  });

  it('shows help', async () => {
    const out: string[] = [];
    const streams = { ...io(), stdout: { write: (d: string) => out.push(d), on: () => {} } } as any;
    const code = await whoamiAsync(['--help'], ctx(), streams);
    expect(code).toBe(0);
    expect(out.join('').toLowerCase()).toContain('whoami');
  });

  it('shows version', async () => {
    const out: string[] = [];
    const streams = { ...io(), stdout: { write: (d: string) => out.push(d), on: () => {} } } as any;
    const code = await whoamiAsync(['--version'], ctx(), streams);
    expect(code).toBe(0);
    expect(out.join('')).toMatch(/whoami .*1.0.0/);
  });
});
