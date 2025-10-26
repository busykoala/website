import { CommandContext, user, group } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { FileSystemNode } from '../core/filesystem';
import { resolvePath, normalizePath } from '../utils/pathUtils';
import { pathExists, isDirectory } from '../utils/fileValidation';
import { ExitCode } from '../utils/errorMessages';

type SizeSpec = { op: 'eq' | 'gt' | 'lt'; bytes: number } | null;
type TimeSpec = { op: 'eq' | 'gt' | 'lt'; days: number } | null;

function globToRegExp(pattern: string, caseInsensitive = false): RegExp {
  // Escape regex special chars, then replace \* and \? for glob
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp('^' + escaped + '$', caseInsensitive ? 'i' : undefined);
}

function parseSize(arg: string): SizeSpec {
  let op: 'eq' | 'gt' | 'lt' = 'eq';
  let s = arg;
  if (arg.startsWith('+')) {
    op = 'gt';
    s = arg.slice(1);
  } else if (arg.startsWith('-')) {
    op = 'lt';
    s = arg.slice(1);
  }
  // support k and M suffixes (1024-based)
  let bytes = 0;
  const m = s.match(/^(\d+)([kKmM]?)$/);
  if (!m) return null;
  bytes = parseInt(m[1], 10);
  const suf = m[2];
  if (suf === 'k' || suf === 'K') bytes *= 1024;
  if (suf === 'm' || suf === 'M') bytes *= 1024 * 1024;
  return { op, bytes };
}

function parseDays(arg: string): TimeSpec {
  let op: 'eq' | 'gt' | 'lt' = 'eq';
  let s = arg;
  if (arg.startsWith('+')) {
    op = 'gt';
    s = arg.slice(1);
  } else if (arg.startsWith('-')) {
    op = 'lt';
    s = arg.slice(1);
  }
  if (!/^\d+$/.test(s)) return null;
  return { op, days: parseInt(s, 10) };
}

interface FindOptions {
  path: string;
  name?: string;
  iname?: string;
  type?: 'f' | 'd';
  size?: SizeSpec;
  mtime?: TimeSpec;
  newer?: string | null;
  maxdepth?: number | null;
  mindepth?: number | null;
  print0?: boolean;
  exec?: { cmd: string; args: string[] } | null;
}

function parseArgs(
  args: string[],
  pwd: string,
): FindOptions | { help: true } | { version: true } | { error: string } {
  if (args.includes('--help') || args.includes('-h')) return { help: true };
  if (args.includes('--version')) return { version: true };

  let idx = 0;
  let path = '';
  if (idx < args.length && !args[idx].startsWith('-')) {
    path = args[idx++];
  }
  if (!path) path = pwd;

  const opts: FindOptions = {
    path,
    newer: null,
    maxdepth: null,
    mindepth: null,
    print0: false,
    exec: null,
  };

  while (idx < args.length) {
    const a = args[idx++];
    switch (a) {
      case '-name':
        if (idx >= args.length) return { error: 'find: missing argument to `-name`' };
        opts.name = args[idx++];
        break;
      case '-iname':
        if (idx >= args.length) return { error: 'find: missing argument to `-iname`' };
        opts.iname = args[idx++];
        break;
      case '-type': {
        if (idx >= args.length) return { error: 'find: missing argument to `-type`' };
        const t = args[idx++];
        if (t !== 'f' && t !== 'd') return { error: `find: unknown argument to -type: ${t}` };
        opts.type = t as 'f' | 'd';
        break;
      }
      case '-size': {
        if (idx >= args.length) return { error: 'find: missing argument to `-size`' };
        const size = parseSize(args[idx++]);
        if (!size) return { error: 'find: invalid -size argument' };
        opts.size = size;
        break;
      }
      case '-mtime': {
        if (idx >= args.length) return { error: 'find: missing argument to `-mtime`' };
        const mt = parseDays(args[idx++]);
        if (!mt) return { error: 'find: invalid -mtime argument' };
        opts.mtime = mt;
        break;
      }
      case '-newer':
        if (idx >= args.length) return { error: 'find: missing argument to `-newer`' };
        opts.newer = args[idx++];
        break;
      case '-maxdepth':
        if (idx >= args.length) return { error: 'find: missing argument to `-maxdepth`' };
        if (!/^\d+$/.test(args[idx])) return { error: 'find: invalid -maxdepth argument' };
        opts.maxdepth = parseInt(args[idx++], 10);
        break;
      case '-mindepth':
        if (idx >= args.length) return { error: 'find: missing argument to `-mindepth`' };
        if (!/^\d+$/.test(args[idx])) return { error: 'find: invalid -mindepth argument' };
        opts.mindepth = parseInt(args[idx++], 10);
        break;
      case '-print0':
        opts.print0 = true;
        break;
      case '-exec': {
        // parse until ';' or '\;'
        const cmdParts: string[] = [];
        while (idx < args.length && args[idx] !== ';' && args[idx] !== '\\;') {
          cmdParts.push(args[idx++]);
        }
        if (idx >= args.length) return { error: 'find: missing terminating `;` for -exec' };
        idx++; // consume ;
        if (cmdParts.length === 0) return { error: 'find: missing command for -exec' };
        const [cmd, ...rest] = cmdParts;
        opts.exec = { cmd, args: rest };
        break;
      }
      default:
        // ignore unknowns for now; could be path (if not first) or action
        return { error: `find: unknown predicate or option: ${a}` };
    }
  }

  return opts;
}

function matchNode(
  node: FileSystemNode,
  fullPath: string,
  opts: FindOptions,
  refNewerDate: Date | null,
): boolean {
  // -type
  if (
    opts.type &&
    ((opts.type === 'f' && node.type !== 'file') ||
      (opts.type === 'd' && node.type !== 'directory'))
  )
    return false;
  // -name
  if (opts.name) {
    const re = globToRegExp(opts.name);
    if (!re.test(node.name)) return false;
  }
  // -iname
  if (opts.iname) {
    const re = globToRegExp(opts.iname, true);
    if (!re.test(node.name)) return false;
  }
  // -size
  if (opts.size) {
    const size = node.type === 'file' ? node.size : 0;
    if (opts.size.op === 'eq' && size !== opts.size.bytes) return false;
    if (opts.size.op === 'gt' && !(size > opts.size.bytes)) return false;
    if (opts.size.op === 'lt' && !(size < opts.size.bytes)) return false;
  }
  // -mtime
  if (opts.mtime) {
    const now = Date.now();
    const diffDays = Math.floor((now - node.modified.getTime()) / (24 * 60 * 60 * 1000));
    const n = opts.mtime.days;
    if (opts.mtime.op === 'eq' && diffDays !== n) return false;
    if (opts.mtime.op === 'gt' && !(diffDays > n)) return false;
    if (opts.mtime.op === 'lt' && !(diffDays < n)) return false;
  }
  // -newer
  if (refNewerDate) {
    if (!(node.modified.getTime() > refNewerDate.getTime())) return false;
  }
  return true;
}

export async function findAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  const parsed = parseArgs(args, context.env.PWD);

  if ('help' in parsed) {
    io.stdout.write(
      findAsyncCommand.usage || findAsyncCommand.description || 'find [PATH] [EXPRESSION]',
    );
    return ExitCode.SUCCESS;
  }
  if ('version' in parsed) {
    io.stdout.write('find (GNU coreutils simulation) 1.0.0\n');
    return ExitCode.SUCCESS;
  }
  if ('error' in parsed) {
    io.stderr.write(parsed.error);
    return ExitCode.GENERAL_ERROR;
  }

  const opts = parsed as FindOptions;
  const fileSystem = context.terminal.getFileSystem();

  try {
    const startPath = normalizePath(resolvePath(opts.path, context.env.PWD));

    // Validate start path is an accessible directory (preserve existing error strings)
    const exists = pathExists(fileSystem, startPath, '/');
    if (!exists.valid) {
      io.stderr.write(`find: '${opts.path}': No such file or directory`);
      return ExitCode.GENERAL_ERROR;
    }
    const asDir = isDirectory(fileSystem, startPath, '/');
    if (!asDir.valid) {
      io.stderr.write(`find: '${opts.path}': Not a directory`);
      return ExitCode.GENERAL_ERROR;
    }

    let refNewerDate: Date | null = null;
    if (opts.newer) {
      const refPath = normalizePath(
        resolvePath(opts.newer.startsWith('/') ? opts.newer : `${startPath}/${opts.newer}`, '/'),
      );
      try {
        const refNode = fileSystem.getNode(refPath, user, group);
        if (refNode) refNewerDate = refNode.modified;
        else {
          io.stderr.write(`find: '${opts.newer}': No such file or directory`);
          return ExitCode.GENERAL_ERROR;
        }
      } catch {
        io.stderr.write(`find: '${opts.newer}': No such file or directory`);
        return ExitCode.GENERAL_ERROR;
      }
    }

    const outputs: string[] = [];

    const traverse = (path: string, depth: number) => {
      // guard depth
      if (opts.maxdepth !== null && opts.maxdepth !== undefined && depth > opts.maxdepth) return;

      // list entries
      let children: FileSystemNode[] = [];
      try {
        children = fileSystem.listDirectory(path, user, group, { showHidden: true });
      } catch {
        return; // skip directories we cannot read
      }

      for (const child of children) {
        const childPath = fileSystem.normalizePath(`${path}/${child.name}`);
        const entryDepth = depth + 1; // depth from start for entries

        // match node if it passes mindepth
        const meetsMindepth = opts.mindepth == null || entryDepth >= (opts.mindepth || 0);
        if (meetsMindepth && matchNode(child, childPath, opts, refNewerDate)) {
          if (opts.exec && opts.exec.cmd === 'echo') {
            // Minimal -exec echo support; replace {} tokens
            const rendered = opts.exec.args.map((a) => (a === '{}' ? childPath : a)).join(' ');
            outputs.push(rendered);
          } else {
            outputs.push(childPath);
          }
        }

        if (child.type === 'directory') {
          traverse(childPath, entryDepth);
        }
      }
    };

    traverse(startPath, 0);

    const sep = opts.print0 ? '\0' : '\n';
    io.stdout.write(outputs.join(sep));
    return ExitCode.SUCCESS;
  } catch (error) {
    io.stderr.write(`find: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return ExitCode.GENERAL_ERROR;
  }
}

export const findAsyncCommand = {
  description: 'Search for files in a directory hierarchy',
  usage:
    'find [PATH] [EXPRESSION]\n  -name PATTERN       File name matches shell pattern\n  -iname PATTERN      Like -name, case-insensitive\n  -type [f|d]         File type is f (regular) or d (directory)\n  -size N[k|M]        File size exactly N bytes (1024-based), prefix with + or - for greater/less\n  -mtime N            File last modified N days ago; +N for more, -N for less\n  -newer FILE         File modified more recently than FILE\n  -maxdepth N         Descend at most N levels of directories below starting points\n  -mindepth N         Do not apply tests/actions at levels less than N\n  -print0             Print the full file name on the standard output, followed by a null character\n  -exec echo ... {} ; Execute echo with the current file name substituted for {}\n  --help, --version   Show help or version',
  execute: findAsync,
};
