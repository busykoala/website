import { CommandContext } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { ExitCode } from '../utils/errorMessages';
import { parseSimpleFlags } from '../utils/flagParser';

export async function whoamiAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  const parsed = parseSimpleFlags(args);
  if (parsed.flags.has('h') || parsed.longFlags.has('help')) {
    io.stdout.write(whoamiAsyncCommand.usage || whoamiAsyncCommand.description || 'whoami');
    return ExitCode.SUCCESS;
  }
  if (parsed.longFlags.has('version')) {
    io.stdout.write('whoami (GNU coreutils simulation) 1.0.0\n');
    return ExitCode.SUCCESS;
  }

  io.stdout.write(context.env.USER);
  return ExitCode.SUCCESS;
}

export const whoamiAsyncCommand = {
  description: 'Print effective user name',
  usage: 'whoami [--help] [--version]',
  execute: whoamiAsync,
};
