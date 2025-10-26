import { describe, it, expect } from 'vitest';
import { Shell } from '../core/Shell';
import { Renderer } from '../core/Renderer';
import { FileSystem } from '../core/filesystem';
import { addBaseFilesystem } from '../core/addBaseFilesystem';
import type { CommandContext } from '../core/TerminalCore';

function createRenderer(): Renderer {
  const outputEl = document.createElement('div');
  const promptEl = document.createElement('div');
  const pathSpan = document.createElement('span');
  pathSpan.className = 'prompt-path';
  promptEl.appendChild(pathSpan);
  const inputPh = document.createElement('input');
  inputPh.id = 'terminal-input';
  promptEl.appendChild(inputPh);
  const inputEl = document.createElement('input') as HTMLInputElement;
  return new Renderer({ outputElement: outputEl, promptElement: promptEl, inputElement: inputEl });
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

describe('here-strings (<<<) and parser quoting/escaping', () => {
  it('feeds here-string into stdin for cat', async () => {
    const renderer = createRenderer();
    const context = createContext();
    const shell = new Shell({ renderer, context });
    const { catAsyncCommand } = await import('../commands/catAsync');
    shell.registerCommand(
      'cat',
      catAsyncCommand.execute,
      catAsyncCommand.description,
      catAsyncCommand.usage,
    );

    await shell.executeCommand('cat <<< "hello" > out.txt');

    const fs = context.terminal.getFileSystem();
    const node = fs.getNode('/home/busykoala/out.txt', 'busykoala', 'busygroup', 'read') as any;
    expect(node).toBeTruthy();
    expect(node.content).toBe('hello\n');
  });

  it('supports here-string with spaces when quoted', async () => {
    const renderer = createRenderer();
    const context = createContext();
    const shell = new Shell({ renderer, context });
    const { catAsyncCommand } = await import('../commands/catAsync');
    shell.registerCommand(
      'cat',
      catAsyncCommand.execute,
      catAsyncCommand.description,
      catAsyncCommand.usage,
    );

    await shell.executeCommand('cat <<< "foo bar" > out2.txt');

    const fs = context.terminal.getFileSystem();
    const node = fs.getNode('/home/busykoala/out2.txt', 'busykoala', 'busygroup', 'read') as any;
    expect(node).toBeTruthy();
    expect(node.content).toBe('foo bar\n');
  });

  it('applies flags when using here-string (cat -n)', async () => {
    const renderer = createRenderer();
    const context = createContext();
    const shell = new Shell({ renderer, context });
    const { catAsyncCommand } = await import('../commands/catAsync');
    shell.registerCommand(
      'cat',
      catAsyncCommand.execute,
      catAsyncCommand.description,
      catAsyncCommand.usage,
    );

    await shell.executeCommand('cat -n <<< x > numbered.txt');

    const fs = context.terminal.getFileSystem();
    const node = fs.getNode(
      '/home/busykoala/numbered.txt',
      'busykoala',
      'busygroup',
      'read',
    ) as any;
    expect(node).toBeTruthy();
    expect(node.content).toBe('     1\tx\n');
  });

  it('preserves quotes/escapes for echo via shell parser', async () => {
    const renderer = createRenderer();
    const context = createContext();
    const shell = new Shell({ renderer, context });
    const { echoAsyncCommand } = await import('../commands/echoAsync');
    shell.registerCommand(
      'echo',
      echoAsyncCommand.execute,
      echoAsyncCommand.description,
      echoAsyncCommand.usage,
    );

    await shell.executeCommand('echo "foo bar" > e.txt');
    await shell.executeCommand('echo -E "a\\nb" > e2.txt');

    const fs = context.terminal.getFileSystem();
    const e = fs.getNode('/home/busykoala/e.txt', 'busykoala', 'busygroup', 'read') as any;
    const e2 = fs.getNode('/home/busykoala/e2.txt', 'busykoala', 'busygroup', 'read') as any;
    expect(e.content).toBe('foo bar\n');
    expect(e2.content).toBe('a\\nb\n');
  });
});
