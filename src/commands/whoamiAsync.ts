import { CommandContext } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { ExitCode } from '../utils/errorMessages';
import { handleCommonFlags } from '../utils/commandHelpers';

export async function whoamiAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  const exitCode = handleCommonFlags(args, io, 'whoami', whoamiAsyncCommand.usage || 'whoami');
  if (exitCode !== null) return exitCode;

  io.stdout.write(context.env.USER);
  return ExitCode.SUCCESS;
}

export const whoamiAsyncCommand = {
  description: 'Print effective user name',
  usage: 'whoami [--help] [--version]',
  execute: whoamiAsync,
};
