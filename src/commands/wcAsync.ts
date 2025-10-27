import { CommandContext } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { parseSimpleFlags } from '../utils/flagParser';
import { validateReadableFile } from '../utils/fileValidation';
import { writeError, ExitCode } from '../utils/errorMessages';

interface WCOptions {
  countBytes: boolean;
  countChars: boolean;
  countLines: boolean;
  countWords: boolean;
  maxLineLength: boolean;
  files: string[];
}

function parseWcOptions(args: string[]): WCOptions {
  const parsed = parseSimpleFlags(args);
  const flags = parsed.flags;
  let countBytes = flags.has('c');
  let countChars = flags.has('m');
  let countLines = flags.has('l');
  let countWords = flags.has('w');
  let maxLineLength = flags.has('L');

  const any = countBytes || countChars || countLines || countWords || maxLineLength;
  if (!any) {
    // default -lwc
    countLines = true;
    countWords = true;
    countBytes = true;
  }

  return {
    countBytes,
    countChars,
    countLines,
    countWords,
    maxLineLength,
    files: [...parsed.positional],
  };
}

function computeCounts(content: string) {
  const linesArr = content.length ? content.split('\n') : [''];
  const lines = content === '' ? 0 : linesArr.length - (content.endsWith('\n') ? 1 : 0);
  const words = content.trim() ? content.split(/\s+/).filter(Boolean).length : 0;
  const bytes = content.length; // JS string length as bytes approximation
  const chars = Array.from(content).length; // unicode-aware char count
  let maxLen = 0;
  for (const ln of content.split('\n')) maxLen = Math.max(maxLen, ln.length);
  return { lines, words, bytes, chars, maxLen };
}

export async function wcAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  // Handle help/version flags
  if (args.includes('--help') || args.includes('-h')) {
    io.stdout.write(
      wcAsyncCommand.usage || wcAsyncCommand.description || 'wc [OPTION]... [FILE]...',
    );
    return ExitCode.SUCCESS;
  }
  if (args.includes('--version')) {
    io.stdout.write('wc (GNU coreutils simulation) 1.0.0\n');
    return ExitCode.SUCCESS;
  }

  const opts = parseWcOptions(args);

  if (opts.files.length === 0) {
    return writeError(io.stderr, 'wc: missing file operand', ExitCode.GENERAL_ERROR);
  }

  const fs = context.terminal.getFileSystem();
  const multiple = opts.files.length > 1;

  try {
    let total = { lines: 0, words: 0, bytes: 0, chars: 0, maxLen: 0 };

    for (const fileArg of opts.files) {
      let content = '';
      let displayName = fileArg;

      if (fileArg === '-') {
        content = io.stdin.read();
        displayName = '-';
      } else {
        const check = validateReadableFile('wc', fs, fileArg, context.env.PWD);
        if (check.error || !check.node) {
          // Map errors to legacy simple format for wc
          const msg = String(check.error || '');
          if (msg.includes('No such file or directory')) {
            return writeError(
              io.stderr,
              `wc: ${fileArg}: No such file or directory`,
              ExitCode.GENERAL_ERROR,
            );
          }
          if (msg.includes('Is a directory')) {
            return writeError(io.stderr, `wc: ${fileArg}: Is a directory`, ExitCode.GENERAL_ERROR);
          }
          if (msg.includes('Permission denied')) {
            return writeError(
              io.stderr,
              `wc: ${fileArg}: Permission denied`,
              ExitCode.GENERAL_ERROR,
            );
          }
          return writeError(io.stderr, `wc: ${fileArg}: Unable to read`, ExitCode.GENERAL_ERROR);
        }
        content = (check.node as any).content || '';
      }

      const { lines, words, bytes, chars, maxLen } = computeCounts(content);
      total.lines += lines;
      total.words += words;
      total.bytes += bytes;
      total.chars += chars;
      total.maxLen = Math.max(total.maxLen, maxLen);

      const fields: string[] = [];
      if (opts.countLines) fields.push(String(lines));
      if (opts.countWords) fields.push(String(words));
      if (opts.countBytes) fields.push(String(bytes));
      if (opts.countChars) fields.push(String(chars));
      if (opts.maxLineLength) fields.push(String(maxLen));

      // Always include display name (including '-') to match tests
      fields.push(displayName);
      io.stdout.write(fields.join(' ') + (multiple ? '\n' : ''));
    }

    if (multiple) {
      const fields: string[] = [];
      if (opts.countLines) fields.push(String(total.lines));
      if (opts.countWords) fields.push(String(total.words));
      if (opts.countBytes) fields.push(String(total.bytes));
      if (opts.countChars) fields.push(String(total.chars));
      if (opts.maxLineLength) fields.push(String(total.maxLen));
      fields.push('total');
      io.stdout.write(fields.join(' '));
    }

    return ExitCode.SUCCESS;
  } catch (error) {
    return writeError(
      io.stderr,
      `wc: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ExitCode.GENERAL_ERROR,
    );
  }
}

export const wcAsyncCommand = {
  description: 'Print newline, word, and byte counts for files',
  usage: 'wc [-cmlwL] [FILE]... (use - for stdin)',
  execute: wcAsync,
};
