import { describe, it, expect } from 'vitest';
import type { CommandContext } from '../../core/TerminalCore';
import type { IOStreams } from '../../core/streams';
import { FileSystem } from '../../core/filesystem';
import { addBaseFilesystem } from '../../core/addBaseFilesystem';

import { echoAsync } from '../../commands/echoAsync';
import { pwdAsync } from '../../commands/pwdAsync';
import { cdAsync } from '../../commands/cdAsync';
import { lsAsync } from '../../commands/lsAsync';
import { catAsync } from '../../commands/catAsync';
import { headAsync } from '../../commands/headAsync';
import { tailAsync } from '../../commands/tailAsync';
import { grepAsync } from '../../commands/grepAsync';
import { rmAsync } from '../../commands/rmAsync';
import { touchAsync } from '../../commands/touchAsync';
import { cowsayAsync } from '../../commands/cowsayAsync';
import { historyAsync } from '../../commands/historyAsync';
import { slAsync } from '../../commands/slAsync';
import { unsetAsync } from '../../commands/unsetAsync';
import { duAsync } from '../../commands/duAsync';
import { unameAsync } from '../../commands/unameAsync';
import { hostnameAsync } from '../../commands/hostnameAsync';
import { chmodAsync } from '../../commands/chmodAsync';
import { envAsync } from '../../commands/envAsync';
import { wcAsync } from '../../commands/wcAsync';
import { findAsync } from '../../commands/findAsync';
import { whoamiAsync } from '../../commands/whoamiAsync';
import { clearAsync } from '../../commands/clearAsync';
import { helpAsync } from '../../commands/helpAsync';
import { mvAsync } from '../../commands/mvAsync';
import { exportAsync } from '../../commands/exportAsync';
import { chownAsync } from '../../commands/chownAsync';
import { treeAsync } from '../../commands/treeAsync';
import { cmatrixAsync } from '../../commands/cmatrixAsync';
import { fortuneAsync } from '../../commands/fortuneAsync';
import { mkdirAsync } from '../../commands/mkdirAsync';
import { cpAsync } from '../../commands/cpAsync';
import { dateAsync } from '../../commands/dateAsync';
import { dfAsync } from '../../commands/dfAsync';
import { idAsync } from '../../commands/idAsync';

function createMockIO(): IOStreams {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout: { write: (data: string) => stdout.push(data), on: () => {} } as any,
    stderr: { write: (data: string) => stderr.push(data), on: () => {} } as any,
    stdin: { read: () => '', on: () => {} } as any,
    _stdout: stdout,
    _stderr: stderr,
  } as any;
}

function createMockContext(): CommandContext {
  const fileSystem = new FileSystem();
  addBaseFilesystem(fileSystem);

  // minimal mock shell with getCommands
  const commands: Record<string, { description: string; execute: any }> = {
    echo: { description: 'Display a line of text', execute: echoAsync },
    pwd: { description: 'Print working directory', execute: pwdAsync },
    cd: { description: 'Change directory', execute: cdAsync },
    ls: { description: 'List directory', execute: lsAsync },
    cat: { description: 'Concatenate files', execute: catAsync },
    head: { description: 'Head', execute: headAsync },
    tail: { description: 'Tail', execute: tailAsync },
    grep: { description: 'Grep', execute: grepAsync },
    rm: { description: 'Remove', execute: rmAsync },
    touch: { description: 'Touch', execute: touchAsync },
    cowsay: { description: 'Cowsay', execute: cowsayAsync },
    history: { description: 'History', execute: historyAsync },
    sl: { description: 'SL', execute: slAsync },
    unset: { description: 'Unset', execute: unsetAsync },
    du: { description: 'DU', execute: duAsync },
    uname: { description: 'Uname', execute: unameAsync },
    hostname: { description: 'Hostname', execute: hostnameAsync },
    chmod: { description: 'Chmod', execute: chmodAsync },
    env: { description: 'Env', execute: envAsync },
    wc: { description: 'WC', execute: wcAsync },
    find: { description: 'Find', execute: findAsync },
    whoami: { description: 'Whoami', execute: whoamiAsync },
    clear: { description: 'Clear', execute: clearAsync },
    help: { description: 'Help', execute: helpAsync },
    mv: { description: 'MV', execute: mvAsync },
    export: { description: 'Export', execute: exportAsync },
    chown: { description: 'Chown', execute: chownAsync },
    tree: { description: 'Tree', execute: treeAsync },
    cmatrix: { description: 'Cmatrix', execute: cmatrixAsync },
    fortune: { description: 'Fortune', execute: fortuneAsync },
    mkdir: { description: 'Mkdir', execute: mkdirAsync },
    cp: { description: 'CP', execute: cpAsync },
    date: { description: 'Date', execute: dateAsync },
    df: { description: 'DF', execute: dfAsync },
    id: { description: 'ID', execute: idAsync },
  };

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
    terminal: { getFileSystem: () => fileSystem } as any,
    shell: { getCommands: () => commands } as any,
  };
}

describe('help flags for all commands', () => {
  const commands: Array<{
    name: string;
    fn: (args: string[], context: CommandContext, io: IOStreams) => Promise<number>;
  }> = [
    { name: 'echo', fn: echoAsync },
    { name: 'pwd', fn: pwdAsync },
    { name: 'cd', fn: cdAsync },
    { name: 'ls', fn: lsAsync },
    { name: 'cat', fn: catAsync },
    { name: 'head', fn: headAsync },
    { name: 'tail', fn: tailAsync },
    { name: 'grep', fn: grepAsync },
    { name: 'rm', fn: rmAsync },
    { name: 'touch', fn: touchAsync },
    { name: 'cowsay', fn: cowsayAsync },
    { name: 'history', fn: historyAsync },
    { name: 'sl', fn: slAsync },
    { name: 'unset', fn: unsetAsync },
    { name: 'du', fn: duAsync },
    { name: 'uname', fn: unameAsync },
    { name: 'hostname', fn: hostnameAsync },
    { name: 'chmod', fn: chmodAsync },
    { name: 'env', fn: envAsync },
    { name: 'wc', fn: wcAsync },
    { name: 'find', fn: findAsync },
    { name: 'whoami', fn: whoamiAsync },
    { name: 'clear', fn: clearAsync },
    { name: 'help', fn: helpAsync },
    { name: 'mv', fn: mvAsync },
    { name: 'export', fn: exportAsync },
    { name: 'chown', fn: chownAsync },
    { name: 'tree', fn: treeAsync },
    { name: 'cmatrix', fn: cmatrixAsync },
    { name: 'fortune', fn: fortuneAsync },
    { name: 'mkdir', fn: mkdirAsync },
    { name: 'cp', fn: cpAsync },
    { name: 'date', fn: dateAsync },
    { name: 'df', fn: dfAsync },
    { name: 'id', fn: idAsync },
  ];

  for (const cmd of commands) {
    it(`shows --help for ${cmd.name}`, async () => {
      const io = createMockIO();
      const context = createMockContext();
      const exitCode = await cmd.fn(['--help'], context, io);
      expect(exitCode).toBe(0);
      const out = (io as any)._stdout.join('').toLowerCase();
      expect(out).toContain(cmd.name);
    });
  }
});
