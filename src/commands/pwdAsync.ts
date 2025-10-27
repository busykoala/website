import { CommandContext } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { parseFlags } from '../utils/flagParser';
import { ExitCode } from '../utils/errorMessages';
import { normalizePath } from '../utils/pathUtils';
import { handleCommonFlags } from '../utils/commandHelpers';

export async function pwdAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  const exitCode = handleCommonFlags(args, io, 'pwd', pwdAsyncCommand.usage || 'pwd');
  if (exitCode !== null) return exitCode;

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
