import { CommandContext } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { parseSimpleFlags } from '../utils/flagParser';
import { ExitCode } from '../utils/errorMessages';

export async function hostnameAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  const parsed = parseSimpleFlags(args);

  // Help
  if (parsed.flags.has('h') || parsed.longFlags.has('help')) {
    io.stdout.write(hostnameAsyncCommand.usage || hostnameAsyncCommand.description || 'hostname');
    return ExitCode.SUCCESS;
  }

  const hostname = (context.env as any).HOSTNAME || 'busykoala-2';
  io.stdout.write(hostname);
  return ExitCode.SUCCESS;
}

export const hostnameAsyncCommand = {
  description: "Show or set the system's host name",
  usage: 'hostname',
  execute: hostnameAsync,
};
