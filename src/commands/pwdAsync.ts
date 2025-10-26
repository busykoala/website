import { CommandContext } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { parseFlags } from '../utils/flagParser';
import { ExitCode } from '../utils/errorMessages';
import { normalizePath } from '../utils/pathUtils';

export async function pwdAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  if (args.includes('--help') || args.includes('-h')) {
    io.stdout.write(pwdAsyncCommand.usage || pwdAsyncCommand.description || 'pwd');
    return ExitCode.SUCCESS;
  }
  if (args.includes('--version')) {
    io.stdout.write('pwd (GNU coreutils simulation) 1.0.0\n');
    return ExitCode.SUCCESS;
  }

  const parsed = parseFlags(args);
  const mode: 'L' | 'P' = parsed.raw.has('P') ? 'P' : 'L';

  const logical = context.env.PWD || '/';
  const physical = normalizePath(logical);

  io.stdout.write(mode === 'P' ? physical : logical);
  return ExitCode.SUCCESS;
}

export const pwdAsyncCommand = {
  description: 'Print working directory',
  usage: 'pwd [-LP]',
  execute: pwdAsync,
};
