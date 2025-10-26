import { CommandContext } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { parseFlags } from '../utils/flagParser';
import { resolvePath } from '../utils/pathUtils';
import { ExitCode, writeError } from '../utils/errorMessages';

type IsoSpec = 'date' | 'seconds';

function pad(n: number, w = 2) {
  return n.toString().padStart(w, '0');
}
function dayName(i: number) {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i];
}
function monthName(i: number) {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i];
}

function tzOffsetParts(
  date: Date,
  utc: boolean,
): { sign: string; hh: string; mm: string; name: string } {
  if (utc) return { sign: '+', hh: '00', mm: '00', name: 'UTC' };
  const offMin = -date.getTimezoneOffset(); // minutes east of UTC
  const sign = offMin >= 0 ? '+' : '-';
  const abs = Math.abs(offMin);
  const hh = pad(Math.floor(abs / 60));
  const mm = pad(abs % 60);
  const name = 'UTC' + sign + hh + mm;
  return { sign, hh, mm, name };
}

function formatISO8601(date: Date, utc: boolean, spec: IsoSpec): string {
  const Y = utc ? date.getUTCFullYear() : date.getFullYear();
  const M = pad((utc ? date.getUTCMonth() : date.getMonth()) + 1);
  const D = pad(utc ? date.getUTCDate() : date.getDate());
  if (spec === 'date') return `${Y}-${M}-${D}`;
  const h = pad(utc ? date.getUTCHours() : date.getHours());
  const m = pad(utc ? date.getUTCMinutes() : date.getMinutes());
  const s = pad(utc ? date.getUTCSeconds() : date.getSeconds());
  if (utc) return `${Y}-${M}-${D}T${h}:${m}:${s}+00:00`;
  const { sign, hh, mm } = tzOffsetParts(date, false);
  return `${Y}-${M}-${D}T${h}:${m}:${s}${sign}${hh}:${mm}`;
}

function formatRFC2822(date: Date, utc: boolean): string {
  const dow = dayName(utc ? date.getUTCDay() : date.getDay());
  const D = pad(utc ? date.getUTCDate() : date.getDate());
  const mon = monthName(utc ? date.getUTCMonth() : date.getMonth());
  const Y = utc ? date.getUTCFullYear() : date.getFullYear();
  const h = pad(utc ? date.getUTCHours() : date.getHours());
  const m = pad(utc ? date.getUTCMinutes() : date.getMinutes());
  const s = pad(utc ? date.getUTCSeconds() : date.getSeconds());
  const { sign, hh, mm } = tzOffsetParts(date, utc);
  return `${dow}, ${D} ${mon} ${Y} ${h}:${m}:${s} ${sign}${hh}${mm}`;
}

function formatRFC3339(date: Date, utc: boolean): string {
  const Y = utc ? date.getUTCFullYear() : date.getFullYear();
  const M = pad((utc ? date.getUTCMonth() : date.getMonth()) + 1);
  const D = pad(utc ? date.getUTCDate() : date.getDate());
  const h = pad(utc ? date.getUTCHours() : date.getHours());
  const m = pad(utc ? date.getUTCMinutes() : date.getMinutes());
  const s = pad(utc ? date.getUTCSeconds() : date.getSeconds());
  if (utc) return `${Y}-${M}-${D} ${h}:${m}:${s}+00:00`;
  const { sign, hh, mm } = tzOffsetParts(date, false);
  return `${Y}-${M}-${D} ${h}:${m}:${s}${sign}${hh}:${mm}`;
}

function formatCustom(date: Date, fmt: string, utc: boolean): string {
  const rep: Record<string, string> = {
    '%Y': String(utc ? date.getUTCFullYear() : date.getFullYear()),
    '%m': pad((utc ? date.getUTCMonth() : date.getMonth()) + 1),
    '%d': pad(utc ? date.getUTCDate() : date.getDate()),
    '%H': pad(utc ? date.getUTCHours() : date.getHours()),
    '%M': pad(utc ? date.getUTCMinutes() : date.getMinutes()),
    '%S': pad(utc ? date.getUTCSeconds() : date.getSeconds()),
    '%a': dayName(utc ? date.getUTCDay() : date.getDay()),
    '%b': monthName(utc ? date.getUTCMonth() : date.getMonth()),
    '%Z': utc ? 'UTC' : tzOffsetParts(date, false).name,
    '%z': (() => {
      const { sign, hh, mm } = tzOffsetParts(date, utc);
      return `${sign}${hh}${mm}`;
    })(),
    '%%': '%',
  };
  return fmt.replace(/%[YmdHMSabZz%]/g, (m) => rep[m] ?? m);
}

function renderDate(
  d: Date,
  opts: {
    utc: boolean;
    iso8601: IsoSpec | null;
    rfc2822: boolean;
    rfc3339: 'seconds' | null;
    format: string | null;
  },
): string {
  if (opts.iso8601) return formatISO8601(d, opts.utc, opts.iso8601);
  if (opts.rfc2822) return formatRFC2822(d, opts.utc);
  if (opts.rfc3339) return formatRFC3339(d, opts.utc);
  if (opts.format) return formatCustom(d, opts.format, opts.utc);
  return formatRFC2822(d, opts.utc);
}

export async function dateAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  // Help/version
  if (args.includes('--help') || args.includes('-h')) {
    io.stdout.write(dateAsyncCommand.usage || dateAsyncCommand.description || 'date');
    return ExitCode.SUCCESS;
  }
  if (args.includes('--version')) {
    io.stdout.write('date (GNU coreutils simulation) 1.0.0\n');
    return ExitCode.SUCCESS;
  }

  // Use shared flag parser
  const parsed = parseFlags(args, [
    { short: 'u', long: 'utc' },
    { short: 'd', long: 'date', takesValue: true, type: 'string' },
    { short: 'f', long: 'file', takesValue: true, type: 'string' },
    { short: 'r', long: 'reference', takesValue: true, type: 'string' },
    { long: 'iso-8601', takesValue: true, type: 'string' },
    { long: 'rfc-2822' },
    { long: 'rfc-3339', takesValue: true, type: 'string' },
  ]);

  // Extract custom +FORMAT (not a flag)
  const plusArg = args.find((a) => a.startsWith('+'));
  const format = plusArg ? plusArg.slice(1) : undefined;

  const utc = parsed.flags.has('utc');
  const dateStr = parsed.flags.get('date') as string | undefined;
  const listFile = parsed.flags.get('file') as string | undefined;
  const refFile = parsed.flags.get('reference') as string | undefined;
  const isoVal = parsed.flags.get('iso-8601') as string | undefined;
  const rfc2822 = parsed.flags.has('rfc-2822');
  const rfc3339 = parsed.flags.get('rfc-3339') ? ('seconds' as const) : null;

  const fs = context.terminal.getFileSystem();

  try {
    const outputs: string[] = [];
    const formatOpts = {
      utc,
      iso8601: (isoVal ? (isoVal === 'seconds' ? 'seconds' : 'date') : null) as IsoSpec | null,
      rfc2822,
      rfc3339,
      format: format ?? null,
    } as const;

    if (listFile) {
      const listPath = resolvePath(listFile, context.env.PWD);
      let node: any;
      try {
        node = fs.getNode(listPath, context.env.USER, context.env.GROUP || 'busygroup', 'read');
      } catch {
        return writeError(io.stderr, `date: cannot open '${listFile}'`, ExitCode.GENERAL_ERROR);
      }
      if (!node || node.type !== 'file') {
        return writeError(io.stderr, `date: cannot open '${listFile}'`, ExitCode.GENERAL_ERROR);
      }
      const lines = (node.content || '').split(/\r?\n/);
      for (const line of lines) {
        if (!line.trim()) continue;
        const d = new Date(line);
        if (isNaN(d.getTime())) {
          outputs.push('Invalid date');
          continue;
        }
        outputs.push(renderDate(d, formatOpts));
      }
    } else if (refFile) {
      const refPath = resolvePath(refFile, context.env.PWD);
      let node: any;
      try {
        node = fs.getNode(refPath, context.env.USER, context.env.GROUP || 'busygroup');
      } catch {
        return writeError(io.stderr, `date: cannot stat '${refFile}'`, ExitCode.GENERAL_ERROR);
      }
      if (!node) {
        return writeError(io.stderr, `date: cannot stat '${refFile}'`, ExitCode.GENERAL_ERROR);
      }
      const d = new Date(node.modified);
      outputs.push(renderDate(d, formatOpts));
    } else if (dateStr) {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) {
        return writeError(io.stderr, 'date: invalid date', ExitCode.GENERAL_ERROR);
      }
      outputs.push(renderDate(d, formatOpts));
    } else {
      const d = new Date();
      outputs.push(renderDate(d, formatOpts));
    }

    io.stdout.write(outputs.join('\n'));
    return ExitCode.SUCCESS;
  } catch (error) {
    return writeError(
      io.stderr,
      `date: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ExitCode.GENERAL_ERROR,
    );
  }
}

export const dateAsyncCommand = {
  description: 'Display the current date and time',
  usage:
    'date [-u] [-d DATESTR] [-f FILE] [-r FILE] [--iso-8601[=date|seconds]] [--rfc-2822] [--rfc-3339=seconds] [+FORMAT] [--help] [--version]',
  execute: dateAsync,
};
