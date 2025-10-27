import { CommandContext } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { ExitCode } from '../utils/errorMessages';
import {
  parseEscapeSequences,
  expandVariables,
  stripEnclosingQuotes,
} from '../utils/textProcessing';

export async function echoAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  // Parse flags similar to GNU echo: recognize only -n, -e, -E, possibly combined (e.g., -ne)
  // Stop option parsing on the first non-option or invalid option; a lone '-' or '--' are operands.
  let enableEscapes = false;
  let noNewline = false;
  const textArgs: string[] = [];
  let parsingOptions = true;

  for (const arg of args) {
    if (!parsingOptions) {
      textArgs.push(arg);
      continue;
    }

    if (arg === '--help') {
      io.stdout.write(`Usage: echo [SHORT-OPTION]... [STRING]...
  or:  echo LONG-OPTION
Echo the STRING(s) to standard output.

  -n             do not output the trailing newline
  -e             enable interpretation of backslash escapes
  -E             disable interpretation of backslash escapes (default)
      --help     display this help and exit
      --version  output version information and exit

If -e is in effect, the following sequences are recognized:

  \\\\      backslash
  \\a      alert (BEL)
  \\b      backspace
  \\c      produce no further output
  \\e      escape
  \\f      form feed
  \\n      new line
  \\r      carriage return
  \\t      horizontal tab
  \\v      vertical tab
  \\0NNN   byte with octal value NNN (1 to 3 digits)
  \\xHH    byte with hexadecimal value HH (1 to 2 digits)
`);
      return ExitCode.SUCCESS;
    }
    if (arg === '--version') {
      io.stdout.write('echo (GNU coreutils simulation) 1.0.0\n');
      return ExitCode.SUCCESS;
    }

    if (arg === '-' || arg === '--') {
      parsingOptions = false;
      textArgs.push(arg);
      continue;
    }

    if (arg.startsWith('-') && arg.length > 1) {
      // Validate that all option chars are among n, e, E
      const optChars = arg.slice(1);
      if (/^[neE]+$/.test(optChars)) {
        for (const ch of optChars) {
          if (ch === 'n') noNewline = true;
          else if (ch === 'e') enableEscapes = true;
          else if (ch === 'E') enableEscapes = false;
        }
        continue;
      }
      // Invalid option encountered -> stop option parsing and treat as operand
      parsingOptions = false;
      textArgs.push(arg);
      continue;
    }

    // Not an option-like arg
    parsingOptions = false;
    textArgs.push(arg);
  }

  // Process each argument with quote handling and variable expansion
  const processed: string[] = [];
  let stopped = false;
  for (const raw of textArgs) {
    const { text: unquoted, quote } = stripEnclosingQuotes(raw);

    let expanded = unquoted;
    // Variable expansion unless single-quoted
    if (quote !== 'single') {
      expanded = expandVariables(expanded, context.env as any);
    }

    // Escapes only if -e and not single-quoted
    if (enableEscapes && quote !== 'single') {
      const { text, stopped: st } = parseEscapeSequences(expanded);
      processed.push(text);
      if (st) {
        stopped = true;
        break;
      }
    } else {
      processed.push(expanded);
    }
  }

  let output = processed.join(' ');

  if (!noNewline && !stopped) output += '\n';

  io.stdout.write(output);
  return ExitCode.SUCCESS;
}

export const echoAsyncCommand = {
  description: 'Display a line of text',
  usage: 'echo [-neE] [STRING]...',
  execute: echoAsync,
};
