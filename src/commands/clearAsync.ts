import { CommandContext } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { Shell } from '../core/Shell';
import { ExitCode } from '../utils/errorMessages';

export async function clearAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  if (args.includes('--help') || args.includes('-h')) {
    io.stdout.write(clearAsyncCommand.usage || clearAsyncCommand.description || 'clear');
    return ExitCode.SUCCESS;
  }
  if (args.includes('--version')) {
    io.stdout.write('clear (GNU coreutils simulation) 1.0.0\n');
    return ExitCode.SUCCESS;
  }

  const shell = context.shell as Shell;
  shell.clear();
  return ExitCode.SUCCESS;
}

export const clearAsyncCommand = {
  description: 'Clear the terminal screen',
  usage: 'clear [-x] [-T TYPE] [--help] [--version]',
  execute: clearAsync,
};
