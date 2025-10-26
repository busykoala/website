import { CommandContext, user, group, supplementaryGroups } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { parseSimpleFlags } from '../utils/flagParser';
import { ExitCode } from '../utils/errorMessages';

function joinGroups(groups: string[], names: boolean): string {
  // In this simulation, numeric IDs are same as names
  return groups.join(names ? ' ' : ' ');
}

export async function idAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  const parsed = parseSimpleFlags(args);

  // Help/version
  if (parsed.flags.has('h') || parsed.longFlags.has('help')) {
    io.stdout.write(idAsyncCommand.usage || idAsyncCommand.description || 'id');
    return ExitCode.SUCCESS;
  }
  if (parsed.longFlags.has('version')) {
    io.stdout.write('id (GNU coreutils simulation) 1.0.0\n');
    return ExitCode.SUCCESS;
  }

  // Parse flags
  const wantUser = parsed.flags.has('u');
  const wantGroup = parsed.flags.has('g');
  const wantGroups = parsed.flags.has('G');
  const wantNames = parsed.flags.has('n');
  // -r (real) has no effect in this simulation (no effective uid/gid distinction)

  const primaryUser = context.env.USER || user;
  const primaryGroup = group;
  const groupsList = [primaryGroup, ...supplementaryGroups];

  // If selection flags are present, print only those
  if (wantUser || wantGroup || wantGroups) {
    const outs: string[] = [];
    if (wantUser) outs.push(primaryUser);
    if (wantGroup) outs.push(primaryGroup);
    if (wantGroups) outs.push(joinGroups(groupsList, wantNames));
    io.stdout.write(outs.join('\n'));
    return ExitCode.SUCCESS;
  }

  // -a behaves like default verbose in GNU; default formatting shown below
  const uidStr = `uid=${primaryUser}(${primaryUser})`;
  const gidStr = `gid=${primaryGroup}(${primaryGroup})`;
  const groupsStr = `groups=${groupsList.map((g) => `${g}(${g})`).join(',')}`;
  io.stdout.write(`${uidStr} ${gidStr} ${groupsStr}`);
  return ExitCode.SUCCESS;
}

export const idAsyncCommand = {
  description: 'Display user and group identity',
  usage: 'id [-aGru] [-n] [-r] [--help] [--version]',
  execute: idAsync,
};
