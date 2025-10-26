import { CommandContext, user, group } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { FileSystemNode } from '../core/filesystem';
import { parseFlags, FlagDefinition, hasFlag, getFlagValue } from '../utils/flagParser';
import { resolvePath } from '../utils/pathUtils';
import { writeError, commandError } from '../utils/errorMessages';

function human(n: number): string {
  const units = ['B', 'K', 'M', 'G', 'T'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${Math.round(v)}${units[i]}`;
}

const DU_FLAGS: FlagDefinition[] = [
  { short: 'a', long: 'all' },
  { short: 'c', long: 'total' },
  { short: 'd', long: 'max-depth', takesValue: true, type: 'number' },
  { short: 'h', long: 'human-readable' },
  { short: 's', long: 'summarize' },
  { short: 'S', long: 'separate-dirs' },
];

export async function duAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  // Help/version flags
  if (args.includes('--help')) {
    io.stdout.write(duAsyncCommand.usage || duAsyncCommand.description || 'du');
    return 0;
  }
  if (args.includes('--version')) {
    io.stdout.write('du (GNU coreutils simulation) 1.0.0\n');
    return 0;
  }

  const parsed = parseFlags(args, DU_FLAGS);
  const files = [...parsed.positional];
  const allFiles = hasFlag(parsed, 'a') || parsed.flags.get('all') === true;
  const grandTotal = hasFlag(parsed, 'c') || parsed.flags.get('total') === true;
  const maxDepth = getFlagValue<number | null>(parsed, 'max-depth', null);
  const humanReadable = hasFlag(parsed, 'h') || parsed.flags.get('human-readable') === true;
  const summarize = hasFlag(parsed, 's') || parsed.flags.get('summarize') === true;
  const separateDirs = hasFlag(parsed, 'S') || parsed.flags.get('separate-dirs') === true;

  const fs = context.terminal.getFileSystem();
  const operands = files.length ? files : [context.env.PWD];

  try {
    const outputs: { path: string; size: number; label?: string }[] = [];

    const shallowDirSize = (path: string): number => {
      let total = 0;
      let children: FileSystemNode[] = [];
      try {
        children = fs.listDirectory(path, user, group, { showHidden: true });
      } catch {
        return 0;
      }
      for (const ch of children) {
        if (ch.type === 'file') total += ch.size;
      }
      return total;
    };

    const recursiveSize = (path: string): number => {
      try {
        const node = fs.getNode(path, user, group);
        if (!node) return 0;
        if (node.type === 'file') return node.size;
        const children = fs.listDirectory(path, user, group, { showHidden: true });
        let sum = 0;
        for (const ch of children) {
          const childPath = fs.normalizePath(`${path}/${ch.name}`);
          sum += recursiveSize(childPath);
        }
        return sum;
      } catch {
        return 0;
      }
    };

    const listEntry = (absPath: string, depthRel: number, topLabel?: string) => {
      try {
        const node = fs.getNode(absPath, user, group);
        if (!node) return;
        if (node.type === 'file') {
          const size = node.size;
          if (allFiles || depthRel === 0) {
            outputs.push({ path: absPath, size, label: depthRel === 0 ? topLabel : undefined });
          }
          return;
        }

        // directory
        const size = separateDirs ? shallowDirSize(absPath) : recursiveSize(absPath);
        const withinDepth = maxDepth == null || depthRel <= maxDepth;
        if (!summarize && withinDepth) {
          outputs.push({ path: absPath, size, label: depthRel === 0 ? topLabel : undefined });
        }

        if (!summarize && (maxDepth == null || depthRel < maxDepth)) {
          const children = fs.listDirectory(absPath, user, group, { showHidden: true });
          children.sort((a, b) => a.name.localeCompare(b.name));
          for (const ch of children) {
            const childPath = fs.normalizePath(`${absPath}/${ch.name}`);
            listEntry(childPath, depthRel + 1);
          }
        }

        if (summarize && depthRel === 0) {
          outputs.push({ path: absPath, size, label: topLabel });
        }
      } catch {
        // ignore inaccessible paths for now
      }
    };

    for (const input of operands) {
      const absPath = resolvePath(input, context.env.PWD);
      listEntry(absPath, 0, input);
    }

    if (grandTotal) {
      const total = outputs.reduce((acc, o) => acc + o.size, 0);
      outputs.push({ path: 'total', size: total, label: 'total' });
    }

    const fmt = (n: number) => (humanReadable ? human(n) : String(n));

    const lines = outputs.map((o) => `${fmt(o.size)} ${o.label ?? o.path}`);
    io.stdout.write(lines.join('\n'));
    return 0;
  } catch (error) {
    return writeError(
      io.stderr,
      commandError('du', error instanceof Error ? error.message : 'Unknown error'),
      1,
    );
  }
}

export const duAsyncCommand = {
  description: 'Estimate file space usage',
  usage: 'du [-aChsS] [-d N] [FILE]... [--help] [--version]',
  execute: duAsync,
};
