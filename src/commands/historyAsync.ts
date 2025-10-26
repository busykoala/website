import { CommandContext } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { parseSimpleFlags } from '../utils/flagParser';
import { writeError, ExitCode } from '../utils/errorMessages';
import { resolvePath } from '../utils/pathUtils';

function getHistFile(context: CommandContext): string {
  const env = context.env as any;
  const home = env.HOME || '/home/busykoala';
  return env.HISTFILE || `${home}/.bash_history`;
}

export async function historyAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  const parsed = parseSimpleFlags(args);

  // Handle help flag
  if (parsed.flags.has('h') || parsed.longFlags.has('help')) {
    io.stdout.write(historyAsyncCommand.usage || historyAsyncCommand.description || 'history');
    return ExitCode.SUCCESS;
  }

  // Parse flags: -c, -d N, -w, -a, -r, -n, -p
  let flagClear = parsed.flags.has('c');
  let flagWrite = parsed.flags.has('w');
  let flagAppend = parsed.flags.has('a');
  let flagRead = parsed.flags.has('r');
  let flagReadNew = parsed.flags.has('n');
  let flagPrintArgs = parsed.flags.has('p');
  let deleteIndex: number | null = null;
  const positional: string[] = [...parsed.positional];

  // Extract -d value if present in raw args order to preserve error semantics
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-d') {
      const n = args[i + 1];
      if (!n || isNaN(Number(n))) {
        return writeError(
          io.stderr,
          'history: -d requires a numeric offset',
          ExitCode.GENERAL_ERROR,
        );
      }
      deleteIndex = Number(n);
      break;
    }
  }

  // -p: print arguments (no history modification)
  if (flagPrintArgs) {
    if (positional.length) {
      io.stdout.write(positional.join('<br>'));
    }
    return ExitCode.SUCCESS;
  }

  const hist = context.history;

  // -c: clear history
  if (flagClear) {
    context.history.splice(0, context.history.length);
    // Reset read/write indices
    (context.env as any).__HISTAPPEND_INDEX = 0;
    (context.env as any).__HISTREAD_LINES = 0;
    // If only -c was provided, return
    if (
      !flagWrite &&
      !flagAppend &&
      !flagRead &&
      !flagReadNew &&
      deleteIndex === null &&
      positional.length === 0
    ) {
      return ExitCode.SUCCESS;
    }
  }

  // -d N: delete entry at 1-based position N
  if (deleteIndex !== null) {
    const idx = deleteIndex - 1;
    if (idx < 0 || idx >= hist.length) {
      return writeError(io.stderr, 'history: position out of range', ExitCode.GENERAL_ERROR);
    }
    hist.splice(idx, 1);
  }

  // File operations require a filesystem
  const fs = context.terminal?.getFileSystem?.();
  const histPath = resolvePath(getHistFile(context), context.env.PWD);

  // Helper to ensure parent exists; addBaseFilesystem created HOME
  const ensureFileWrite = (content: string, append: boolean) => {
    const parent = histPath.substring(0, histPath.lastIndexOf('/')) || '/';
    const name = histPath.substring(histPath.lastIndexOf('/') + 1);
    fs.addFile(
      parent,
      name,
      context.env.USER,
      'busygroup',
      context.env.USER,
      'busygroup',
      content,
      'rw-r--r--',
      append,
    );
  };

  // -w: write current history to HISTFILE (overwrite)
  if (flagWrite) {
    if (!fs) {
      return writeError(io.stderr, 'history: filesystem unavailable', ExitCode.GENERAL_ERROR);
    }
    const content = hist.join('\n');
    try {
      ensureFileWrite(content, false);
    } catch (e) {
      return writeError(
        io.stderr,
        `history: cannot write: ${(e as Error).message}`,
        ExitCode.GENERAL_ERROR,
      );
    }
    (context.env as any).__HISTAPPEND_INDEX = hist.length;
  }

  // -a: append new lines (since last write/append) to HISTFILE
  if (flagAppend) {
    if (!fs) {
      return writeError(io.stderr, 'history: filesystem unavailable', ExitCode.GENERAL_ERROR);
    }
    const start = Number((context.env as any).__HISTAPPEND_INDEX) || 0;
    const lines = hist.slice(start);
    if (lines.length) {
      const content = (start > 0 ? '\n' : '') + lines.join('\n');
      try {
        ensureFileWrite(content, true);
      } catch (e) {
        return writeError(
          io.stderr,
          `history: cannot append: ${(e as Error).message}`,
          ExitCode.GENERAL_ERROR,
        );
      }
      (context.env as any).__HISTAPPEND_INDEX = hist.length;
    }
  }

  // -r/-n: read history file and append to in-memory history
  if (flagRead || flagReadNew) {
    if (!fs) {
      return writeError(io.stderr, 'history: filesystem unavailable', ExitCode.GENERAL_ERROR);
    }
    try {
      const node = fs.getNode(histPath, context.env.USER, 'busygroup', 'read');
      if (node && node.type === 'file') {
        const fileLines = (node.content || '').split(/\r?\n/).filter((l) => l.length > 0);
        let start = 0;
        if (flagReadNew) {
          start = Number((context.env as any).__HISTREAD_LINES) || 0;
        }
        const toAdd = fileLines.slice(start);
        if (toAdd.length) {
          context.history.push(...toAdd);
          (context.env as any).__HISTREAD_LINES = start + toAdd.length;
        }
      }
    } catch {
      // If file missing, no-op
    }
  }

  // If no flags affecting output were used and no file ops occurred, default: print history
  if (
    !flagWrite &&
    !flagAppend &&
    !flagRead &&
    !flagReadNew &&
    deleteIndex === null &&
    !flagClear
  ) {
    if (hist.length === 0) {
      io.stdout.write('No commands in history.');
      return ExitCode.SUCCESS;
    }
    const formatted = hist.map((command, index) => `${index + 1} ${command}`).join('<br>');
    io.stdout.write(formatted);
  }

  return ExitCode.SUCCESS;
}

export const historyAsyncCommand = {
  description: 'Display or manipulate the history list',
  usage: 'history [-c] [-d offset] [-w] [-a] [-r] [-n] [-p arg ...]',
  execute: historyAsync,
};
