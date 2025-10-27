import { CommandContext } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { ExitCode } from '../utils/errorMessages';
import { handleCommonFlags } from '../utils/commandHelpers';

export async function hostnameAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  const exitCode = handleCommonFlags(
    args,
    io,
    'hostname',
    hostnameAsyncCommand.usage || 'hostname',
  );
  if (exitCode !== null) return exitCode;

  const hostname = (context.env as any).HOSTNAME || 'busykoala-2';
  io.stdout.write(hostname);
  return ExitCode.SUCCESS;
}

export const hostnameAsyncCommand = {
  description: "Show or set the system's host name",
  usage: 'hostname',
  execute: hostnameAsync,
};
