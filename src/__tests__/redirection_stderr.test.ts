import { describe, it, expect } from 'vitest';
import { Shell } from '../core/Shell';
import { Renderer } from '../core/Renderer';
import { FileSystem } from '../core/filesystem';
import { addBaseFilesystem } from '../core/addBaseFilesystem';
import type { CommandContext } from '../core/TerminalCore';

function createMockRenderer(): Renderer {
  const mockOutput = { innerHTML: '', textContent: '', appendChild: () => {} } as any;
  const mockPrompt = {
    innerHTML: '',
    querySelector: () => ({ textContent: '' }),
    cloneNode: () => ({ querySelector: () => ({ remove: () => {} }), innerHTML: '' }),
  } as any;
  const mockInput = { value: '', focus: () => {} } as any;
  return new Renderer({
    outputElement: mockOutput,
    promptElement: mockPrompt,
    inputElement: mockInput,
  });
}

function createContext(): CommandContext {
  const fs = new FileSystem();
  addBaseFilesystem(fs);
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

describe('stderr redirection', () => {
  it('redirects stderr with 2> to a file', async () => {
    const renderer = createMockRenderer();
    const context = createContext();
    const shell = new Shell({ renderer, context });

    const { catAsyncCommand } = await import('../commands/catAsync');
    shell.registerCommand(
      'cat',
      catAsyncCommand.execute,
      catAsyncCommand.description,
      catAsyncCommand.usage,
    );

    await shell.executeCommand('cat nope.txt 2> err.txt');

    const fs = context.terminal.getFileSystem();
    const err = fs.getNode('/home/busykoala/err.txt', 'busykoala', 'busygroup', 'read') as any;
    expect(err).toBeTruthy();
    expect(err.content.toLowerCase()).toContain('no such file');
  });

  it('merges stderr into stdout with 2>&1 when redirecting > out', async () => {
    const renderer = createMockRenderer();
    const context = createContext();
    const shell = new Shell({ renderer, context });

    const { catAsyncCommand } = await import('../commands/catAsync');
    shell.registerCommand(
      'cat',
      catAsyncCommand.execute,
      catAsyncCommand.description,
      catAsyncCommand.usage,
    );

    await shell.executeCommand('cat nope.txt > out.txt 2>&1');

    const fs = context.terminal.getFileSystem();
    const out = fs.getNode('/home/busykoala/out.txt', 'busykoala', 'busygroup', 'read') as any;
    expect(out).toBeTruthy();
    expect(out.content.toLowerCase()).toContain('no such file');
  });

  it('discards stderr when redirected to /dev/null', async () => {
    const renderer = createMockRenderer();
    const context = createContext();
    const shell = new Shell({ renderer, context });

    const { catAsyncCommand } = await import('../commands/catAsync');
    shell.registerCommand(
      'cat',
      catAsyncCommand.execute,
      catAsyncCommand.description,
      catAsyncCommand.usage,
    );

    await shell.executeCommand('cat nope.txt 2> /dev/null');

    const fs = context.terminal.getFileSystem();
    // Ensure no err file created and /dev/null remains empty
    let errNode: any = null;
    try {
      errNode = fs.getNode('/home/busykoala/err.txt', 'busykoala', 'busygroup', 'read');
    } catch {}
    expect(errNode).toBeNull();
    const devNull = fs.getNode('/dev/null', 'busykoala', 'busygroup', 'read') as any;
    expect(devNull.content).toBe('');
  });
});
