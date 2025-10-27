import { CommandContext, group } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { parseFlags } from '../utils/flagParser';
import { resolvePath, normalizePath } from '../utils/pathUtils';
import {
  ExitCode,
  commandError,
  fileNotFound,
  permissionDenied,
  writeError,
} from '../utils/errorMessages';

function formatSize(size: number, human: boolean): string {
  if (!human) return String(size);
  const units = ['B', 'K', 'M', 'G', 'T'];
  let unitIndex = 0;
  let displaySize = size;
  while (displaySize >= 1024 && unitIndex < units.length - 1) {
    displaySize /= 1024;
    unitIndex++;
  }
  return `${displaySize.toFixed(1)}${units[unitIndex]}`;
}

function isExecutable(perm: string): boolean {
  return perm[2] === 'x' || perm[5] === 'x' || perm[8] === 'x';
}

function inodeOf(path: string): number {
  let h = 0;
  for (let i = 0; i < path.length; i++) {
    h = (h << 5) - h + path.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export async function lsAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  const parsed = parseFlags(args);

  // Check for --help (avoid conflict with -h for human-readable)
  if (args.includes('--help')) {
    io.stdout.write(
      lsAsyncCommand.usage || lsAsyncCommand.description || 'ls [options] [file|dir]...',
    );
    return ExitCode.SUCCESS;
  }
  if (args.includes('--version')) {
    io.stdout.write('ls (GNU coreutils simulation) 1.0.0\n');
    return ExitCode.SUCCESS;
  }

  const fileSystem = context.terminal.getFileSystem();
  let color: 'auto' | 'always' | 'never' = 'auto';

  // Handle --color flag manually (not in standard parsed flags)
  for (const arg of args) {
    if (arg.startsWith('--color')) {
      const eq = arg.indexOf('=');
      if (eq !== -1) {
        const val = arg.slice(eq + 1);
        if (val === 'never' || val === 'always' || val === 'auto') {
          color = val as any;
        }
      } else {
        color = 'always';
      }
      break;
    }
  }

  const showHidden = parsed.raw.has('a') || parsed.raw.has('A');
  const longFormat = parsed.raw.has('l');
  const humanReadable = parsed.raw.has('h');
  const listDirectoriesThemselves = parsed.raw.has('d');
  const classify = parsed.raw.has('F');
  const showInode = parsed.raw.has('i');
  const reverse = parsed.raw.has('r');
  const recursive = parsed.raw.has('R') && !listDirectoriesThemselves;
  const sortBySize = parsed.raw.has('S');
  const sortByTime = parsed.raw.has('t');
  const singleColumn = parsed.raw.has('1');

  const targets = parsed.positional.length > 0 ? parsed.positional : [context.env.PWD];

  const applySort = (items: any[]) => {
    const arr = [...items];
    if (sortBySize) arr.sort((a, b) => b.size - a.size || a.name.localeCompare(b.name));
    else if (sortByTime)
      arr.sort(
        (a, b) => b.modified.getTime() - a.modified.getTime() || a.name.localeCompare(b.name),
      );
    else arr.sort((a, b) => a.name.localeCompare(b.name));
    if (reverse) arr.reverse();
    return arr;
  };

  const nameWithClass = (item: any) => {
    const suffix = classify
      ? item.type === 'directory'
        ? '/'
        : isExecutable(item.permissions)
          ? '*'
          : ''
      : item.type === 'directory'
        ? '/'
        : '';
    const name = `${item.name}${suffix}`;
    if (color === 'never') return name;
    const c = item.type === 'directory' ? '#82aaff' : '#c3e88d';
    return `<span style="color: ${c};">${name}</span>`;
  };

  const entryLineLong = (item: any, parentPath: string) => {
    const perms = (item.type === 'directory' ? 'd' : '-') + item.permissions;
    const size = formatSize(item.size, humanReadable).padStart(6);
    const date = item.modified.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    const time = item.modified.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const inodeStr = showInode ? `${inodeOf(`${parentPath}/${item.name}`)} ` : '';
    return `${inodeStr}${perms} ${item.owner.padEnd(8)} ${item.group.padEnd(8)} ${size} ${date} ${time} ${nameWithClass(item)}`;
  };

  const entryLineShort = (item: any, parentPath: string) => {
    const inodeStr = showInode ? `${inodeOf(`${parentPath}/${item.name}`)} ` : '';
    return `${inodeStr}${nameWithClass(item)}`;
  };

  const mapFsErrorToMessage = (targetInput: string, err: unknown): string => {
    const msg = err instanceof Error ? err.message : String(err);
    const lower = msg.toLowerCase();
    if (lower.includes('permission denied')) return permissionDenied('ls', targetInput);
    // Treat anything else as not found for consistent UX
    return fileNotFound('ls', targetInput);
  };

  const renderList = (items: any[], parentPath: string) => {
    const sorted = applySort(items);
    if (longFormat) return sorted.map((it) => entryLineLong(it, parentPath)).join('<br>');
    const joiner = singleColumn ? '<br>' : '  ';
    return sorted.map((it) => entryLineShort(it, parentPath)).join(joiner);
  };

  const renderTarget = (targetInput: string): string => {
    const targetPath = resolvePath(targetInput, context.env.PWD);
    const normalizedPath = normalizePath(targetPath);
    try {
      const node = fileSystem.getNode(normalizedPath, context.env.USER, group, 'read');
      if (node && (node.type === 'file' || listDirectoriesThemselves)) {
        const parentPath = normalizePath(targetPath + '/..');
        if (longFormat) return entryLineLong(node, parentPath);
        return entryLineShort(node, parentPath);
      }
      const contents = fileSystem.listDirectory(normalizedPath, context.env.USER, group, {
        showHidden,
      });
      if (!recursive) {
        return renderList(contents, normalizedPath);
      }
      const lines: string[] = [];
      lines.push(`${normalizedPath}:`);
      lines.push(renderList(contents, normalizedPath));
      const dirs = applySort(contents.filter((c) => c.type === 'directory'));
      for (const d of dirs) {
        const subPath = `${normalizedPath}/${d.name}`;
        const subRendered = renderTarget(subPath);
        lines.push('');
        lines.push(subRendered.startsWith(subPath) ? subRendered : `${subPath}:\n${subRendered}`);
      }
      return lines.join('<br>');
    } catch (error) {
      return mapFsErrorToMessage(targetInput, error);
    }
  };

  try {
    const outputs: string[] = [];
    for (let idx = 0; idx < targets.length; idx++) {
      const out = renderTarget(targets[idx]);
      if (out.startsWith('ls:')) {
        return writeError(io.stderr, out, ExitCode.GENERAL_ERROR);
      }
      outputs.push(out);
      if (idx < targets.length - 1) outputs.push('');
    }
    io.stdout.write(outputs.join('<br>'));
    return ExitCode.SUCCESS;
  } catch (error) {
    return writeError(
      io.stderr,
      commandError('ls', error instanceof Error ? error.message : 'Unknown error'),
      ExitCode.GENERAL_ERROR,
    );
  }
}

export const lsAsyncCommand = {
  description: 'List directory contents',
  usage: 'ls [-AadFhilrRSt1] [--color[=never|auto|always]] [file|dir]...',
  execute: lsAsync,
};
