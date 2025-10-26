import { describe, it, expect } from 'vitest';
import { FileSystem } from '../core/filesystem';
import { addBaseFilesystem } from '../core/addBaseFilesystem';
import { Shell } from '../core/Shell';
import { Renderer } from '../core/Renderer';
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

describe('device files', () => {
  it('includes /dev/null and cat outputs nothing', async () => {
    const c = createContext();
    const fs = c.terminal.getFileSystem();
    const devNull = fs.getNode('/dev/null', 'busykoala', 'busygroup', 'read');
    expect(devNull).toBeTruthy();
    expect(devNull?.type).toBe('file');

    const { catAsync } = await import('../commands/catAsync');
    const out: string[] = [];
    const err: string[] = [];
    const io = {
      stdout: { write: (d: string) => out.push(d), on: () => {} },
      stderr: { write: (d: string) => err.push(d), on: () => {} },
      stdin: { read: () => '', on: () => {} },
    } as any;
    const code = await catAsync(['/dev/null'], c, io);
    expect(code).toBe(0);
    expect(out.join('')).toBe('');
  });

  it('redirects to /dev/null and discards output', async () => {
    const renderer = createMockRenderer();
    const context = createContext();
    const shell = new Shell({ renderer, context });

    const { echoAsyncCommand } = await import('../commands/echoAsync');
    shell.registerCommand(
      'echo',
      echoAsyncCommand.execute,
      echoAsyncCommand.description,
      echoAsyncCommand.usage,
    );

    await shell.executeCommand('echo hello > /dev/null');

    const fs = context.terminal.getFileSystem();
    const node = fs.getNode('/dev/null', 'busykoala', 'busygroup', 'read') as any;
    // Content should remain empty (discarded)
    expect(node.content).toBe('');
  });
});
