import type { CommandContext } from '../TerminalCore';
import type { IOStreams } from '../streams';
import { FileSystem } from '../filesystem';
import { user, group } from '../TerminalCore';
import { ExitCode } from '../../utils/errorMessages';

export async function nodeInterpreter(
  scriptPath: string,
  args: string[],
  context: CommandContext,
  io: IOStreams,
  fs: FileSystem,
): Promise<number> {
  try {
    const node = fs.getNode(scriptPath, user, group, 'read');
    if (!node || node.type !== 'file') {
      io.stderr.write(`node: ${scriptPath}: No such file or directory\n`);
      return ExitCode.GENERAL_ERROR;
    }

    const content = node.content || '';
    const code = content.startsWith('#!') ? content.substring(content.indexOf('\n') + 1) : content;

    try {
      const sandbox = {
        console: {
          log: (...a: any[]) => io.stdout.write(a.join(' ') + '\n'),
          error: (...a: any[]) => io.stderr.write(a.join(' ') + '\n'),
          warn: (...a: any[]) => io.stderr.write(a.join(' ') + '\n'),
        },
        process: {
          argv: ['/usr/bin/node', scriptPath, ...args],
          env: { ...context.env },
          exit: (code: number = 0) => {
            throw new Error(`EXIT:${code}`);
          },
        },
      } as any;

      const func = new Function(...Object.keys(sandbox), code);
      func(...Object.values(sandbox));
      return ExitCode.SUCCESS;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('EXIT:')) {
        const code = parseInt(error.message.substring(5));
        return Number.isNaN(code) ? ExitCode.GENERAL_ERROR : code;
      }
      io.stderr.write(`node: ${String(error)}\n`);
      return ExitCode.GENERAL_ERROR;
    }
  } catch {
    io.stderr.write(`node: ${scriptPath}: No such file or directory\n`);
    return ExitCode.GENERAL_ERROR;
  }
}
