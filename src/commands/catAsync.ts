import { CommandContext } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { parseFlags } from '../utils/flagParser';
import { resolvePath } from '../utils/pathUtils';
import { ExitCode, commandError, writeError } from '../utils/errorMessages';
import { validateReadableFile } from '../utils/fileValidation';

function showNonPrinting(str: string): string {
  // Map control chars (except tab and newline) to caret notation
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    if (ch === 9 /*tab*/ || ch === 10 /*newline*/) {
      out += String.fromCharCode(ch);
    } else if (ch >= 0 && ch < 32) {
      out += '^' + String.fromCharCode(ch + 64);
    } else if (ch === 127) {
      out += '^?';
    } else if (ch > 127) {
      // Represent high-bit set characters as M- notation
      const low = ch & 0x7f;
      if (low >= 0 && low < 32) out += 'M-^' + String.fromCharCode(low + 64);
      else out += 'M-' + String.fromCharCode(low);
    } else {
      out += String.fromCharCode(ch);
    }
  }
  return out;
}

export async function catAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  const parsed = parseFlags(args);

  // Check for help and version before processing flags
  if (args.includes('--help') || args.includes('-h')) {
    io.stdout.write(catAsyncCommand.usage || catAsyncCommand.description || 'cat [FILE]...');
    return ExitCode.SUCCESS;
  }
  if (args.includes('--version')) {
    io.stdout.write('cat (GNU coreutils simulation) 1.0.0\n');
    return ExitCode.SUCCESS;
  }

  // Map long flags to short flags
  if (parsed.flags.has('show-all')) parsed.raw.add('A');
  if (parsed.flags.has('show-ends')) parsed.raw.add('E');
  if (parsed.flags.has('show-tabs')) parsed.raw.add('T');
  if (parsed.flags.has('number')) parsed.raw.add('n');
  if (parsed.flags.has('number-nonblank')) parsed.raw.add('b');
  if (parsed.flags.has('squeeze-blank')) parsed.raw.add('s');

  const fileSystem = context.terminal.getFileSystem();
  const numberAll = parsed.raw.has('n');
  const numberNonBlank = parsed.raw.has('b');
  const squeeze = parsed.raw.has('s');
  const showTabs = parsed.raw.has('t') || parsed.raw.has('T') || parsed.raw.has('A');
  const showNon =
    parsed.raw.has('v') || parsed.raw.has('e') || parsed.raw.has('t') || parsed.raw.has('A');
  const showEnds = parsed.raw.has('e') || parsed.raw.has('E') || parsed.raw.has('A');

  try {
    let outputs: string[] = [];
    const targets = parsed.positional.length === 0 ? ['-'] : parsed.positional;

    for (const filename of targets) {
      if (filename === '-') {
        outputs.push(io.stdin.read());
        continue;
      }

      const fullPath = resolvePath(filename, context.env.PWD);

      // Special device
      if (fullPath === '/dev/null') {
        outputs.push('');
        continue;
      }

      // Use shared file validation helpers for consistent behavior
      const res = validateReadableFile('cat', fileSystem, filename, context.env.PWD);
      if (res.error) {
        return writeError(io.stderr, res.error, ExitCode.GENERAL_ERROR);
      }

      const file = res.node!;
      outputs.push(file.content || '');
    }

    // Join multiple files as if concatenated
    let combined = outputs.join('');

    // Split into lines, preserving trailing empty line when content ends with newline
    const linesAll = combined.split('\n');
    const hasTrailingNewline = combined.endsWith('\n');
    const lines = hasTrailingNewline ? linesAll.slice(0, -1) : linesAll;
    const processed: string[] = [];

    let lineNumber = 1;
    let prevBlank = false;

    for (let idx = 0; idx < lines.length; idx++) {
      let line = lines[idx];
      const isBlank = line === '';

      // Squeeze -s: collapse multiple consecutive blank lines
      if (squeeze && isBlank && prevBlank) {
        prevBlank = true;
        continue;
      }

      prevBlank = isBlank;

      // Handle tabs first if -t/-T/-A
      if (showTabs) {
        line = line.replace(/\t/g, '^I');
      }

      // Handle non-printing (after tabs)
      if (showNon) {
        line = showNonPrinting(line);
      }

      // Handle show ends ($)
      if (showEnds) {
        line = line + '$';
      }

      // Handle numbering: pad numbers to width 6, right-aligned. -b overrides -n
      const formatNumber = (n: number) => n.toString().padStart(6, ' ');

      if (numberNonBlank) {
        if (!isBlank) {
          line = `${formatNumber(lineNumber)}\t${line}`;
          lineNumber++;
        }
      } else if (numberAll) {
        line = `${formatNumber(lineNumber)}\t${line}`;
        lineNumber++;
      }

      processed.push(line);
    }

    let output = processed.join('\n');
    if (hasTrailingNewline) output += '\n';
    io.stdout.write(output);

    return ExitCode.SUCCESS;
  } catch (error) {
    return writeError(
      io.stderr,
      commandError('cat', error instanceof Error ? error.message : 'Unknown error'),
      ExitCode.GENERAL_ERROR,
    );
  }
}

export const catAsyncCommand = {
  description: 'Concatenate and display file contents',
  usage: 'cat [-AbensTv] [file ...] (use -A for -vET)',
  execute: catAsync,
};
