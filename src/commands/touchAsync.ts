import { CommandContext, user, group } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { FileSystem } from '../core/filesystem';
import { parseFlags, FlagDefinition } from '../utils/flagParser';
import { resolvePath } from '../utils/pathUtils';
import { ExitCode, writeError, commandError } from '../utils/errorMessages';

const flagDefs: FlagDefinition[] = [
  { short: 'a', long: 'access', type: 'boolean', default: false },
  { short: 'm', long: 'modify', type: 'boolean', default: false },
  { short: 'c', long: 'no-create', type: 'boolean', default: false },
  { short: 'd', long: 'date', type: 'string', takesValue: true },
  { short: 't', long: 'time', type: 'string', takesValue: true },
  { short: 'r', long: 'reference', type: 'string', takesValue: true },
];

function parseTimeFromT(spec: string): Date | null {
  // [[CC]YY]MMDDhhmm[.ss]
  if (!spec) return null;
  let main = spec;
  let secStr = '0';
  if (spec.includes('.')) {
    const [m, s] = spec.split('.');
    main = m;
    secStr = s || '0';
  }
  if (!/^\d{10}$/.test(main) && !/^\d{12}$/.test(main)) return null;
  let year: number,
    idx = 0;
  if (main.length === 12) {
    year = parseInt(main.slice(idx, idx + 4), 10);
    idx += 4;
  } else {
    const yy = parseInt(main.slice(idx, idx + 2), 10);
    idx += 2;
    year = yy + 2000; // simple pivot
  }
  const mm = parseInt(main.slice(idx, idx + 2), 10);
  idx += 2;
  const dd = parseInt(main.slice(idx, idx + 2), 10);
  idx += 2;
  const hh = parseInt(main.slice(idx, idx + 2), 10);
  idx += 2;
  const min = parseInt(main.slice(idx, idx + 2), 10);
  const ss = parseInt(secStr, 10) || 0;
  return new Date(year, mm - 1, dd, hh, min, ss);
}

export async function touchAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  // Handle help/version flags
  if (args.includes('--help') || args.includes('-h')) {
    io.stdout.write(
      touchAsyncCommand.usage || touchAsyncCommand.description || 'touch [OPTION]... FILE...',
    );
    return ExitCode.SUCCESS;
  }
  if (args.includes('--version')) {
    io.stdout.write('touch (GNU coreutils simulation) 1.0.0\n');
    return ExitCode.SUCCESS;
  }

  const parsed = parseFlags(args, flagDefs);
  const changeAccessOnly = !!(parsed.flags.get('access') || parsed.flags.get('a'));
  const changeModifyOnly = !!(parsed.flags.get('modify') || parsed.flags.get('m'));
  const noCreate = !!(parsed.flags.get('no-create') || parsed.flags.get('c'));
  const dStr = (parsed.flags.get('date') || parsed.flags.get('d')) as string | undefined;
  const tStr = (parsed.flags.get('time') || parsed.flags.get('t')) as string | undefined;
  const rPath = (parsed.flags.get('reference') || parsed.flags.get('r')) as string | undefined;
  const files = parsed.positional.filter((a) => a !== '--');

  if (files.length === 0) {
    return writeError(io.stderr, 'touch: missing file operand', ExitCode.GENERAL_ERROR);
  }

  const fileSystem = context.terminal.getFileSystem();

  // Determine target timestamp
  let targetTime: Date | null = null;
  if (dStr) {
    const d = new Date(dStr);
    if (!isNaN(d.getTime())) targetTime = d;
    else targetTime = null;
  } else if (tStr) {
    const d = parseTimeFromT(tStr);
    targetTime = d;
  } else if (rPath) {
    const refFull = resolvePath(rPath, context.env.PWD);
    try {
      const refNode = fileSystem.getNode(refFull, user, group) as any;
      if (!refNode) {
        return writeError(
          io.stderr,
          `touch: failed to get attributes of '${rPath}': No such file or directory`,
          ExitCode.GENERAL_ERROR,
        );
      }
      targetTime = new Date(refNode.modified);
    } catch (e) {
      return writeError(
        io.stderr,
        `touch: failed to get attributes of '${rPath}': ${e instanceof Error ? e.message : 'Unknown error'}`,
        ExitCode.GENERAL_ERROR,
      );
    }
  }

  try {
    for (const filename of files) {
      if (filename === '--help' || filename === '--version' || filename === '-h') continue;

      const filePath = resolvePath(filename, context.env.PWD);

      let file: any = null;
      try {
        file = fileSystem.getNode(filePath, user, group);
      } catch {
        file = null;
      }

      const timeToSet = targetTime || new Date();

      if (file) {
        if (file.type !== 'file') {
          return writeError(
            io.stderr,
            `touch: cannot touch '${filename}': Not a file`,
            ExitCode.GENERAL_ERROR,
          );
        }
        if (!FileSystem.hasPermission(file, 'write', user, group)) {
          return writeError(
            io.stderr,
            `touch: cannot touch '${filename}': Permission denied`,
            ExitCode.GENERAL_ERROR,
          );
        }
        // We only have modified time; treat -a/-m the same
        if (changeAccessOnly || changeModifyOnly || (!changeAccessOnly && !changeModifyOnly)) {
          file.modified = new Date(timeToSet);
        }
      } else {
        if (noCreate) {
          // -c: do not create if missing
          continue;
        }
        const parentPath = filePath.substring(0, filePath.lastIndexOf('/')) || '/';
        let parentDir: any = null;
        try {
          parentDir = fileSystem.getNode(parentPath, user, group);
        } catch {
          parentDir = null;
        }
        if (!parentDir || parentDir.type !== 'directory') {
          return writeError(
            io.stderr,
            `touch: cannot touch '${filename}': No such file or directory`,
            ExitCode.GENERAL_ERROR,
          );
        }
        if (!FileSystem.hasPermission(parentDir, 'write', user, group)) {
          return writeError(
            io.stderr,
            `touch: cannot touch '${filename}': Permission denied`,
            ExitCode.GENERAL_ERROR,
          );
        }
        fileSystem.addFile(
          parentPath,
          filePath.split('/').pop()!,
          user,
          group,
          user,
          group,
          '',
          'rw-r--r--',
        );
        try {
          const newNode = fileSystem.getNode(filePath, user, group) as any;
          if (newNode) newNode.modified = new Date(timeToSet);
        } catch {}
      }
    }

    return ExitCode.SUCCESS;
  } catch (error) {
    return writeError(
      io.stderr,
      commandError('touch', error instanceof Error ? error.message : 'Unknown error'),
      ExitCode.GENERAL_ERROR,
    );
  }
}

export const touchAsyncCommand = {
  description: 'Change file timestamps or create empty files',
  usage: 'touch [-acm] [-d DATE|-r FILE|-t STAMP] FILE...',
  execute: touchAsync,
};
