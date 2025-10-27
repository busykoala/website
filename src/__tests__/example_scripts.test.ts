import { describe, it, expect } from 'vitest';
import { FileSystem } from '../core/filesystem';
import { addBaseFilesystem } from '../core/addBaseFilesystem';
import type { CommandContext } from '../core/TerminalCore';
import { Shell } from '../core/Shell';
import { Renderer } from '../core/Renderer';
import { registerAllCommands } from '../utils/commandRegistry';

function createRenderer(): Renderer {
  const outputEl = document.createElement('div');
  const promptEl = document.createElement('div');
  const pathSpan = document.createElement('span');
  pathSpan.className = 'prompt-path';
  promptEl.appendChild(pathSpan);
  const inputEl = document.createElement('input');
  inputEl.id = 'terminal-input';
  promptEl.appendChild(inputEl);
  const realInputEl = document.createElement('input') as HTMLInputElement;
  return new Renderer({
    outputElement: outputEl,
    promptElement: promptEl,
    inputElement: realInputEl,
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
      PATH: '/bin:/usr/bin',
      EDITOR: 'nvim',
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

describe('example scripts seeded in filesystem', () => {
  it('seeds hello.sh, greet.sh, count.sh with shebang and executable perms', () => {
    const fs = new FileSystem();
    addBaseFilesystem(fs);

    const paths = [
      '/home/busykoala/hello.sh',
      '/home/busykoala/greet.sh',
      '/home/busykoala/count.sh',
    ];
    for (const p of paths) {
      const node = fs.getNode(p, 'busykoala', 'busygroup', 'read');
      expect(node && node.type === 'file').toBe(true);
      expect(node!.permissions[2] !== '-').toBe(true); // owner execute bit
      expect((node!.content || '').startsWith('#!')).toBe(true);
    }
  });

  it('executes hello.sh via shebang interpreter', async () => {
    const renderer = createRenderer();
    const context = createContext();
    const shell = new Shell({ renderer, context });
    await registerAllCommands(shell);

    await shell.executeCommand('./hello.sh > out.txt');

    const fs = context.terminal.getFileSystem();
    const out = fs.getNode('/home/busykoala/out.txt', 'busykoala', 'busygroup', 'read') as any;
    expect(String(out.content)).toContain('Hello from script');
  });

  it('executes greet.sh with positional arg', async () => {
    const renderer = createRenderer();
    const context = createContext();
    const shell = new Shell({ renderer, context });
    await registerAllCommands(shell);

    await shell.executeCommand('./greet.sh John > out.txt');

    const fs = context.terminal.getFileSystem();
    const out = fs.getNode('/home/busykoala/out.txt', 'busykoala', 'busygroup', 'read') as any;
    expect(String(out.content)).toBe('Hello, John\n');
  });

  it('executes count.sh and captures all lines', async () => {
    const renderer = createRenderer();
    const context = createContext();
    const shell = new Shell({ renderer, context });
    await registerAllCommands(shell);

    await shell.executeCommand('./count.sh > out.txt');

    const fs = context.terminal.getFileSystem();
    const out = fs.getNode('/home/busykoala/out.txt', 'busykoala', 'busygroup', 'read') as any;
    expect(String(out.content)).toBe('1\n2\n3\n');
  });
});
