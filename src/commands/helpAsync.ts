import { CommandContext } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { Shell } from '../core/Shell';
import { parseSimpleFlags } from '../utils/flagParser';
import { writeError, ExitCode } from '../utils/errorMessages';

export async function helpAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  const parsed = parseSimpleFlags(args);

  // Handle help flag
  if (parsed.flags.has('h') || parsed.longFlags.has('help')) {
    io.stdout.write(helpAsyncCommand.usage || helpAsyncCommand.description || 'help');
    return ExitCode.SUCCESS;
  }

  const shell = context.shell as Shell;
  const commands = shell.getCommands();

  // If a command name is provided, show detailed help for that command
  const target = parsed.positional[0];
  if (target) {
    const entry = (commands as any)[target];
    if (!entry) {
      return writeError(io.stderr, `help: no such command: ${target}`, ExitCode.GENERAL_ERROR);
    }

    const nameHtml = `<div style="margin: 10px 0;"><strong style="color:#c3e88d;">${target}</strong></div>`;
    const descHtml = `<div style="margin: 4px 0 8px 0; color:#a0a0a0;">${entry.description || ''}</div>`;
    const usageHtml = `<div><span style="color:#89ddff;">Usage:</span> <code>${entry.usage || target}</code></div>`;

    io.stdout.write(`${nameHtml}${descHtml}${usageHtml}`);
    return ExitCode.SUCCESS;
  }

  // Default: list all commands with descriptions
  io.stdout.write('<div style="margin: 10px 0;">');
  io.stdout.write('<strong style="color: #89ddff;">Available Commands:</strong><br><br>');

  Object.entries(commands).forEach(([name, cmd]: any) => {
    const cmdName = `<span style="color: #c3e88d;">${name}</span>`;
    const description = `<span style="color: #a0a0a0;">${cmd.description}</span>`;
    io.stdout.write(`  ${cmdName.padEnd(20)} ${description}<br>`);
  });

  io.stdout.write('<br>');
  // Execution model section to reflect architecture
  io.stdout.write('<strong style="color: #89ddff;">Execution model:</strong><br>');
  io.stdout.write(
    '  • Built-ins are auto-registered and also mapped under <code>/bin</code> and <code>/usr/bin</code>.<br>',
  );
  io.stdout.write(
    '  • Commands resolve with priority: built-ins, direct path, then <code>PATH</code> search.<br>',
  );
  io.stdout.write(
    '  • Shebang scripts (e.g. <code>#!/bin/sh</code>) are supported via interpreters; shell is simulated line-by-line.<br>',
  );
  io.stdout.write('<br>');

  io.stdout.write('<span style="color: #ffcb6b;">Tips:</span><br>');
  io.stdout.write('  • Use <strong>help COMMAND</strong> for detailed help<br>');
  io.stdout.write('  • Use <strong>Tab</strong> for command completion<br>');
  io.stdout.write('  • Use <strong>↑/↓</strong> arrows to navigate history<br>');
  io.stdout.write('  • Use <strong>Ctrl+L</strong> to clear the screen<br>');
  io.stdout.write('  • Use <strong>Ctrl+C</strong> to cancel running commands<br>');
  io.stdout.write('</div>');

  return ExitCode.SUCCESS;
}

export const helpAsyncCommand = {
  description: 'Display available commands and usage information',
  usage: 'help [COMMAND]\nhelp --help',
  execute: helpAsync,
};
