// New Shell core with stream-based I/O and modular architecture

import { IOStreams, createIOStreams, CancellationToken } from './streams';
import { Renderer } from './Renderer';
import { CommandContext } from './TerminalCore';
import { CommandResolver, AsyncCommand } from './CommandResolver';
import { InterpreterRegistry } from './InterpreterRegistry';
import { builtinsSet } from './data/binFiles';
import { user, group } from './TerminalCore';

export type AsyncCommandFn = (
  args: string[],
  context: CommandContext,
  io: IOStreams,
) => Promise<number>;

export interface CommandRegistry {
  [name: string]: {
    fn: AsyncCommandFn;
    description: string;
    usage?: string;
  };
}

export interface ShellConfig {
  renderer: Renderer;
  context: CommandContext;
}

export class Shell {
  private renderer: Renderer;
  private context: CommandContext;
  private commands: CommandRegistry = {};
  private builtinMap: Map<string, AsyncCommand> = new Map();
  private resolver: CommandResolver;
  private interpreters: InterpreterRegistry;
  private history: string[] = [];
  private historyIndex: number = 0;
  private tabCycleState: { base: string; matches: string[]; index: number } | null = null;

  // Reverse search state
  private reverseSearchActive: boolean = false;
  private reverseSearchQuery: string = '';
  private reverseSearchIndex: number = -1;

  // Execution/cancellation state
  private executing: boolean = false;
  private currentCancelToken: CancellationToken | null = null;

  constructor(config: ShellConfig) {
    this.renderer = config.renderer;
    this.context = config.context;

    // Initialize resolver and interpreters
    const fs = this.context.terminal.getFileSystem();
    this.resolver = new CommandResolver(this.builtinMap, fs);
    this.interpreters = new InterpreterRegistry();

    // Ensure the shell instance is available in context for interpreters
    (this.context as any).shell = this;
  }

  registerCommand(name: string, fn: AsyncCommandFn, description: string, usage?: string): void {
    this.commands[name] = { fn, description, usage };
    // Also register in builtin map for resolver and map executable paths
    this.builtinMap.set(name, fn);
    if (builtinsSet.has(name as any)) {
      // Provide /bin and /usr/bin aliases to resolver
      this.resolver.registerExecutable(`/bin/${name}`, fn);
      this.resolver.registerExecutable(`/usr/bin/${name}`, fn);
    }
  }

  async executeCommand(
    input: string,
    options?: { headless?: boolean; io?: IOStreams },
  ): Promise<void> {
    if (!input.trim()) return;

    const headless = options?.headless === true;

    // Add to history
    if (!headless) {
      this.history.push(input);
      this.historyIndex = this.history.length;
      this.context.history = this.history;
    }

    // Display the command in output
    if (!headless) {
      const promptHTML = this.renderer.getPromptHTML();
      this.renderer.writeCommand(promptHTML, input);
      this.renderer.clearInput();
    }

    // Setup cancellation for this command sequence
    this.executing = true;
    this.currentCancelToken = new CancellationToken();

    // Detect if there's a file redirection on the overall input (only applies to the last command)
    let overallRedirectFile: string | null = null;
    let overallRedirectMode: 'write' | 'append' | null = null;

    // Split pipeline and trim commands
    const rawParts = input
      .split('|')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (rawParts.length === 0) return;

    // Check last part for redirection (supports > and >>) and stderr redirection/merge
    let parts = [...rawParts];
    let lastPart = parts[parts.length - 1];

    // stderr redirection and merge parsing for the last command
    let stderrRedirectFile: string | null = null;
    let mergeStderrToStdout = false;

    if (/\b2>&1\b/.test(lastPart)) {
      mergeStderrToStdout = true;
      lastPart = lastPart.replace(/\s*2>&1\s*/g, ' ');
    }
    const twoGtMatches = [...lastPart.matchAll(/\s2>\s*(\S+)/g)];
    if (twoGtMatches.length > 0) {
      stderrRedirectFile = twoGtMatches[twoGtMatches.length - 1][1];
      lastPart = lastPart.replace(/\s2>\s*\S+/g, ' ');
    }

    const appendMatch = lastPart.match(/^(.*?)\s*>>\s*(.+)$/);
    const writeMatch = lastPart.match(/^(\S[\s\S]*?)\s*>\s*(.+)$/);
    if (appendMatch) {
      parts[parts.length - 1] = appendMatch[1].trim();
      overallRedirectFile = appendMatch[2].trim();
      overallRedirectMode = 'append';
    } else if (writeMatch) {
      parts[parts.length - 1] = writeMatch[1].trim();
      overallRedirectFile = writeMatch[2].trim();
      overallRedirectMode = 'write';
    } else {
      parts[parts.length - 1] = lastPart.trim();
    }

    // We'll carry the output of each command to the next
    let previousOutput = '';

    try {
      for (let i = 0; i < parts.length; i++) {
        if (this.currentCancelToken?.isCancelled()) {
          this.context.env.LAST_EXIT_CODE = '130';
          (this.context.env as any)['?'] = '130';
          break;
        }
        const isLast = i === parts.length - 1;
        const cmdText = parts[i];

        // Create I/O streams for this command
        const io = createIOStreams();
        io.cancelToken = this.currentCancelToken || undefined;
        let capturedOutput = '';
        let capturedError = '';

        io.stdout.on((data) => {
          capturedOutput += data;
          if (!headless && isLast && !overallRedirectFile) {
            this.renderer.writeOutput(data);
          }
        });

        io.stderr.on((data) => {
          capturedError += data;
          if (!headless && !(isLast && (stderrRedirectFile || mergeStderrToStdout))) {
            this.renderer.writeOutput(data, 'output-error');
          }
        });

        // Tokenize this command with here-string support
        const { tokens: rawTokens, hereString } = this.tokenizeWithHereString(cmdText);
        if (hereString != null) {
          io.stdin.write(hereString + '\n');
        }

        if (rawTokens.length === 0) {
          continue;
        }

        // Determine command name and args
        let commandName = rawTokens[0];
        let commandArgs: string[];
        if (commandName === 'echo') {
          // Preserve quoting/escaping for echo; let it handle expansion per its own rules
          commandArgs = rawTokens.slice(1);
        } else {
          // Expand variables and globs; then strip outer quotes
          const expanded: string[] = [];
          for (const t of rawTokens) {
            const exp = this.expandToken(t, this.context.env as any);
            const globs = this.hasUnquotedGlob(t) ? this.expandGlobs(exp) : [exp];
            expanded.push(...globs);
          }
          commandName = this.stripOuterQuotes(expanded[0] ?? '');
          commandArgs = expanded.slice(1).map((a) => this.stripOuterQuotes(a));
        }

        if (previousOutput) {
          commandArgs.unshift(previousOutput.replace(/\n+$/g, ''));
        }

        const entry = this.commands[commandName];
        if (entry) {
          // Built-in command
          const exitCode = await entry.fn(commandArgs, this.context, io);
          this.context.env.LAST_EXIT_CODE = exitCode.toString();
          (this.context.env as any)['?'] = exitCode.toString();
        } else {
          // External resolution (PATH, direct path, and built-in mappings to /bin)
          const res = await this.resolver.resolve(commandName, this.context);
          if (res.type === 'builtin' && res.command) {
            const exitCode = await res.command(commandArgs, this.context, io);
            this.context.env.LAST_EXIT_CODE = exitCode.toString();
            (this.context.env as any)['?'] = exitCode.toString();
          } else if (res.type === 'executable' && res.command) {
            const exitCode = await res.command(commandArgs, this.context, io);
            this.context.env.LAST_EXIT_CODE = exitCode.toString();
            (this.context.env as any)['?'] = exitCode.toString();
          } else if (res.type === 'script' && res.path && res.interpreter) {
            const exitCode = await this.interpreters.execute(
              res.interpreter,
              res.path,
              commandArgs,
              this.context,
              io,
              this.context.terminal.getFileSystem(),
            );
            this.context.env.LAST_EXIT_CODE = exitCode.toString();
            (this.context.env as any)['?'] = exitCode.toString();
          } else if (res && res.type === 'not_executable') {
            io.stderr.write(`Permission denied\n`);
            this.context.env.LAST_EXIT_CODE = '126';
            (this.context.env as any)['?'] = '126';
          } else {
            io.stderr.write(
              `Command '${commandName}' not found. Type 'help' for available commands.`,
            );
            this.context.env.LAST_EXIT_CODE = '127';
            (this.context.env as any)['?'] = '127';
          }
        }

        if (this.currentCancelToken?.isCancelled()) {
          this.context.env.LAST_EXIT_CODE = '130';
          (this.context.env as any)['?'] = '130';
          break;
        }

        // Handle stderr redirection/merge for the last command
        if (isLast && (stderrRedirectFile || mergeStderrToStdout)) {
          if (mergeStderrToStdout) {
            capturedOutput += capturedError;
          } else if (stderrRedirectFile) {
            this.redirectToFile(stderrRedirectFile, capturedError, 'write');
          }
        }

        // Redirect the overall output if requested (for the last command only)
        if (isLast && overallRedirectFile) {
          this.redirectToFile(overallRedirectFile, capturedOutput, overallRedirectMode || 'write');
          // When redirecting, we do not print to screen for the last command
        }

        // In headless mode, forward to provided IO when not redirected
        if (headless && isLast && options?.io) {
          if (!overallRedirectFile && capturedOutput) {
            options.io.stdout.write(capturedOutput);
          }
          if (!(stderrRedirectFile || mergeStderrToStdout) && capturedError) {
            options.io.stderr.write(capturedError);
          }
        }

        previousOutput = capturedOutput;
      }
    } finally {
      this.executing = false;
      this.currentCancelToken = null;
    }

    // Update prompt with current directory
    if (!headless) {
      this.renderer.updatePrompt(this.context.env.PWD, this.context.env.HOME);
      this.renderer.focusInput();
    }
  }

  cancelCurrentExecution(): void {
    if (!this.executing) {
      this.renderer.writeOutput('^C', 'output-error');
      this.renderer.clearInput();
      return;
    }
    this.currentCancelToken?.cancel();
    this.context.env.LAST_EXIT_CODE = '130';
    (this.context.env as any)['?'] = '130';
    this.renderer.writeOutput('^C', 'output-error');
    this.renderer.clearInput();
  }

  navigateHistory(direction: 'up' | 'down'): string {
    if (direction === 'up' && this.historyIndex > 0) {
      this.historyIndex--;
    } else if (direction === 'down' && this.historyIndex < this.history.length) {
      this.historyIndex++;
    }

    if (this.historyIndex < this.history.length) {
      return this.history[this.historyIndex];
    }
    return '';
  }

  tabComplete(input: string): string {
    const resetCycle = () => {
      this.tabCycleState = null;
    };

    const getFlagCandidates = (cmd: string): string[] => {
      if (cmd === 'ls') {
        return [
          '-A',
          '-a',
          '-d',
          '-F',
          '-h',
          '-i',
          '-l',
          '-r',
          '-R',
          '-S',
          '-t',
          '-1',
          '--color=auto',
          '--color=never',
          '--color=always',
          '--help',
          '--version',
        ];
      }
      return [];
    };

    const args = this.parseCommand(input);
    if (args.length === 0) {
      resetCycle();
      return input;
    }

    // Completing command name (no trailing space, first token)
    if (args.length === 1 && !input.endsWith(' ')) {
      const lastArg = args[0];
      const all = Object.keys(this.commands).sort();
      const matches = all.filter((cmd) => cmd.startsWith(lastArg));
      if (matches.length === 0) {
        resetCycle();
        return input;
      }
      const base = input.slice(0, input.length - lastArg.length);

      if (
        this.tabCycleState &&
        this.tabCycleState.base === base &&
        this.tabCycleState.matches.join('\u0000') === matches.join('\u0000')
      ) {
        this.tabCycleState.index = (this.tabCycleState.index + 1) % matches.length;
      } else {
        this.tabCycleState = { base, matches, index: 0 };
      }
      const pick = this.tabCycleState.matches[this.tabCycleState.index];
      return base + pick + ' ';
    }

    // Subcommand completion for `help COMMAND`
    const helpCmd = args[0];
    const helpLast = args[args.length - 1];
    if (
      helpCmd === 'help' &&
      args.length >= 2 &&
      !input.endsWith(' ') &&
      !helpLast.startsWith('-')
    ) {
      const all = Object.keys(this.commands).sort();
      const matches = all.filter((c) => c.startsWith(helpLast));
      if (matches.length === 0) {
        resetCycle();
        return input;
      }
      const baseIdx = input.lastIndexOf(helpLast);
      const base = input.slice(0, baseIdx);

      if (
        this.tabCycleState &&
        this.tabCycleState.base === base &&
        this.tabCycleState.matches.join('\u0000') === matches.join('\u0000')
      ) {
        this.tabCycleState.index = (this.tabCycleState.index + 1) % matches.length;
      } else {
        this.tabCycleState = { base, matches, index: 0 };
      }
      const pick = this.tabCycleState.matches[this.tabCycleState.index];
      return base + pick + ' ';
    }

    // Complete flags for known commands when last token starts with '-'
    const lastArg = args[args.length - 1];
    const cmdName = args[0];
    if (lastArg.startsWith('-')) {
      const candidates = getFlagCandidates(cmdName).filter((f) => f.startsWith(lastArg));
      if (candidates.length === 0) {
        resetCycle();
        return input;
      }

      const baseIdx = input.lastIndexOf(lastArg);
      const base = input.slice(0, baseIdx);

      if (
        this.tabCycleState &&
        this.tabCycleState.base === base &&
        this.tabCycleState.matches.join('\u0000') === candidates.join('\u0000')
      ) {
        this.tabCycleState.index = (this.tabCycleState.index + 1) % candidates.length;
      } else {
        this.tabCycleState = { base, matches: candidates, index: 0 };
      }
      const pick = this.tabCycleState.matches[this.tabCycleState.index];
      return base + pick + ' ';
    }

    // Existing behavior: file/directory completion
    const lastToken = args[args.length - 1];
    const fileSystem = this.context.terminal.getFileSystem();
    const currentDir = this.context.env.PWD;

    try {
      let searchDir = currentDir;
      let prefix = lastToken;

      if (lastToken.includes('/')) {
        const lastSlash = lastToken.lastIndexOf('/');
        const dirPart = lastToken.substring(0, lastSlash + 1);
        prefix = lastToken.substring(lastSlash + 1);

        if (lastToken.startsWith('/')) {
          searchDir = fileSystem.normalizePath(dirPart);
        } else {
          searchDir = fileSystem.normalizePath(`${currentDir}/${dirPart}`);
        }
      }

      const contents = fileSystem.listDirectory(searchDir, this.context.env.USER, 'busygroup');
      const matches = contents
        .filter((item) => item.name.startsWith(prefix))
        .map((item) => {
          const basePath = lastToken.substring(0, lastToken.lastIndexOf('/') + 1);
          return basePath + item.name + (item.type === 'directory' ? '/' : '');
        });

      if (matches.length === 1) {
        resetCycle();
        const beforeLastArg = args.slice(0, -1).join(' ');
        return beforeLastArg + (beforeLastArg ? ' ' : '') + matches[0];
      } else if (matches.length > 1) {
        const displayMatches = matches.map((m) => {
          const parts = m.split('/');
          return parts[parts.length - 1] || parts[parts.length - 2] + '/';
        });
        this.renderer.showCompletions(displayMatches);
        resetCycle();
        return input;
      }
    } catch {}

    resetCycle();
    return input;
  }

  // ----------------------------- Reverse i-search ----------------------------
  isReverseSearchActive(): boolean {
    return this.reverseSearchActive;
  }

  startReverseSearch(): void {
    this.reverseSearchActive = true;
    this.reverseSearchQuery = '';
    this.reverseSearchIndex = this.history.length;
    this.renderer.clearCompletions?.();
    this.renderer.setInputValue('');
    this.renderer.showReverseSearchHint('', null);
  }

  private updateReverseSearchUI(): void {
    if (!this.reverseSearchActive) return;
    if (this.reverseSearchQuery === '') {
      this.renderer.setInputValue('');
      this.renderer.showReverseSearchHint('', null);
      return;
    }
    const idx = this.findReverseSearchMatch(this.reverseSearchQuery, this.reverseSearchIndex - 1);
    if (idx >= 0) {
      this.reverseSearchIndex = idx;
      const match = this.history[idx];
      this.renderer.setInputValue(match);
      this.renderer.showReverseSearchHint(this.reverseSearchQuery, match);
    } else {
      this.renderer.showReverseSearchHint(this.reverseSearchQuery, '');
    }
  }

  private findReverseSearchMatch(query: string, startIdx: number): number {
    if (!query) return -1;
    for (let i = Math.min(startIdx, this.history.length - 1); i >= 0; i--) {
      if (this.history[i]?.includes(query)) return i;
    }
    return -1;
  }

  typeReverseSearchChar(ch: string): void {
    if (!this.reverseSearchActive) return;
    if (ch.length !== 1) return;
    this.reverseSearchQuery += ch;
    this.reverseSearchIndex = this.history.length;
    this.updateReverseSearchUI();
  }

  backspaceReverseSearch(): void {
    if (!this.reverseSearchActive) return;
    if (this.reverseSearchQuery.length > 0) {
      this.reverseSearchQuery = this.reverseSearchQuery.slice(0, -1);
    }
    this.reverseSearchIndex = this.history.length;
    this.updateReverseSearchUI();
  }

  nextReverseSearch(): void {
    if (!this.reverseSearchActive || !this.reverseSearchQuery) return;
    let found = this.findReverseSearchMatch(this.reverseSearchQuery, this.reverseSearchIndex - 1);
    if (found < 0) {
      found = this.findReverseSearchMatch(this.reverseSearchQuery, this.history.length - 1);
    }
    if (found >= 0) {
      this.reverseSearchIndex = found;
      const match = this.history[found];
      this.renderer.setInputValue(match);
      this.renderer.showReverseSearchHint(this.reverseSearchQuery, match);
    } else {
      this.renderer.showReverseSearchHint(this.reverseSearchQuery, '');
    }
  }

  acceptReverseSearch(): void {
    if (!this.reverseSearchActive) return;
    this.reverseSearchActive = false;
    this.renderer.clearReverseSearchHint?.();
  }

  abortReverseSearch(): void {
    if (!this.reverseSearchActive) return;
    this.reverseSearchActive = false;
    this.reverseSearchQuery = '';
    this.reverseSearchIndex = -1;
    this.renderer.clearReverseSearchHint?.();
    this.renderer.setInputValue('');
  }

  private parseCommand(input: string): string[] {
    return this.tokenize(input).tokens;
  }

  private tokenizeWithHereString(input: string): { tokens: string[]; hereString: string | null } {
    const { tokens, ops } = this.tokenize(input, true);
    let here: string | null = null;
    if (ops) {
      for (const op of ops) {
        if (op.type === 'hereString' && here == null) {
          here = this.expandToken(op.value, this.context.env as any);
        }
      }
    }
    return { tokens, hereString: here };
  }

  private hasUnquotedGlob(original: string): boolean {
    let inSingle = false,
      inDouble = false;
    for (let i = 0; i < original.length; i++) {
      const ch = original[i];
      if (!inDouble && ch === "'") {
        inSingle = !inSingle;
        continue;
      }
      if (!inSingle && ch === '"') {
        inDouble = !inDouble;
        continue;
      }
      if (!inSingle && !inDouble && (ch === '*' || ch === '?')) return true;
    }
    return false;
  }

  private stripOuterQuotes(s: string): string {
    if (s.length >= 2) {
      if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        return s.slice(1, -1);
      }
    }
    return s;
  }

  private expandToken(token: string, env: Record<string, any>): string {
    let out = '';
    let inSingle = false;
    let inDouble = false;

    const readVarName = (s: string, idx: number): { name: string; next: number } | null => {
      if (s[idx] === '{') {
        // ${VAR}
        let j = idx + 1;
        let name = '';
        while (j < s.length && s[j] !== '}') {
          name += s[j];
          j++;
        }
        if (j < s.length && s[j] === '}') {
          return { name, next: j + 1 };
        }
        return null;
      } else if (s[idx] === '?') {
        return { name: '?', next: idx + 1 };
      } else {
        let j = idx;
        let name = '';
        if (/[A-Za-z_]/.test(s[j])) {
          name += s[j];
          j++;
          while (j < s.length && /[A-Za-z0-9_]/.test(s[j])) {
            name += s[j];
            j++;
          }
          return { name, next: j };
        }
        return null;
      }
    };

    for (let i = 0; i < token.length; i++) {
      const ch = token[i];
      if (!inDouble && ch === "'") {
        inSingle = !inSingle;
        continue;
      }
      if (!inSingle && ch === '"') {
        inDouble = !inDouble;
        continue;
      }

      if (ch === '\\') {
        // Escape behavior differs by context
        if (inSingle) {
          out += ch;
          continue;
        }
        if (inDouble) {
          const next = token[i + 1];
          if (next === '"' || next === '\\' || next === '$') {
            out += next ?? '';
            i++;
            continue;
          }
          out += ch;
          continue;
        }
        if (i + 1 < token.length) {
          out += token[i + 1];
          i++;
          continue;
        }
        continue;
      }

      if (ch === '$' && !inSingle) {
        const res = readVarName(token, i + 1);
        if (res) {
          const val = env[res.name] ?? '';
          out += String(val);
          i = res.next - 1;
          continue;
        }
      }

      out += ch;
    }
    return out;
  }

  private expandGlobs(expandedToken: string): string[] {
    // Only expand simple patterns on the last path segment (no glob in directory part)
    const fs = this.context.terminal.getFileSystem();
    const lastSlash = expandedToken.lastIndexOf('/');
    const dirPart = lastSlash >= 0 ? expandedToken.slice(0, lastSlash + 1) : '';
    const pattern = lastSlash >= 0 ? expandedToken.slice(lastSlash + 1) : expandedToken;

    if (/[*?]/.test(dirPart)) return [expandedToken];

    let baseDir: string;
    if (dirPart.startsWith('/')) {
      baseDir = fs.normalizePath(dirPart);
    } else {
      baseDir = fs.normalizePath(`${this.context.env.PWD}/${dirPart}`);
    }

    try {
      const entries = fs.listDirectory(baseDir, this.context.env.USER, 'busygroup');
      const re = new RegExp(
        '^' +
          pattern
            .replace(/[.+^${}()|\[\]\\]/g, (r) => '\\' + r)
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.') +
          '$',
      );
      const matches = entries
        .filter((e) => re.test(e.name))
        .map((e) => (dirPart || '') + e.name)
        .sort((a, b) => a.localeCompare(b));
      return matches.length ? matches : [expandedToken];
    } catch {
      return [expandedToken];
    }
  }

  // Robust tokenizer with quoting/escaping and here-string operator
  private tokenize(
    input: string,
    withOperators: boolean = false,
  ): { tokens: string[]; ops?: Array<{ type: 'hereString'; value: string }> } {
    const tokens: string[] = [];
    const ops: Array<{ type: 'hereString'; value: string }> = [];

    let i = 0;
    let cur = '';
    let inSingle = false;
    let inDouble = false;

    const pushToken = () => {
      if (cur.length > 0) {
        tokens.push(cur);
        cur = '';
      }
    };

    const skipSpaces = () => {
      while (i < input.length && /\s/.test(input[i]!)) i++;
    };

    const readWordRaw = (): string => {
      let out = '';
      let sInSingle = false;
      let sInDouble = false;
      while (i < input.length) {
        const ch = input[i]!;
        if (!sInDouble && ch === "'") {
          out += ch;
          sInSingle = !sInSingle;
          i++;
          continue;
        }
        if (!sInSingle && ch === '"') {
          out += ch;
          sInDouble = !sInDouble;
          i++;
          continue;
        }
        if (!sInSingle && !sInDouble && /\s/.test(ch)) break;
        if (ch === '\\' && !sInSingle) {
          if (i + 1 < input.length) {
            out += ch + input[i + 1];
            i += 2;
            continue;
          }
        }
        out += ch;
        i++;
      }
      return out;
    };

    while (i < input.length) {
      const ch = input[i]!;

      // Here-string detection: unquoted <<< WORD
      if (withOperators && !inSingle && !inDouble && input.startsWith('<<<', i)) {
        pushToken();
        i += 3;
        skipSpaces();
        const raw = readWordRaw();
        if (raw.length === 0) {
          cur += '<<<';
          continue;
        }
        ops.push({ type: 'hereString', value: raw });
        continue;
      }

      if (!inSingle && !inDouble && /\s/.test(ch)) {
        pushToken();
        i++;
        while (i < input.length && /\s/.test(input[i]!)) i++;
        continue;
      }

      if (!inDouble && ch === "'") {
        inSingle = !inSingle;
        cur += ch;
        i++;
        continue;
      }
      if (!inSingle && ch === '"') {
        inDouble = !inDouble;
        cur += ch;
        i++;
        continue;
      }

      if (ch === '\\' && !inSingle) {
        if (i + 1 < input.length) {
          cur += ch + input[i + 1];
          i += 2;
          continue;
        }
        cur += ch;
        i++;
        continue;
      }

      cur += ch;
      i++;
    }

    pushToken();

    return withOperators ? { tokens, ops } : { tokens };
  }

  private parseFlags(args: string[]): {
    flags: Record<string, boolean | string>;
    positional: string[];
  } {
    const flags: Record<string, boolean | string> = {};
    const positional: string[] = [];

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg.startsWith('--')) {
        const eq = arg.indexOf('=');
        if (eq >= 0) {
          const name = arg.slice(2, eq);
          const val = arg.slice(eq + 1);
          flags[name] = val;
        } else if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
          flags[arg.substring(2)] = args[++i];
        } else {
          flags[arg.substring(2)] = true;
        }
      } else if (arg.startsWith('-') && arg.length > 1) {
        for (let j = 1; j < arg.length; j++) {
          flags[arg[j]] = true;
        }
      } else {
        positional.push(arg);
      }
    }

    return { flags, positional };
  }

  getCommands(): CommandRegistry {
    return this.commands;
  }

  clear(): void {
    this.renderer.clear();
  }

  private redirectToFile(targetRaw: string, data: string, mode: 'write' | 'append'): void {
    // Expand env and strip outer quotes
    const expanded = this.expandToken(targetRaw, this.context.env as any);
    const target = this.stripOuterQuotes(expanded);

    // Special device: /dev/null (ignore writes)
    const t = target.trim();
    if (t === '/dev/null') return;

    const fs = this.context.terminal.getFileSystem();

    // Determine directory and file name
    let dir: string;
    let name: string;
    const idx = t.lastIndexOf('/');
    if (idx >= 0) {
      dir = idx === 0 ? '/' : t.slice(0, idx);
      name = t.slice(idx + 1);
    } else {
      dir = this.context.env.PWD;
      name = t;
    }

    // Handle empty name (e.g., redirect to a directory) by ignoring
    if (!name) return;

    // Write/append to file
    const append = mode === 'append';
    fs.addFile(dir, name, user, group, user, group, data, 'rw-r--r--', append);
  }
}
