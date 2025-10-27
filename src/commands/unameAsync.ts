import { CommandContext } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { parseSimpleFlags } from '../utils/flagParser';
import { ExitCode } from '../utils/errorMessages';
import { handleCommonFlags } from '../utils/commandHelpers';

export async function unameAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  const exitCode = handleCommonFlags(args, io, 'uname', unameAsyncCommand.usage || 'uname');
  if (exitCode !== null) return exitCode;

  const info = {
    sysname: 'BusykoalaOS',
    nodename: (context.env as any).HOSTNAME || 'busykoala-2',
    rel: '1.0',
    ver: 'Version 1.0',
    machine: 'x42_42',
    processor: 'unknown',
    hardwarePlatform: 'unknown',
    operatingSystem: 'BusykoalaOS',
  } as const;

  const parsed = parseSimpleFlags(args);
  const flags = parsed.flags;
  const showAll = flags.has('a');

  // Default is -s if no specific selection flags provided
  const anySelection = ['s', 'n', 'r', 'v', 'm', 'p', 'i', 'o', 'a'].some((f) => flags.has(f));
  const fieldsOrder: Array<[string, string]> = [
    ['s', info.sysname],
    ['n', info.nodename],
    ['r', info.rel],
    ['v', info.ver],
    ['m', info.machine],
    ['p', info.processor],
    ['i', info.hardwarePlatform],
    ['o', info.operatingSystem],
  ];

  let parts: string[] = [];
  if (showAll) {
    parts = fieldsOrder.map(([, val]) => val);
  } else if (anySelection) {
    for (const [flag, val] of fieldsOrder) {
      if (flags.has(flag)) parts.push(val);
    }
  } else {
    // default sysname
    parts = [info.sysname];
  }

  io.stdout.write(parts.join(' '));
  return ExitCode.SUCCESS;
}

export const unameAsyncCommand = {
  description: 'Print system information',
  usage: 'uname [-asnrvmpio] [--help] [--version]',
  execute: unameAsync,
};
