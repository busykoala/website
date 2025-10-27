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

describe('Pipeline and redirect across more commands', () => {
  it('pipes echo -> echo and redirects to a file', async () => {
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

    await shell.executeCommand('echo hello | echo world > out1.txt');

    const fs = context.terminal.getFileSystem();
    const node = fs.getNode('/home/busykoala/out1.txt', 'busykoala', 'busygroup', 'read') as any;
    expect(node).toBeTruthy();
    expect(node.content).toBe('hello world\n');
  });

  it('pipes echo -> cowsay and redirects output', async () => {
    const renderer = createMockRenderer();
    const context = createContext();
    const shell = new Shell({ renderer, context });

    const { echoAsyncCommand } = await import('../commands/echoAsync');
    const { cowsayAsyncCommand } = await import('../commands/cowsayAsync');
    shell.registerCommand(
      'echo',
      echoAsyncCommand.execute,
      echoAsyncCommand.description,
      echoAsyncCommand.usage,
    );
    shell.registerCommand(
      'cowsay',
      cowsayAsyncCommand.execute,
      cowsayAsyncCommand.description,
      cowsayAsyncCommand.usage,
    );

    await shell.executeCommand('echo hello | cowsay > cow.html');

    const fs = context.terminal.getFileSystem();
    const node = fs.getNode('/home/busykoala/cow.html', 'busykoala', 'busygroup', 'read') as any;
    expect(node).toBeTruthy();
    expect(node.content).toContain('hello');
  });

  it('pipes cat -> echo and appends with >>', async () => {
    const renderer = createMockRenderer();
    const context = createContext();
    const shell = new Shell({ renderer, context });

    const fs = context.terminal.getFileSystem();
    fs.addFile(
      '/home/busykoala',
      'f.txt',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'foo',
      'rw-r--r--',
    );

    const { catAsyncCommand } = await import('../commands/catAsync');
    const { echoAsyncCommand } = await import('../commands/echoAsync');
    shell.registerCommand(
      'cat',
      catAsyncCommand.execute,
      catAsyncCommand.description,
      catAsyncCommand.usage,
    );
    shell.registerCommand(
      'echo',
      echoAsyncCommand.execute,
      echoAsyncCommand.description,
      echoAsyncCommand.usage,
    );

    await shell.executeCommand('cat f.txt | echo X > out2.txt');
    await shell.executeCommand('cat f.txt | echo Y >> out2.txt');

    const node = fs.getNode('/home/busykoala/out2.txt', 'busykoala', 'busygroup', 'read') as any;
    expect(node).toBeTruthy();
    expect(node.content).toBe('foo X\nfoo Y\n');
  });
});
