import { CommandContext } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import * as fortuneCookies from 'fortune-cookie';
import { parseFlags, getFlagValue, hasFlag } from '../utils/flagParser';
import { ExitCode } from '../utils/errorMessages';

const cookies: string[] = Array.isArray(fortuneCookies)
  ? fortuneCookies
  : (fortuneCookies as any).default || [];

export async function fortuneAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  // Parse flags with definitions
  const parsed = parseFlags(args, [
    { short: 'a', long: 'all', type: 'boolean' },
    { short: 'c', long: 'context', type: 'boolean' },
    { short: 'f', long: 'files', type: 'boolean' },
    { short: 'l', long: 'long', type: 'boolean' },
    { short: 'm', long: 'match', takesValue: true, type: 'string' },
    { short: 's', long: 'short', type: 'boolean' },
    { short: 'w', long: 'nowrap', type: 'boolean' },
    { long: 'help', type: 'boolean' },
    { long: 'version', type: 'boolean' },
  ]);

  if (hasFlag(parsed, 'help')) {
    io.stdout.write(fortuneAsyncCommand.usage || fortuneAsyncCommand.description || 'fortune');
    return ExitCode.SUCCESS;
  }
  if (hasFlag(parsed, 'version')) {
    io.stdout.write('fortune (simulation) 1.0.0\n');
    return ExitCode.SUCCESS;
  }

  const flagC = hasFlag(parsed, 'c') || hasFlag(parsed, 'context');
  const flagF = hasFlag(parsed, 'f') || hasFlag(parsed, 'files');
  const wantLong: boolean | null =
    hasFlag(parsed, 'l') || hasFlag(parsed, 'long')
      ? true
      : hasFlag(parsed, 's') || hasFlag(parsed, 'short')
        ? false
        : null;
  const pattern: string | null = getFlagValue<string | null>(parsed, 'match', null);

  if (flagF) {
    // Simulate a single database with 100% probability
    io.stdout.write(' 100.0%\tfortune-cookie\n');
    return ExitCode.SUCCESS;
  }

  if (cookies.length === 0) {
    io.stdout.write('<br>Fortune cookies not available');
    return ExitCode.SUCCESS;
  }

  let pool = cookies.slice();

  // Apply pattern match (simple case-insensitive substring)
  if (pattern && pattern.length > 0) {
    const re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const matched = pool.filter((s) => re.test(s));
    if (matched.length > 0) pool = matched;
  }

  // Apply length filter
  const SHORT_LIMIT = 160;
  if (wantLong === true) {
    const longs = pool.filter((s) => s.length >= SHORT_LIMIT);
    if (longs.length > 0) pool = longs; // fallback to pool if none
  } else if (wantLong === false) {
    const shorts = pool.filter((s) => s.length < SHORT_LIMIT);
    if (shorts.length > 0) pool = shorts;
  }

  // Pick one at random
  const randomFortune = pool[Math.floor(Math.random() * pool.length)];
  const prefix = flagC ? '[fortune] ' : '';
  io.stdout.write(`<br>${prefix}${randomFortune}`);
  return ExitCode.SUCCESS;
}

export const fortuneAsyncCommand = {
  description: 'Print a random, hopefully interesting, adage',
  usage: 'fortune [-a] [-c] [-f] [-l] [-m PATTERN] [-s] [-w] [--help] [--version]',
  execute: fortuneAsync,
};
