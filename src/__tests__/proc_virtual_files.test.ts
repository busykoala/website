import { describe, it, expect } from 'vitest';
import { FileSystem } from '../core/filesystem';
import { addBaseFilesystem } from '../core/addBaseFilesystem';
import type { CommandContext } from '../core/TerminalCore';

function fsWithBase() {
  const fs = new FileSystem();
  addBaseFilesystem(fs);
  return fs;
}

function ctx(fs: FileSystem): CommandContext {
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
    terminal: { getFileSystem: () => fs } as any,
    shell: null as any,
  } as any;
}

describe('/proc virtual files', () => {
  it('includes common files with readable content', async () => {
    const fs = fsWithBase();
    const files = ['cpuinfo', 'meminfo', 'uptime', 'version', 'loadavg', 'stat'];
    for (const name of files) {
      const node = fs.getNode(`/proc/${name}`, 'busykoala', 'busygroup', 'read');
      expect(node).toBeTruthy();
      expect(node?.type).toBe('file');
      expect((node as any).content.length).toBeGreaterThan(0);
    }
  });

  it('cat can read /proc files', async () => {
    const fs = fsWithBase();
    const c = ctx(fs);
    const { catAsync } = await import('../commands/catAsync');
    const out: string[] = [];
    const err: string[] = [];
    const io = {
      stdout: { write: (d: string) => out.push(d), on: () => {} },
      stderr: { write: (d: string) => err.push(d), on: () => {} },
      stdin: { read: () => '', on: () => {} },
    } as any;

    let code = await catAsync(['/proc/cpuinfo'], c, io);
    expect(code).toBe(0);
    expect(out.join('')).toContain('processor');
    out.length = 0;

    code = await catAsync(['/proc/meminfo'], c, io);
    expect(code).toBe(0);
    expect(out.join('')).toContain('MemTotal');
  });
});
