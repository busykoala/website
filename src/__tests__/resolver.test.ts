import { describe, it, expect } from 'vitest';
import { CommandResolver, AsyncCommand } from '../core/CommandResolver';
import { FileSystem } from '../core/filesystem';
import { addBaseFilesystem } from '../core/addBaseFilesystem';
import type { CommandContext } from '../core/TerminalCore';

function createContext(fs: FileSystem): CommandContext {
  return {
    env: {
      PWD: '/home/busykoala',
      HOME: '/home/busykoala',
      EDITOR: 'nvim',
      PATH: '/bin:/usr/bin',
      SHELL: '/bin/zsh',
      USER: 'busykoala',
      COMMANDS: {},
      LAST_EXIT_CODE: '0',
    },
    version: '2.0.0',
    history: [],
    files: {},
    terminal: { getFileSystem: () => fs } as any,
    shell: null as any,
  };
}

describe('CommandResolver', () => {
  it('resolves built-in commands', async () => {
    const fs = new FileSystem();
    addBaseFilesystem(fs);
    const builtin = new Map<string, AsyncCommand>();
    builtin.set('echo', async (args, _ctx, io) => {
      io.stdout.write(args.join(' '));
      return 0;
    });

    const resolver = new CommandResolver(builtin, fs);
    const ctx = createContext(fs);

    const res = await resolver.resolve('echo', ctx);
    expect(res.type).toBe('builtin');
    expect(res.command).not.toBeNull();
  });

  it('searches PATH and detects scripts by shebang', async () => {
    const fs = new FileSystem();
    addBaseFilesystem(fs);
    const builtin = new Map<string, AsyncCommand>();

    // Add an executable with a shebang
    fs.addFile(
      '/bin',
      'testscript',
      'root',
      'root',
      'root',
      'root',
      '#!/bin/sh\necho ok\n',
      'rwxr-xr-x',
      false,
      true,
    );

    const resolver = new CommandResolver(builtin, fs);
    const ctx = createContext(fs);

    const res = await resolver.resolve('testscript', ctx);
    expect(res.type === 'script' || res.type === 'executable').toBe(true);
    if (res.type === 'script') {
      expect(res.interpreter).toBe('/bin/sh');
      expect(res.path).toBe('/bin/testscript');
    }
  });

  it('resolves relative and absolute paths using context.env.PWD', async () => {
    const fs = new FileSystem();
    addBaseFilesystem(fs);

    // Place an executable in the home directory
    fs.addFile(
      '/home/busykoala',
      'runme',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'echo run\n',
      'rwxr-xr-x',
      false,
      true,
    );

    const builtin = new Map<string, AsyncCommand>();
    const resolver = new CommandResolver(builtin, fs);
    const ctx = createContext(fs);

    const res1 = await resolver.resolve('./runme', ctx);
    expect(res1.type === 'script' || res1.type === 'executable').toBe(true);
    const res2 = await resolver.resolve('/home/busykoala/runme', ctx);
    expect(res2.type === 'script' || res2.type === 'executable').toBe(true);
  });

  it('returns mapped executable for registered path', async () => {
    const fs = new FileSystem();
    addBaseFilesystem(fs);
    const builtin = new Map<string, AsyncCommand>();
    const resolver = new CommandResolver(builtin, fs);

    // Register a mapping
    const mapped: AsyncCommand = async (args, _ctx, io) => {
      io.stdout.write('mapped');
      return 0;
    };
    resolver.registerExecutable('/bin/fortune', mapped);

    const ctx = createContext(fs);
    const res = await resolver.resolve('fortune', ctx);
    expect(res.type).toBe('executable');
    expect(res.command).toBe(mapped);
  });
});
