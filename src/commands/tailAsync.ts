import { CommandContext, user, group } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { resolvePath } from '../utils/pathUtils';
import { ExitCode, commandError, writeError, cannotOpenForReading } from '../utils/errorMessages';
import { validateReadableFile } from '../utils/fileValidation';
import { parseFlags, hasFlag, getFlagValue, FlagDefinition } from '../utils/flagParser';

interface TailOptions {
  lines: number | null; // if positive => last N lines; if negative => last N lines? GNU treats -n -N as "last -N" but we'll clamp
  bytes: number | null; // similar for bytes
  startFromLine: number | null; // +NUM semantics
  startFromByte: number | null; // -c +NUM semantics
  quiet: boolean;
  verbose: boolean;
  follow: boolean;
  followRetry: boolean;
  sleepInterval: number; // seconds
  files: string[];
}

const TAIL_FLAGS: FlagDefinition[] = [
  { short: 'q', long: 'quiet' },
  { long: 'silent' },
  { short: 'v', long: 'verbose' },
  { short: 'f', long: 'follow' },
  { short: 'F', long: 'follow-retry' },
  { short: 's', long: 'sleep-interval', takesValue: true, type: 'number' },
  { short: 'n', long: 'lines', takesValue: true, type: 'number' },
  { short: 'c', long: 'bytes', takesValue: true, type: 'number' },
];

function parseTailOptions(args: string[]): TailOptions {
  const parsed = parseFlags(args, TAIL_FLAGS);

  // base values
  let lines: number | null = getFlagValue<number | null>(parsed, 'lines', null);
  let bytes: number | null = getFlagValue<number | null>(parsed, 'bytes', null);
  const quiet =
    hasFlag(parsed, 'q') ||
    parsed.flags.get('quiet') === true ||
    parsed.flags.get('silent') === true;
  const verbose = hasFlag(parsed, 'v') || parsed.flags.get('verbose') === true;
  const follow = hasFlag(parsed, 'f') || parsed.flags.get('follow') === true;
  const followRetry = hasFlag(parsed, 'F') || parsed.flags.get('follow-retry') === true;
  const sleepInterval = getFlagValue<number>(parsed, 'sleep-interval', 1) ?? 1;

  // Special handling for +NUM with -n / --lines and -c / --bytes
  // Scan original args to see if value was provided with a leading '+'
  let startFromLine: number | null = null;
  let startFromByte: number | null = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-n') {
      const v = args[i + 1];
      if (typeof v === 'string' && /^\+\d+$/.test(v)) {
        startFromLine = parseInt(v.slice(1), 10);
        lines = null; // ignore regular lines when +NUM used
      }
    } else if (a.startsWith('--lines=')) {
      const v = a.split('=')[1] || '';
      if (/^\+\d+$/.test(v)) {
        startFromLine = parseInt(v.slice(1), 10);
        lines = null;
      }
    } else if (a === '-c') {
      const v = args[i + 1];
      if (typeof v === 'string' && /^\+\d+$/.test(v)) {
        startFromByte = parseInt(v.slice(1), 10);
        bytes = null;
      }
    } else if (a.startsWith('--bytes=')) {
      const v = a.split('=')[1] || '';
      if (/^\+\d+$/.test(v)) {
        startFromByte = parseInt(v.slice(1), 10);
        bytes = null;
      }
    }
  }

  // Obsolescent +NUM as first positional => startFromLine
  const files: string[] = [];
  const positionals = [...parsed.positional];
  if (positionals.length > 0 && /^\+\d+$/.test(positionals[0])) {
    startFromLine = parseInt(positionals.shift()!.slice(1), 10);
  }

  // Numeric shorthand -NUM => last NUM lines
  for (const a of args) {
    if (/^-[0-9]+$/.test(a)) {
      lines = parseInt(a.slice(1), 10);
    }
  }

  files.push(...positionals);

  // Default: last 10 lines if neither lines nor bytes nor startFrom provided
  if (lines === null && bytes === null && startFromLine === null && startFromByte === null) {
    lines = 10;
  }

  return {
    lines,
    bytes,
    startFromLine,
    startFromByte,
    quiet,
    verbose,
    follow,
    followRetry,
    sleepInterval,
    files,
  };
}

function tailByLines(
  content: string,
  linesOpt: number | null,
  startFromLine: number | null,
): string {
  let lines = content.split('\n');
  // Drop the trailing empty line if content ends with a newline
  if (content.endsWith('\n') && lines[lines.length - 1] === '') {
    lines = lines.slice(0, -1);
  }
  if (startFromLine !== null && !isNaN(startFromLine)) {
    const startIdx = Math.max(0, startFromLine - 1);
    return lines.slice(startIdx).join('\n');
  }
  const n = linesOpt ?? 10;
  if (n <= 0) return lines.join('\n');
  return lines.slice(-n).join('\n');
}

function tailByBytes(
  content: string,
  bytesOpt: number | null,
  startFromByte: number | null,
): string {
  if (startFromByte !== null && !isNaN(startFromByte)) {
    const startIdx = Math.max(0, startFromByte - 1);
    return content.slice(startIdx);
  }
  const n = bytesOpt ?? 0;
  if (n <= 0) return content; // if 0 or negative, return full content
  return content.slice(-n);
}

export async function tailAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  // Help/version
  if (args.includes('--help') || args.includes('-h')) {
    io.stdout.write(
      tailAsyncCommand.usage || tailAsyncCommand.description || 'tail [-n NUM|-c NUM] [FILE]...',
    );
    return ExitCode.SUCCESS;
  }
  if (args.includes('--version')) {
    io.stdout.write('tail (GNU coreutils simulation) 1.0.0\n');
    return ExitCode.SUCCESS;
  }

  const {
    lines,
    bytes,
    startFromLine,
    startFromByte,
    quiet,
    verbose,
    follow,
    followRetry,
    sleepInterval,
    files,
  } = parseTailOptions(args);

  // If no files given, read from stdin
  const targets = files.length === 0 ? ['-'] : files;

  const fs = context.terminal.getFileSystem();
  const multiple = targets.length > 1;
  const showHeaders = (multiple && !quiet) || verbose;

  try {
    let first = true;
    const previousContent: Record<string, string> = {};

    for (const fileArg of targets) {
      let content = '';
      let displayName = fileArg;

      if (fileArg === '-') {
        content = io.stdin.read();
        displayName = 'standard input';
      } else {
        const res = validateReadableFile('tail', fs, fileArg, context.env.PWD);
        if (res.error) {
          const msg = String(res.error);
          if (msg.includes('No such file or directory')) {
            return writeError(
              io.stderr,
              cannotOpenForReading('tail', fileArg, 'No such file or directory'),
              ExitCode.GENERAL_ERROR,
            );
          }
          if (msg.includes('Permission denied')) {
            return writeError(
              io.stderr,
              cannotOpenForReading('tail', fileArg, 'Permission denied'),
              ExitCode.GENERAL_ERROR,
            );
          }
          return writeError(io.stderr, msg, ExitCode.GENERAL_ERROR);
        }
        content = (res.node as any).content || '';
      }

      let out = '';
      if (bytes !== null || startFromByte !== null) {
        out = tailByBytes(content, bytes, startFromByte);
      } else {
        out = tailByLines(content, lines, startFromLine);
      }

      if (showHeaders) {
        if (!first) io.stdout.write('\n');
        io.stdout.write(`==> ${displayName} <==\n`);
      }
      io.stdout.write(out);
      previousContent[fileArg] = content;

      first = false;
    }

    // Follow mode: poll for appended data and emit new bytes
    if (follow) {
      const maxPoll = parseInt((context.env as any).TAIL_MAX_POLL ?? '-1', 10);
      const useMax = !isNaN(maxPoll) && maxPoll >= 0;
      let polls = 0;

      const sleepMs = Math.max(0, Math.floor(sleepInterval * 1000));
      const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

      while (true) {
        if (io.cancelToken?.isCancelled()) break;
        if (useMax && polls >= maxPoll) break;
        await sleep(sleepMs);
        polls++;
        if (io.cancelToken?.isCancelled()) break;

        for (const fileArg of targets) {
          if (fileArg === '-') continue; // no follow on stdin in this simulation
          const filePath = resolvePath(fileArg, context.env.PWD);
          let node: any = null;
          try {
            node = fs.getNode(filePath, user, group);
          } catch {
            node = null;
          }
          if (!node || node.type !== 'file') continue;
          const newContent = node.content || '';
          const prev = previousContent[fileArg] ?? '';
          if (newContent.length > prev.length) {
            const appended = newContent.slice(prev.length);
            io.stdout.write(appended);
            previousContent[fileArg] = newContent;
          } else if (newContent.length < prev.length && followRetry) {
            // file truncated/rotated; re-output current tail baseline
            previousContent[fileArg] = newContent;
          }
        }
      }
    }

    return ExitCode.SUCCESS;
  } catch (error) {
    return writeError(
      io.stderr,
      commandError('tail', error instanceof Error ? error.message : 'Unknown error'),
      ExitCode.GENERAL_ERROR,
    );
  }
}

export const tailAsyncCommand = {
  description: 'Output the last part of files',
  usage:
    'tail [-n NUM|-c NUM] [-q|-v] [-f|-F] [-s SECONDS] [--pid=PID] [FILE]... (use - for stdin)',
  execute: tailAsync,
};
