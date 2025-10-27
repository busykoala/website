import { CommandContext } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { Shell } from '../core/Shell';
import { ExitCode } from '../utils/errorMessages';
import { handleCommonFlags } from '../utils/commandHelpers';

export async function clearAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  const exitCode = handleCommonFlags(args, io, 'clear', clearAsyncCommand.usage || 'clear');
  if (exitCode !== null) return exitCode;

  const shell = context.shell as Shell;
  shell.clear();
  return ExitCode.SUCCESS;
}

export const clearAsyncCommand = {
  description: 'Clear the terminal screen',
  usage: 'clear [-x] [-T TYPE] [--help] [--version]',
  execute: clearAsync,
};
