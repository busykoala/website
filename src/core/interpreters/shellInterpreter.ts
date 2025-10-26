import type { CommandContext } from '../TerminalCore';
import type { IOStreams } from '../streams';
import { FileSystem } from '../filesystem';
import { user, group } from '../TerminalCore';
import { ExitCode } from '../../utils/errorMessages';

export async function shellInterpreter(
  scriptPath: string,
  args: string[],
  context: CommandContext,
  io: IOStreams,
  fs: FileSystem,
): Promise<number> {
  try {
    const node = fs.getNode(scriptPath, user, group, 'read');
    if (!node || node.type !== 'file') {
      io.stderr.write(`sh: ${scriptPath}: No such file or directory\n`);
      return ExitCode.GENERAL_ERROR;
    }
    const content = node.content || '';
    const lines = content.split('\n');
    const scriptLines = lines[0]?.startsWith('#!') ? lines.slice(1) : lines;

    // Tokenizer that preserves quotes in tokens
    const splitWords = (line: string): string[] => {
      const out: string[] = [];
      let cur = '';
      let inS = false,
        inD = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]!;
        if (!inD && ch === "'") {
          inS = !inS;
          cur += ch;
          continue;
        }
        if (!inS && ch === '"') {
          inD = !inD;
          cur += ch;
          continue;
        }
        if (!inS && !inD && /\s/.test(ch)) {
          if (cur.length) {
            out.push(cur);
            cur = '';
          }
          while (i + 1 < line.length && /\s/.test(line[i + 1]!)) i++;
          continue;
        }
        if (ch === '\\' && !inS) {
          if (i + 1 < line.length) {
            cur += ch + line[i + 1];
            i++;
            continue;
          }
        }
        cur += ch;
      }
      if (cur.length) out.push(cur);
      return out;
    };

    const expandPositionals = (s: string): string => {
      // ${1}
      s = s.replace(/\$\{([1-9])}/g, (_, d) => args[parseInt(d, 10) - 1] ?? '');
      // $1 not preceded by another $
      s = s.replace(/(^|[^$])\$([1-9])/g, (_, p, d) => `${p}${args[parseInt(d, 10) - 1] ?? ''}`);
      return s;
    };

    for (const rawLine of scriptLines) {
      const base = rawLine.trim();
      if (!base) continue;

      // Split by ';' outside quotes
      const parts: string[] = [];
      let buf = '';
      let inS = false,
        inD = false;
      for (let i = 0; i < base.length; i++) {
        const ch = base[i]!;
        if (!inD && ch === "'") {
          inS = !inS;
          buf += ch;
          continue;
        }
        if (!inS && ch === '"') {
          inD = !inD;
          buf += ch;
          continue;
        }
        if (!inS && !inD && ch === ';') {
          const seg = buf.trim();
          if (seg) parts.push(seg);
          buf = '';
          continue;
        }
        buf += ch;
      }
      const tail = buf.trim();
      if (tail) parts.push(tail);

      const shell: any = (context as any).shell;

      for (const line of parts) {
        if (line.startsWith('#')) continue;
        // Handle simple standalone variable assignment (e.g., NAME=James or FOO=$(cat foo))
        const assign = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (assign) {
          const varName = assign[1];
          let rhs = assign[2] ?? '';

          // If the entire value is quoted, strip the quotes
          if (
            (rhs.length >= 2 && rhs.startsWith('"') && rhs.endsWith('"')) ||
            (rhs.length >= 2 && rhs.startsWith("'") && rhs.endsWith("'"))
          ) {
            rhs = rhs.slice(1, -1);
          }

          // Basic command substitution: $( ... ) — single, non-nested
          const cs = rhs.match(/^\$\((.*)\)$/s);
          if (cs) {
            const inner = cs[1].trim();
            const shell: any = (context as any).shell;
            if (shell && typeof shell.executeCommand === 'function') {
              let captured = '';
              const tmpIO: IOStreams = {
                stdout: { write: (d: string) => (captured += d), on: () => {} } as any,
                stderr: { write: (_: string) => {}, on: () => {} } as any,
                stdin: { read: () => '', on: () => {} } as any,
              } as any;
              await shell.executeCommand(inner, { headless: true, io: tmpIO });
              // Remove trailing newlines like real shells do for command substitution
              rhs = captured.replace(/\n+$/g, '');
            }
          }

          (context.env as any)[varName] = rhs;
          continue;
        }
        // Expand positionals outside single quotes, then delegate full line to Shell
        const tokens = splitWords(line);
        const rebuilt = tokens
          .map((tok) => {
            const isSingle = tok.length >= 2 && tok.startsWith("'") && tok.endsWith("'");
            if (isSingle) return tok; // do not expand inside single quotes
            return expandPositionals(tok);
          })
          .join(' ');

        if (shell && typeof shell.executeCommand === 'function') {
          await shell.executeCommand(rebuilt, { headless: true, io });
        } else {
          io.stderr.write(`sh: internal shell not available\n`);
          return ExitCode.GENERAL_ERROR;
        }
      }
    }
    return ExitCode.SUCCESS;
  } catch {
    io.stderr.write(`sh: ${scriptPath}: No such file or directory\n`);
    return ExitCode.GENERAL_ERROR;
  }
}
