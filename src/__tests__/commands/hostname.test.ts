import { describe, it, expect } from 'vitest';
import { hostnameAsync } from '../../commands/hostnameAsync';
import type { CommandContext } from '../../core/TerminalCore';
import type { IOStreams } from '../../core/streams';

function io(): IOStreams {
  return {
    stdout: { write: () => {} } as any,
    stderr: { write: () => {} } as any,
    stdin: { read: () => '', on: () => {} } as any,
  } as any;
}

function ctx(overrides: Partial<CommandContext['env']> = {}): CommandContext {
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
      ...overrides,
    },
    version: '2.0.0',
    history: [],
    files: {},
    terminal: {} as any,
    shell: null as any,
  };
}

describe('hostname', () => {
  it('prints default hostname when env not set', async () => {
    const out: string[] = [];
    const streams = { ...io(), stdout: { write: (d: string) => out.push(d), on: () => {} } } as any;
    const code = await hostnameAsync([], ctx(), streams);
    expect(code).toBe(0);
    expect(out.join('')).toBe('busykoala-2');
  });

  it('prints HOSTNAME from env when set', async () => {
    const out: string[] = [];
    const streams = { ...io(), stdout: { write: (d: string) => out.push(d), on: () => {} } } as any;
    const code = await hostnameAsync([], ctx({ HOSTNAME: 'myhost.local' }), streams);
    expect(code).toBe(0);
    expect(out.join('')).toBe('myhost.local');
  });

  it('shows --help', async () => {
    const out: string[] = [];
    const streams = { ...io(), stdout: { write: (d: string) => out.push(d), on: () => {} } } as any;
    const code = await hostnameAsync(['--help'], ctx(), streams);
    expect(code).toBe(0);
    expect(out.join('').toLowerCase()).toContain('hostname');
  });
});
