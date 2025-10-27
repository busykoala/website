import { describe, it, expect } from 'vitest';
import { InterpreterRegistry } from '../core/InterpreterRegistry';
import { FileSystem } from '../core/filesystem';
import { addBaseFilesystem } from '../core/addBaseFilesystem';
import type { CommandContext } from '../core/TerminalCore';
import type { IOStreams } from '../core/streams';
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

function createContext(fs: FileSystem): CommandContext {
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

function createIO(): IOStreams & { _stdout: string[]; _stderr: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  return {
    stdout: { write: (d: string) => out.push(d), on: () => {} } as any,
    stderr: { write: (d: string) => err.push(d), on: () => {} } as any,
    stdin: { read: () => '', on: () => {} } as any,
    _stdout: out,
    _stderr: err,
  } as any;
}

describe('InterpreterRegistry', () => {
  it('executes shell scripts line-by-line', async () => {
    const fs = new FileSystem();
    addBaseFilesystem(fs);
    const ctx = createContext(fs);
    const io = createIO();

    // Bind a shell with full command set
    const renderer = createRenderer();
    const shell = new Shell({ renderer, context: ctx });
    await registerAllCommands(shell);

    fs.addFile(
      '/home/busykoala',
      'test.sh',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      '#!/bin/sh\necho hi\n# comment\n\necho bye\n',
      'rwxr-xr-x',
    );

    const interp = new InterpreterRegistry();
    const code = await interp.execute('sh', '/home/busykoala/test.sh', [], ctx, io, fs);

    expect(code).toBe(0);
    const out = io._stdout.join('');
    expect(out).toContain('hi\n');
    expect(out).toContain('bye\n');
    expect(out).not.toMatch(/comment/);
  });

  it('executes node scripts and supports process.exit', async () => {
    const fs = new FileSystem();
    addBaseFilesystem(fs);
    const ctx = createContext(fs);
    const io = createIO();

    fs.addFile(
      '/home/busykoala',
      'ok.js',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      '#!/usr/bin/env node\nconsole.log("ok")\n',
      'rwxr-xr-x',
    );
    fs.addFile(
      '/home/busykoala',
      'exit.js',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'process.exit(5)\n',
      'rwxr-xr-x',
    );

    const interp = new InterpreterRegistry();
    let code = await interp.execute('node', '/home/busykoala/ok.js', [], ctx, io, fs);
    expect(code).toBe(0);
    expect(io._stdout.join('')).toContain('ok\n');

    io._stdout.length = 0;
    code = await interp.execute('node', '/home/busykoala/exit.js', [], ctx, io, fs);
    expect(code).toBe(5);
  });

  it('returns 127 for unknown interpreter and writes error', async () => {
    const fs = new FileSystem();
    addBaseFilesystem(fs);
    const ctx = createContext(fs);
    const io = createIO();

    fs.addFile(
      '/home/busykoala',
      'x.sh',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'echo hi\n',
      'rwxr-xr-x',
    );

    const interp = new InterpreterRegistry();
    const code = await interp.execute('/bin/unknown', '/home/busykoala/x.sh', [], ctx, io, fs);
    expect(code).toBe(127);
    expect(io._stderr.join('')).toMatch(/Interpreter not found/i);
  });

  it('errors when script file missing', async () => {
    const fs = new FileSystem();
    addBaseFilesystem(fs);
    const ctx = createContext(fs);
    const io = createIO();

    const interp = new InterpreterRegistry();
    const code = await interp.execute('sh', '/home/bogus/nope.sh', [], ctx, io, fs);
    expect(code).toBe(1);
    expect(io._stderr.join('')).toMatch(/No such file or directory/i);
  });

  it('shell: splits by ; outside quotes and preserves quoted semicolons', async () => {
    const fs = new FileSystem();
    addBaseFilesystem(fs);
    const ctx = createContext(fs);
    const io = createIO();

    const renderer = createRenderer();
    const shell = new Shell({ renderer, context: ctx });
    await registerAllCommands(shell);

    fs.addFile(
      '/home/busykoala',
      'semi.sh',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      '#!/bin/sh\necho one; echo two; echo "a; b"\n',
      'rwxr-xr-x',
    );

    const interp = new InterpreterRegistry();
    const code = await interp.execute('sh', '/home/busykoala/semi.sh', [], ctx, io, fs);
    expect(code).toBe(0);
    const out = io._stdout.join('');
    expect(out).toBe('one\ntwo\na; b\n');
  });

  it('shell: expands $1, ${1}, and $HOME; single-quotes prevent expansion', async () => {
    const fs = new FileSystem();
    addBaseFilesystem(fs);
    const ctx = createContext(fs);
    const io = createIO();

    const renderer = createRenderer();
    const shell = new Shell({ renderer, context: ctx });
    await registerAllCommands(shell);

    fs.addFile(
      '/home/busykoala',
      'vars.sh',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      '#!/bin/sh\necho Hello, $1; echo ${1}; echo $HOME; echo \"$1\"; echo \"${1}\"; echo \"$HOME\"; echo \'$1\'\n',
      'rwxr-xr-x',
    );

    const interp = new InterpreterRegistry();
    const code = await interp.execute('sh', '/home/busykoala/vars.sh', ['World'], ctx, io, fs);
    expect(code).toBe(0);
    const out = io._stdout.join('');
    const lines = out.split('\n').filter((l) => l.length > 0);
    expect(lines[0]).toBe('Hello, World');
    expect(lines[1]).toBe('World');
    expect(lines[2]).toBe(ctx.env.HOME);
    expect(lines[3]).toBe('World');
    expect(lines[4]).toBe('World');
    expect(lines[5]).toBe(ctx.env.HOME);
    expect(lines[6]).toBe('$1');
  });

  it('shell: supports redirection inside scripts via delegated shell', async () => {
    const fs = new FileSystem();
    addBaseFilesystem(fs);
    const ctx = createContext(fs);
    const io = createIO();

    const renderer = createRenderer();
    const shell = new Shell({ renderer, context: ctx });
    await registerAllCommands(shell);

    fs.addFile(
      '/home/busykoala',
      'redir.sh',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      '#!/bin/sh\necho hi > out.txt\n',
      'rwxr-xr-x',
    );

    const interp = new InterpreterRegistry();
    const code = await interp.execute('sh', '/home/busykoala/redir.sh', [], ctx, io, fs);
    expect(code).toBe(0);
    const outFile = fs.getNode('/home/busykoala/out.txt', 'busykoala', 'busygroup', 'read') as any;
    expect(String(outFile.content)).toBe('hi\n');
  });

  it('node: writes console.error to stderr and propagates argv/env', async () => {
    const fs = new FileSystem();
    addBaseFilesystem(fs);
    const ctx = createContext(fs);
    const io = createIO();

    fs.addFile(
      '/home/busykoala',
      'n1.js',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      '#!/usr/bin/env node\nconsole.error("E:" + process.argv.slice(2).join(",") + ";U=" + process.env.USER)\n',
      'rwxr-xr-x',
    );

    const interp = new InterpreterRegistry();
    const code = await interp.execute('node', '/home/busykoala/n1.js', ['a', 'b'], ctx, io, fs);
    expect(code).toBe(0);
    expect(io._stderr.join('')).toContain('E:a,b;U=busykoala');
  });

  it('node: prints uncaught exception message to stderr', async () => {
    const fs = new FileSystem();
    addBaseFilesystem(fs);
    const ctx = createContext(fs);
    const io = createIO();

    fs.addFile(
      '/home/busykoala',
      'boom.js',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      '#!/usr/bin/env node\nthrow new Error("BOOM")\n',
      'rwxr-xr-x',
    );

    const interp = new InterpreterRegistry();
    const code = await interp.execute('node', '/home/busykoala/boom.js', [], ctx, io, fs);
    expect(code).toBe(1);
    expect(io._stderr.join('')).toMatch(/node: Error: BOOM/);
  });

  it('shell: sets env var and echoes it in a script', async () => {
    const fs = new FileSystem();
    addBaseFilesystem(fs);
    const ctx = createContext(fs);
    const io = createIO();

    const renderer = createRenderer();
    const shell = new Shell({ renderer, context: ctx });
    await registerAllCommands(shell);

    fs.addFile(
      '/home/busykoala',
      'env.sh',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      '#!/bin/sh\nNAME=James\necho $NAME\n',
      'rwxr-xr-x',
    );

    const interp = new InterpreterRegistry();
    const code = await interp.execute('sh', '/home/busykoala/env.sh', [], ctx, io, fs);
    expect(code).toBe(0);
    expect(io._stdout.join('')).toBe('James\n');
    expect(ctx.env.NAME).toBe('James');
  });

  it('shell: command substitution captures stdout and cleans up file', async () => {
    const fs = new FileSystem();
    addBaseFilesystem(fs);
    const ctx = createContext(fs);
    const io = createIO();

    const renderer = createRenderer();
    const shell = new Shell({ renderer, context: ctx });
    await registerAllCommands(shell);

    fs.addFile(
      '/home/busykoala',
      'cmdsub.sh',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      '#!/bin/sh\necho "foo" > foo\nFOO=$(cat foo)\nrm foo\necho $FOO\n',
      'rwxr-xr-x',
    );

    const interp = new InterpreterRegistry();
    const code = await interp.execute('sh', '/home/busykoala/cmdsub.sh', [], ctx, io, fs);
    expect(code).toBe(0);
    expect(io._stdout.join('')).toBe('foo\n');
    expect(() => fs.getNode('/home/busykoala/foo', 'busykoala', 'busygroup', 'read')).toThrow();
  });
});
