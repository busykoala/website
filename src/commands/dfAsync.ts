import { CommandContext, user, group } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { parseFlags, hasFlag, getFlagValue, FlagDefinition } from '../utils/flagParser';
import { resolvePath as resolvePathUtil } from '../utils/pathUtils';

interface MountEntry {
  fs: string;
  type: string;
  mount: string;
  size: number; // bytes
  used: number; // bytes
  inodes: { total: number; used: number };
}

function human(n: number, si = false): string {
  const base = si ? 1000 : 1024;
  if (n === 0) return '0';
  const units = si ? ['B', 'KB', 'MB', 'GB', 'TB'] : ['B', 'K', 'M', 'G', 'T'];
  let i = 0;
  let v = n;
  while (v >= base && i < units.length - 1) {
    v /= base;
    i++;
  }
  return `${Math.round(v)}${units[i]}`;
}

function percent(num: number, den: number): string {
  if (den <= 0) return '0%';
  return `${Math.floor((num / den) * 100)}%`;
}

// Define supported flags using shared flag parser
const DF_FLAGS: FlagDefinition[] = [
  { short: 'a', long: 'all' },
  { short: 'h', long: 'human-1024' },
  { short: 'H', long: 'human-1000' },
  { short: 'i', long: 'inodes' },
  { short: 'k', long: 'blocks-1k' },
  { short: 'l', long: 'local' },
  { short: 't', long: 'type', takesValue: true, type: 'string' },
  { short: 'T', long: 'print-type' },
];

function pickMounts(
  mounts: MountEntry[],
  opts: {
    files: string[];
    includeAll: boolean;
    localOnly: boolean;
    typeFilter: string | null;
  },
  resolvePath: (p: string) => string | null,
): MountEntry[] {
  let list = mounts;
  if (opts.localOnly) {
    list = list.filter((m) => !['proc', 'devtmpfs', 'tmpfs'].includes(m.type));
  }
  if (!opts.includeAll) {
    // By default, exclude pseudo FS
    list = list.filter((m) => !['proc', 'devtmpfs'].includes(m.type));
  }
  if (opts.typeFilter) {
    list = list.filter((m) => m.type === opts.typeFilter);
  }
  if (opts.files.length > 0) {
    const resolved = opts.files.map((f) => resolvePath(f)).filter((p): p is string => !!p);
    const selected = new Set<MountEntry>();
    for (const p of resolved) {
      let best: MountEntry | null = null;
      for (const m of mounts) {
        const mountPath = m.mount.endsWith('/') ? m.mount : m.mount + '/';
        if (p === m.mount || p.startsWith(mountPath)) {
          if (!best || m.mount.length > best.mount.length) best = m;
        }
      }
      if (best) selected.add(best);
    }
    list = Array.from(selected);
  }
  // Sort by mount path for stable output
  return list.sort((a, b) => a.mount.localeCompare(b.mount));
}

export async function dfAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  // Handle help/version quickly
  if (args.includes('--help')) {
    io.stdout.write(dfAsyncCommand.usage || dfAsyncCommand.description || 'df');
    return 0;
  }
  if (args.includes('--version')) {
    io.stdout.write('df (GNU coreutils simulation) 1.0.0\n');
    return 0;
  }

  // Parse flags using shared utility
  const parsed = parseFlags(args, DF_FLAGS);
  const files = [...parsed.positional];
  const includeAll = hasFlag(parsed, 'a') || parsed.flags.get('all') === true;
  const human1024 = hasFlag(parsed, 'h') || parsed.flags.get('human-1024') === true;
  const human1000 = hasFlag(parsed, 'H') || parsed.flags.get('human-1000') === true;
  const inodes = hasFlag(parsed, 'i') || parsed.flags.get('inodes') === true;
  const blocks1k = hasFlag(parsed, 'k') || parsed.flags.get('blocks-1k') === true;
  const localOnly = hasFlag(parsed, 'l') || parsed.flags.get('local') === true;
  const typeFilter = getFlagValue<string | null>(parsed, 'type', null);
  const showType = hasFlag(parsed, 'T') || parsed.flags.get('print-type') === true;

  // Static mock mounts (unchanged)
  const mounts: MountEntry[] = [
    {
      fs: 'mockfs',
      type: 'ext4',
      mount: '/',
      size: 100 * 1024 * 1024,
      used: 50 * 1024 * 1024,
      inodes: { total: 100000, used: 50000 },
    },
    {
      fs: 'homefs',
      type: 'ext4',
      mount: '/home',
      size: 200 * 1024 * 1024,
      used: 80 * 1024 * 1024,
      inodes: { total: 150000, used: 60000 },
    },
    {
      fs: 'tmpfs',
      type: 'tmpfs',
      mount: '/tmp',
      size: 16 * 1024 * 1024,
      used: 1024 * 1024,
      inodes: { total: 10000, used: 1000 },
    },
    { fs: 'proc', type: 'proc', mount: '/proc', size: 0, used: 0, inodes: { total: 0, used: 0 } },
    {
      fs: 'dev',
      type: 'devtmpfs',
      mount: '/dev',
      size: 8 * 1024 * 1024,
      used: 1024 * 1024,
      inodes: { total: 5000, used: 500 },
    },
  ];

  const fs = context.terminal?.getFileSystem?.();
  const resolvePath = (p: string): string | null => {
    try {
      if (!fs) return null;
      const abs = resolvePathUtil(p.startsWith('/') ? p : `${p}`, context.env.PWD);
      const node = fs.getNode(abs, user, group);
      return node ? abs : null;
    } catch {
      return null;
    }
  };

  const selected = pickMounts(mounts, { files, includeAll, localOnly, typeFilter }, resolvePath);

  // Build output
  let header = 'Filesystem';
  if (showType) header += '     Type';
  if (inodes) {
    header += '     Inodes  IUsed  IFree IUse% Mounted on';
  } else {
    header += '     Size  Used Avail Use% Mounted on';
  }

  const lines: string[] = [header];
  for (const m of selected) {
    if (inodes) {
      const total = m.inodes.total;
      const used = m.inodes.used;
      const free = Math.max(0, total - used);
      let row = `${m.fs}`;
      if (showType) row += `     ${m.type}`;
      row += `     ${total}  ${used}  ${free} ${percent(used, total)} ${m.mount}`;
      lines.push(row);
    } else {
      const totalB = m.size;
      const usedB = m.used;
      const availB = Math.max(0, totalB - usedB);
      const fmt = (n: number) =>
        human1024
          ? human(n, false)
          : human1000
            ? human(n, true)
            : blocks1k
              ? String(Math.round(n / 1024))
              : String(n);
      let row = `${m.fs}`;
      if (showType) row += `     ${m.type}`;
      row += `     ${fmt(totalB)}  ${fmt(usedB)} ${fmt(availB)} ${percent(usedB, totalB)} ${m.mount}`;
      lines.push(row);
    }
  }

  io.stdout.write(lines.join('\n'));
  return 0;
}

export const dfAsyncCommand = {
  description: 'Report file system disk space usage',
  usage: 'df [-aHiKlkT] [-t TYPE] [FILE]... [--help] [--version]',
  execute: dfAsync,
};
