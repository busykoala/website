import { CommandContext } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { parseFlags } from '../utils/flagParser';
import { ExitCode, writeError } from '../utils/errorMessages';

function splitTextIntoLines(text: string, maxLength = 34): string[] {
  const words = text.split(' ').filter(Boolean);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    if (line.length === 0) {
      line = word;
      continue;
    }
    if (line.length + 1 + word.length > maxLength) {
      lines.push(line);
      line = word;
    } else {
      line += ` ${word}`;
    }
  }

  if (line.length) lines.push(line);
  return lines.length ? lines : [''];
}

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/ /g, '&nbsp;');
}

function renderBubble(lines: string[]): string {
  const maxLen = lines.reduce((m, s) => Math.max(m, s.length), 0);
  let out = `&nbsp;${'-'.repeat(maxLen + 2)}<br>`;
  if (lines.length === 1) {
    const pad = ' '.repeat(maxLen - lines[0].length);
    out += `&nbsp;< ${lines[0]}${pad} &nbsp;><br>`;
  } else {
    lines.forEach((line, i) => {
      const padding = ' '.repeat(maxLen - line.length);
      if (i === 0) out += `&nbsp;/ ${line}${padding} \\<br>`;
      else if (i === lines.length - 1) out += `&nbsp;\\ ${line}${padding} /<br>`;
      else out += `&nbsp;| ${line}${padding} |<br>`;
    });
  }
  out += `&nbsp;${'-'.repeat(maxLen + 2)}<br>`;
  return out;
}

function renderCowDefault(eyes: string, tongue: string): string {
  const eyes2 = (eyes || 'oo').slice(0, 2).padEnd(2, 'o');
  const tongue2 = (tongue || '  ').slice(0, 2).padEnd(2, ' ');
  const tongueHtml = htmlEscape(tongue2);
  let out = '';
  out += `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\\&nbsp;&nbsp;^__^<br>`;
  out += `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\\&nbsp;&nbsp;(${eyes2})\\_______<br>`;
  out += `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(__)\\&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)\\/\\<br>`;
  out += `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;||----${tongueHtml}|<br>`;
  out += `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;||&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;||<br>`;
  return out;
}

function renderCowTux(): string {
  let out = '';
  out += `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\\&nbsp;&nbsp;.___.<br>`;
  out += `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\\&nbsp;(o&nbsp;o)<br>`;
  out += `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\&nbsp;&nbsp;\_/&nbsp;<br>`;
  out += `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;__/&nbsp;&nbsp;\\__<br>`;
  out += `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(/&nbsp;_/\\_&nbsp;\\)<br>`;
  return out;
}

export async function cowsayAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  // Help/version
  if (args.includes('--help') || args.includes('-h')) {
    io.stdout.write(
      cowsayAsyncCommand.usage || cowsayAsyncCommand.description || 'cowsay [MESSAGE]',
    );
    return ExitCode.SUCCESS;
  }
  if (args.includes('--version')) {
    io.stdout.write('cowsay (simulation) 1.0.0\n');
    return ExitCode.SUCCESS;
  }

  // Parse flags using shared parser
  const parsed = parseFlags(args, [
    { short: 'f', long: 'file', takesValue: true, type: 'string' },
    { short: 'e', long: 'eyes', takesValue: true, type: 'string', default: 'oo' },
    { short: 'T', long: 'tongue', takesValue: true, type: 'string', default: '  ' },
    { short: 'W', long: 'width', takesValue: true, type: 'number', default: 34 },
  ]);

  const cowfile = (parsed.flags.get('file') as string | undefined) ?? null;
  const eyes = (parsed.flags.get('eyes') as string | undefined) ?? 'oo';
  const tongue = (parsed.flags.get('tongue') as string | undefined) ?? '  ';
  const widthRaw = parsed.flags.get('width');
  const width = Math.min(80, Math.max(5, Number(widthRaw ?? 34)));

  // Build message from positional (ignoring flags)
  const messageParts = parsed.positional.filter((p) => p !== '--');
  const textRaw = messageParts.join(' ').trim().replace('<br>', '');
  if (!textRaw) {
    return writeError(io.stderr, 'cowsay: No message provided', ExitCode.GENERAL_ERROR);
  }

  const lines = splitTextIntoLines(textRaw, width);
  let out = renderBubble(lines);

  // Render cow variant
  const variant = (cowfile || 'default').toLowerCase();
  if (variant === 'default' || variant === 'cow' || !cowfile) {
    out += renderCowDefault(eyes, tongue);
  } else if (variant === 'tux' || variant === 'penguin') {
    out += renderCowTux();
  } else {
    return writeError(io.stderr, `cowsay: unknown cowfile '${cowfile}'`, ExitCode.GENERAL_ERROR);
  }

  io.stdout.write(out);
  return ExitCode.SUCCESS;
}

export const cowsayAsyncCommand = {
  description: 'Configurable speaking/thinking cow',
  usage: 'cowsay [-f cowfile] [-e EYES] [-T TONGUE] [-W COL] [MESSAGE]',
  execute: cowsayAsync,
};
