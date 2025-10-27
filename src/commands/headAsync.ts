import { CommandContext } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { writeError, commandError, cannotOpenForReading } from '../utils/errorMessages';
import { parseFlags, getFlagValue, hasFlag, FlagDefinition } from '../utils/flagParser';
import { validateReadableFile } from '../utils/fileValidation';

interface HeadOptions {
  lines: number | null;
  bytes: number | null;
  quiet: boolean;
  verbose: boolean;
  files: string[];
}

const HEAD_FLAGS: FlagDefinition[] = [
  { short: 'q', long: 'quiet' },
  { short: 'v', long: 'verbose' },
  { short: 'n', long: 'lines', takesValue: true, type: 'number' },
  { short: 'c', long: 'bytes', takesValue: true, type: 'number' },
];

function parseHeadOptions(args: string[]): HeadOptions {
  const parsed = parseFlags(args, HEAD_FLAGS);

  // Base values from flags
  let lines = getFlagValue<number | null>(parsed, 'lines', null);
  const bytes = getFlagValue<number | null>(parsed, 'bytes', null);
  const quiet = hasFlag(parsed, 'q') || parsed.flags.get('quiet') === true;
  const verbose = hasFlag(parsed, 'v') || parsed.flags.get('verbose') === true;

  // If -n was present but value not parsed (e.g., next token starts with '-') normalize to null so we can pick up shorthand
  if (typeof lines !== 'number') {
    lines = null;
  }

  // Support numeric shorthand like -5 (sets lines). Also allow -n -5 form via the normalization above.
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (/^-[0-9]+$/.test(a)) {
      const prevIsDashN = i > 0 && args[i - 1] === '-n';
      const n = prevIsDashN ? parseInt(a, 10) : parseInt(a.slice(1), 10);
      if (!Number.isNaN(n) && lines === null) {
        lines = n;
      }
    }
  }

  // Determine files: start with positionals from parser
  const files: string[] = [...parsed.positional];

  // Treat unknown short flags (e.g., -z) as filenames to match prior behavior
  const knownShort = new Set(['q', 'v', 'n', 'c', 'h']); // h only for help handling elsewhere
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a || a === '--') break;
    if (a === '-') {
      continue;
    } // explicit stdin already captured when positional
    if (a === '-n' || a === '-c') {
      i++;
      continue;
    }
    if (/^--(quiet|verbose|bytes=|help|version|lines=)/.test(a)) continue;
    if (a.startsWith('--')) continue;
    if (a.startsWith('-')) {
      if (/^-[0-9]+$/.test(a)) continue; // numeric shorthand handled above
      if (a.length === 2 && knownShort.has(a[1]!)) continue; // known short flag without value
      // Unknown -> treat as filename
      files.push(a);
    }
  }

  return { lines, bytes, quiet, verbose, files };
}

function splitContentLines(content: string): string[] {
  // Avoid trailing empty due to ending newline so negative -n drops last logical lines
  if (content.endsWith('\n')) {
    const trimmed = content.replace(/\n+$/, '');
    return trimmed.length ? trimmed.split('\n') : [];
  }
  return content.split('\n');
}

function headByLines(content: string, n: number): string {
  const lines = splitContentLines(content);
  // negative n => all but last |n| lines
  if (n < 0) {
    const keep = Math.max(0, lines.length + n);
    return lines.slice(0, keep).join('\n');
  }
  return lines.slice(0, n).join('\n');
}

function headByBytes(content: string, n: number): string {
  // Treat JS string length as bytes for simplicity
  if (n < 0) {
    const keep = Math.max(0, content.length + n);
    return content.slice(0, keep);
  }
  return content.slice(0, n);
}

export async function headAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  // Handle help/version flags
  if (args.includes('--help') || args.includes('-h')) {
    io.stdout.write(
      headAsyncCommand.usage || headAsyncCommand.description || 'head [-n NUM|-c NUM] [FILE]...',
    );
    return 0;
  }
  if (args.includes('--version')) {
    io.stdout.write('head (GNU coreutils simulation) 1.0.0\n');
    return 0;
  }

  const { lines, bytes, quiet, verbose, files } = parseHeadOptions(args);

  // Use stdin when no files provided
  const targets = files.length === 0 ? ['-'] : files;

  const fs = context.terminal.getFileSystem();
  const multiple = targets.length > 1;
  const showHeaders = (multiple && !quiet) || verbose;

  try {
    let first = true;

    for (const fileArg of targets) {
      let content = '';
      let displayName = fileArg;

      if (fileArg === '-') {
        content = io.stdin.read();
        displayName = 'standard input';
      } else {
        // Use validation helpers and standard errors
        const res = validateReadableFile('head', fs, fileArg, context.env.PWD);
        if (res.error) {
          const msg = String(res.error);
          if (msg.includes('No such file or directory')) {
            return writeError(
              io.stderr,
              cannotOpenForReading('head', fileArg, 'No such file or directory'),
              1,
            );
          }
          if (msg.includes('Permission denied')) {
            return writeError(
              io.stderr,
              cannotOpenForReading('head', fileArg, 'Permission denied'),
              1,
            );
          }
          return writeError(io.stderr, msg, 1);
        }
        content = (res.node as any).content || '';
      }

      let out = '';
      if (bytes !== null) {
        out = headByBytes(content, bytes);
      } else {
        const n = lines ?? 10;
        out = headByLines(content, n);
      }

      if (showHeaders) {
        if (!first) io.stdout.write('\n');
        io.stdout.write(`==> ${displayName} <==\n`);
      }
      io.stdout.write(out);

      first = false;
    }

    return 0;
  } catch (error) {
    return writeError(
      io.stderr,
      commandError('head', error instanceof Error ? error.message : 'Unknown error'),
      1,
    );
  }
}

export const headAsyncCommand = {
  description: 'Output the first part of files',
  usage: 'head [-n NUM|-c NUM] [-q|-v] [FILE]... (use - for stdin) ',
  execute: headAsync,
};
