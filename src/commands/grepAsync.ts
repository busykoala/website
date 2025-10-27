import { CommandContext } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { parseFlags, FlagDefinition, hasFlag, getFlagValue } from '../utils/flagParser';
import { validateReadableFile } from '../utils/fileValidation';

interface GrepOptions {
  patterns: string[];
  files: string[];
  ignoreCase: boolean;
  invert: boolean;
  count: boolean;
  lineNumber: boolean;
  withFilename: boolean | null; // null => auto: only when multiple files
  quiet: boolean;
  wordRegexp: boolean;
  lineRegexp: boolean;
  maxCount: number | null;
  contextBefore: number;
  contextAfter: number;
  mode: 'regex' | 'fixed';
  listFilesWithMatches: boolean; // -l
  listFilesWithoutMatches: boolean; // -L
  color: boolean;
}

const GREP_FLAGS: FlagDefinition[] = [
  { short: 'i', long: 'ignore-case' },
  { short: 'v', long: 'invert-match' },
  { short: 'c', long: 'count' },
  { short: 'n', long: 'line-number' },
  { short: 'H', long: 'with-filename' },
  { short: 'h', long: 'no-filename' },
  { short: 'q', long: 'quiet' },
  { short: 'w', long: 'word-regexp' },
  { short: 'x', long: 'line-regexp' },
  { short: 'l', long: 'files-with-matches' },
  { short: 'L', long: 'files-without-match' },
  { short: 'm', long: 'max-count', takesValue: true, type: 'number' },
  { short: 'A', long: 'after-context', takesValue: true, type: 'number' },
  { short: 'B', long: 'before-context', takesValue: true, type: 'number' },
  { short: 'C', long: 'context', takesValue: true, type: 'number' },
  { short: 'F', long: 'fixed-strings' },
  { short: 'G', long: 'basic-regexp' },
  { short: 'E', long: 'extended-regexp' },
  { short: 'P', long: 'perl-regexp' },
  { long: 'color', takesValue: true, type: 'string' }, // --color or --color=...
  { short: 'e', long: 'pattern', takesValue: true, type: 'string' }, // collect separately
  { short: 'f', long: 'file', takesValue: true, type: 'string' }, // collect separately
];

function collectMultiArgs(args: string[], short: string, long?: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === `-${short}` || (long && a === `--${long}`)) {
      if (i + 1 < args.length) out.push(args[++i]);
      continue;
    }
    if (a.startsWith(`-${short}`) && a.length > 2) {
      out.push(a.slice(2));
      continue;
    }
    if (long && a.startsWith(`--${long}=`)) {
      out.push(a.split('=')[1] || '');
      continue;
    }
  }
  return out;
}

function parseGrepOptions(args: string[]): GrepOptions {
  const parsed = parseFlags(args, GREP_FLAGS);

  // Base booleans
  const ignoreCase = hasFlag(parsed, 'i') || parsed.flags.get('ignore-case') === true;
  const invert = hasFlag(parsed, 'v') || parsed.flags.get('invert-match') === true;
  const count = hasFlag(parsed, 'c') || parsed.flags.get('count') === true;
  const lineNumber = hasFlag(parsed, 'n') || parsed.flags.get('line-number') === true;

  // Filename behavior
  const withFilename =
    hasFlag(parsed, 'H') || parsed.flags.get('with-filename') === true
      ? true
      : hasFlag(parsed, 'h') || parsed.flags.get('no-filename') === true
        ? false
        : null;

  const quiet = hasFlag(parsed, 'q') || parsed.flags.get('quiet') === true;
  const wordRegexp = hasFlag(parsed, 'w') || parsed.flags.get('word-regexp') === true;
  const lineRegexp = hasFlag(parsed, 'x') || parsed.flags.get('line-regexp') === true;
  const listFilesWithMatches =
    hasFlag(parsed, 'l') || parsed.flags.get('files-with-matches') === true;
  const listFilesWithoutMatches =
    hasFlag(parsed, 'L') || parsed.flags.get('files-without-match') === true;

  // Numeric values
  const maxCount = getFlagValue<number | null>(parsed, 'max-count', null);
  const after = getFlagValue<number | null>(parsed, 'after-context', null) ?? 0;
  const before = getFlagValue<number | null>(parsed, 'before-context', null) ?? 0;
  const contextBoth = getFlagValue<number | null>(parsed, 'context', null);
  let contextAfter = after;
  let contextBefore = before;
  if (contextBoth !== null && contextBoth !== undefined) {
    contextAfter = contextBefore = Math.max(0, contextBoth);
  }

  // Mode
  let mode: 'regex' | 'fixed' =
    hasFlag(parsed, 'F') || parsed.flags.get('fixed-strings') === true ? 'fixed' : 'regex';

  // Color: allow --color or --color=always/aut/never -> treat presence as enabling color
  const colorFlag = parsed.flags.has('color');
  const color = colorFlag ? true : false;

  // Collect -e patterns and -f files (may occur multiple times)
  const multiE = collectMultiArgs(args, 'e', 'pattern');
  const multiF = collectMultiArgs(args, 'f', 'file');

  // Determine patterns and files from positional args following GNU-like rules we already had
  const patterns: string[] = [];
  const files: string[] = [];
  if (multiE.length > 0) patterns.push(...multiE);

  // Remaining positionals: if no -e/-f specified, first positional is pattern, rest are files
  if (multiE.length === 0 && multiF.length === 0) {
    if (parsed.positional.length > 0) {
      patterns.push(parsed.positional[0]);
      files.push(...parsed.positional.slice(1));
    }
  } else {
    files.push(...parsed.positional);
  }

  // Add pattern-files placeholders (handled later)
  for (const f of multiF) files.push(`@patternfile:${f}`);

  return {
    patterns,
    files,
    ignoreCase,
    invert,
    count,
    lineNumber,
    withFilename,
    quiet,
    wordRegexp,
    lineRegexp,
    maxCount,
    contextBefore,
    contextAfter,
    mode,
    listFilesWithMatches,
    listFilesWithoutMatches,
    color,
  };
}

function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildRegexes(
  patterns: string[],
  ignoreCase: boolean,
  fixed: boolean,
  word: boolean,
  line: boolean,
): RegExp[] {
  const flags = ignoreCase ? 'i' : '';
  return patterns.map((p) => {
    let source = fixed ? escapeRegExp(p) : p;
    if (line) {
      source = `^${source}$`;
    } else if (word) {
      source = `\\b${source}\\b`;
    }
    try {
      return new RegExp(source, flags);
    } catch {
      // Fallback to literal if regex invalid
      return new RegExp(escapeRegExp(p), flags);
    }
  });
}

// Returns matcher and optional highlighter
function createMatcher(opts: GrepOptions): {
  match: (s: string) => { matched: boolean; re?: RegExp };
  highlight?: (s: string) => string;
} {
  const regexes = buildRegexes(
    opts.patterns,
    opts.ignoreCase,
    opts.mode === 'fixed',
    opts.wordRegexp,
    opts.lineRegexp,
  );
  const match = (s: string) => {
    for (const re of regexes) {
      if (re.test(s)) return { matched: true, re };
    }
    return { matched: false };
  };
  const highlight = opts.color
    ? (s: string) => {
        for (const re of regexes) {
          if (re.test(s)) {
            return s.replace(re, (m) => `<span class="grep-match">${m}</span>`);
          }
        }
        return s;
      }
    : undefined;
  return { match, highlight };
}

export async function grepAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  // Help/version
  if (args.includes('--help')) {
    io.stdout.write(
      grepAsyncCommand.usage || grepAsyncCommand.description || 'grep [OPTIONS] PATTERN [FILE]...',
    );
    return 0;
  }
  if (args.includes('--version')) {
    io.stdout.write('grep (GNU coreutils simulation) 1.0.0\n');
    return 0;
  }

  const opts = parseGrepOptions(args);

  if (opts.patterns.length === 0 && !opts.files.some((f) => f.startsWith('@patternfile:'))) {
    io.stderr.write('grep: missing pattern');
    return 1;
  }

  const fs = context.terminal.getFileSystem();

  // Load patterns from -f files
  for (const f of opts.files.filter((f) => f.startsWith('@patternfile:'))) {
    const fileArg = f.replace('@patternfile:', '');
    const check = validateReadableFile('grep', fs, fileArg, context.env.PWD);
    if (check.error || !check.node) {
      io.stderr.write(`grep: ${fileArg}: Cannot read pattern file`);
      return 1;
    }
    const patternsFromFile = ((check.node as any).content || '').split('\n').filter(Boolean);
    opts.patterns.push(...patternsFromFile);
  }
  // Keep only real files for searching
  opts.files = opts.files.filter((f) => !f.startsWith('@patternfile:'));

  // If no files given, read from stdin
  const targets = opts.files.length === 0 ? ['-'] : opts.files;
  const multiple = targets.length > 1;
  const showFilename = opts.withFilename === null ? multiple : opts.withFilename;

  let anyMatch = false;

  try {
    const { match, highlight } = createMatcher(opts);

    for (const fileArg of targets) {
      let content = '';
      let displayName = fileArg;
      if (fileArg === '-') {
        content = io.stdin.read();
        displayName = 'standard input';
      } else {
        const check = validateReadableFile('grep', fs, fileArg, context.env.PWD);
        if (check.error || !check.node) {
          const msg = String(check.error || '');
          if (msg.includes('No such file or directory')) {
            io.stderr.write(`grep: ${fileArg}: No such file or directory`);
          } else if (msg.includes('Is a directory')) {
            io.stderr.write(`grep: ${fileArg}: Is a directory`);
          } else if (msg.includes('Permission denied')) {
            io.stderr.write(`grep: ${fileArg}: Permission denied`);
          } else {
            io.stderr.write(`grep: ${fileArg}: Unable to read file`);
          }
          return 1;
        }
        content = (check.node as any).content || '';
      }

      const lines = content.split('\n');
      let matchCount = 0;
      const matchIdx: number[] = [];

      // First pass: find matches / counts
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const res = match(line);
        const selected = opts.invert ? !res.matched : res.matched;
        if (selected) {
          matchCount++;
          matchIdx.push(i);
          anyMatch = true;
          if (opts.maxCount !== null && matchCount >= opts.maxCount) break;
        }
      }

      if (opts.quiet) {
        if (matchCount > 0) return 0;
        // else continue to next file
      }

      if (opts.listFilesWithMatches || opts.listFilesWithoutMatches) {
        const has = matchCount > 0;
        if ((opts.listFilesWithMatches && has) || (opts.listFilesWithoutMatches && !has)) {
          io.stdout.write(displayName + (multiple ? '\n' : ''));
        }
        // proceed to next file
        continue;
      }

      if (opts.count) {
        const prefix = showFilename && fileArg !== '-' ? `${displayName}:` : '';
        io.stdout.write(`${prefix}${matchCount}` + (multiple ? '\n' : ''));
        continue;
      }

      // Build set of line indices to print with context
      const toPrint = new Set<number>();
      for (const idx of matchIdx) {
        const start = Math.max(0, idx - opts.contextBefore);
        const end = Math.min(lines.length - 1, idx + opts.contextAfter);
        for (let j = start; j <= end; j++) toPrint.add(j);
      }

      // If no context requested and no matches, skip output
      if (toPrint.size === 0) {
        // nothing to print for this file
        continue;
      }

      // Print lines in order with optional prefixes
      const sorted = Array.from(toPrint).sort((a, b) => a - b);
      let lastPrinted = -2;
      const partsOut: string[] = [];
      for (const idx of sorted) {
        if (
          idx > lastPrinted + 1 &&
          lastPrinted >= 0 &&
          (opts.contextBefore > 0 || opts.contextAfter > 0)
        ) {
          // group separator like GNU grep
          partsOut.push('--');
        }
        const rawLine = lines[idx];
        const isMatchLine = matchIdx.includes(idx) !== opts.invert; // if invert, context lines are matches and vice versa
        let lineStr = rawLine;
        if (opts.color && isMatchLine && highlight) {
          lineStr = highlight(lineStr);
        }
        const prefixSegs: string[] = [];
        if (showFilename && fileArg !== '-') prefixSegs.push(displayName);
        if (opts.lineNumber) prefixSegs.push(String(idx + 1));
        const prefix = prefixSegs.length ? prefixSegs.join(':') + ':' : '';
        partsOut.push(prefix + lineStr);
        lastPrinted = idx;
      }

      io.stdout.write(partsOut.join('\n'));
      if (multiple) io.stdout.write('\n');
    }

    return anyMatch ? 0 : 1;
  } catch (error) {
    io.stderr.write(`grep: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return 1;
  }
}

export const grepAsyncCommand = {
  description: 'Search for patterns in files',
  usage: 'grep [-inHhcvqwlxAECBm] [-e PATTERN]... [-f FILE] PATTERN [FILE]... (use - for stdin)',
  execute: grepAsync,
};
