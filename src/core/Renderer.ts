// Virtual screen buffer and renderer for efficient terminal output

export interface RendererConfig {
  outputElement: HTMLElement;
  promptElement: HTMLElement;
  inputElement: HTMLInputElement;
}

export class Renderer {
  private outputElement: HTMLElement;
  private promptElement: HTMLElement;
  private inputElement: HTMLInputElement;
  private scrollbackEl: HTMLDivElement;
  private liveEl: HTMLDivElement;
  private bottomSpacerEl: HTMLDivElement | null = null;
  private clearedMode: boolean = false;
  private clearedAnchorScrollTop: number | null = null;
  private suggestionsEl: HTMLDivElement | null = null;
  private reverseSearchEl: HTMLDivElement | null = null;

  constructor(config: RendererConfig) {
    this.outputElement = config.outputElement;
    this.promptElement = config.promptElement;
    this.inputElement = config.inputElement;

    this.scrollbackEl = document.createElement('div');
    this.scrollbackEl.className = 'output-scrollback';
    this.liveEl = document.createElement('div');
    this.liveEl.className = 'output-live';

    while (this.outputElement.firstChild) {
      this.scrollbackEl.appendChild(this.outputElement.firstChild);
    }

    this.outputElement.appendChild(this.scrollbackEl);
    this.outputElement.appendChild(this.liveEl);

    const screen = this.outputElement.parentElement;
    if (screen) {
      this.bottomSpacerEl = document.createElement('div');
      this.bottomSpacerEl.className = 'terminal-bottom-spacer';
      this.bottomSpacerEl.style.width = '100%';
      this.bottomSpacerEl.style.height = '0px';
      this.bottomSpacerEl.style.flexShrink = '0';
      screen.appendChild(this.bottomSpacerEl);

      const exitCleared = () => {
        this.clearedMode = false;
      };
      screen.addEventListener('wheel', exitCleared, { passive: true });
      screen.addEventListener('touchmove', exitCleared, { passive: true });
    }
  }

  // --------------------------------------------------------------------------
  // Layout helpers
  // --------------------------------------------------------------------------

  private exitClearedMode(): void {
    this.clearedMode = false;
    this.clearedAnchorScrollTop = null;
    if (this.bottomSpacerEl) this.bottomSpacerEl.style.height = '0px';
  }

  private scrollPromptIntoViewBottom(): void {
    const screen = this.outputElement.parentElement;
    if (!screen) return;
    const styles = getComputedStyle(screen);
    const padBottom = parseInt(styles.paddingBottom || '0', 10) || 0;
    const screenRect = screen.getBoundingClientRect();
    const promptRect = this.promptElement.getBoundingClientRect();
    const promptBottom = screen.scrollTop + (promptRect.top - screenRect.top) + promptRect.height;
    screen.scrollTop = Math.max(0, promptBottom - (screen.clientHeight - padBottom));
  }

  scrollToBottom(): void {
    if (this.clearedMode) return;
    if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
      window.requestAnimationFrame(() => this.scrollPromptIntoViewBottom());
    } else {
      this.scrollPromptIntoViewBottom();
    }
  }

  private scrollScreenToVeryBottom(): void {
    const screen = this.outputElement.parentElement;
    if (!screen) return;
    if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
      window.requestAnimationFrame(() => {
        screen.scrollTop = screen.scrollHeight;
      });
    } else {
      screen.scrollTop = screen.scrollHeight;
    }
  }

  private scheduleUpdateClearedLayout(): void {
    const run = () => this.updateClearedLayout();
    if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
      window.requestAnimationFrame(run);
    } else {
      run();
    }
  }

  // --------------------------------------------------------------------------
  // Core write logic
  // --------------------------------------------------------------------------

  writeOutput(content: string, className?: string): void {
    if (!content) return;
    const lines = content.split('\n');

    lines.forEach((line) => {
      const div = document.createElement('div');
      div.className = className ? `output-line ${className}` : 'output-line';
      div.innerHTML = line || '&nbsp;';
      this.liveEl.appendChild(div);
    });

    if (this.clearedMode) {
      this.scheduleUpdateClearedLayout();
    } else {
      this.scrollToBottom();
    }
  }

  // Write a raw HTML block without splitting by line (for banners, rich output)
  writeHTML(content: string, className?: string): void {
    if (!content) return;
    const div = document.createElement('div');
    div.className = className ? `output-block ${className}` : 'output-block';
    div.innerHTML = content;
    this.liveEl.appendChild(div);

    if (this.clearedMode) {
      this.scheduleUpdateClearedLayout();
    } else {
      this.scrollToBottom();
    }
  }

  // Renders completion suggestions after the prompt instead of in the output area
  showCompletions(items: string[] | string, className?: string): void {
    // Ensure suggestions container exists directly after the prompt element
    if (!this.suggestionsEl) {
      this.suggestionsEl = document.createElement('div');
      this.suggestionsEl.className = 'tab-completions';
      this.promptElement.insertAdjacentElement('afterend', this.suggestionsEl);
    }

    // Reset contents
    while (this.suggestionsEl.firstChild)
      this.suggestionsEl.removeChild(this.suggestionsEl.firstChild);

    const line = document.createElement('div');
    line.className = className ? `output-line ${className}` : 'output-line';
    line.textContent = Array.isArray(items) ? items.join('  ') : items;
    this.suggestionsEl.appendChild(line);

    this.scrollScreenToVeryBottom();
  }

  clearCompletions(): void {
    if (!this.suggestionsEl) return;
    while (this.suggestionsEl.firstChild)
      this.suggestionsEl.removeChild(this.suggestionsEl.firstChild);
  }

  // Renders a reverse-i-search status line after the prompt
  showReverseSearchHint(query: string, match: string | null): void {
    if (!this.reverseSearchEl) {
      this.reverseSearchEl = document.createElement('div');
      this.reverseSearchEl.className = 'reverse-search-hint';
      this.promptElement.insertAdjacentElement('afterend', this.reverseSearchEl);
    }
    const safeQuery = this.escapeHTML(query);
    const safeMatch = this.escapeHTML(match ?? '');
    this.reverseSearchEl.innerHTML = `(reverse-i-search)\`<span class="revsearch-query">${safeQuery}</span>': <span class="revsearch-match">${safeMatch}</span>`;
    this.scrollToBottom();
  }

  clearReverseSearchHint(): void {
    if (this.reverseSearchEl) {
      this.reverseSearchEl.remove();
      this.reverseSearchEl = null;
    }
  }

  writeCommand(promptHTML: string, command: string): void {
    // Clear any stale suggestions when a command is committed to history
    this.clearCompletions();

    const div = document.createElement('div');
    div.className = 'history-command';
    div.innerHTML = promptHTML + `<span>${this.escapeHTML(command)}</span>`;
    this.liveEl.appendChild(div);

    if (this.clearedMode) {
      this.scheduleUpdateClearedLayout();
    } else {
      this.scrollToBottom();
    }
  }

  // --------------------------------------------------------------------------
  // Clear logic (fully functional, first clear included)
  // --------------------------------------------------------------------------

  clear(): void {
    // Also clear any suggestions below the prompt
    this.clearCompletions();

    // Move current live output into scrollback (preserve history)
    while (this.liveEl.firstChild) {
      this.scrollbackEl.appendChild(this.liveEl.firstChild);
    }

    // Reset buffer and enter cleared mode
    this.clearedMode = true;

    const screen = this.outputElement.parentElement;
    if (!screen) return;

    const padTop = parseInt(getComputedStyle(screen).paddingTop || '0', 10) - 5 || 0;

    // Fill bottom spacer to viewport height so the prompt can align to top
    if (this.bottomSpacerEl) {
      this.bottomSpacerEl.style.height = `${screen.clientHeight}px`;
    }

    // Defer scroll work until layout fully settled
    const doScroll = () => {
      const overshoot = 8; // push a few px further to hide any old line
      // 1. Scroll beyond the bottom to hide old prompt
      screen.scrollTop = screen.scrollHeight + overshoot;

      // 2. Compute prompt offset precisely after layout
      const screenRect = screen.getBoundingClientRect();
      const promptRect = this.promptElement.getBoundingClientRect();
      const promptOffset = screen.scrollTop + (promptRect.top - screenRect.top);

      // 3. Anchor scroll position for cleared layout updates
      this.clearedAnchorScrollTop = Math.max(0, promptOffset - padTop);
      screen.scrollTop = this.clearedAnchorScrollTop;

      // 4. Run layout update to ensure correct spacer height
      this.updateClearedLayout();
    };

    if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
      requestAnimationFrame(() => requestAnimationFrame(doScroll));
    } else {
      doScroll();
    }
  }

  private updateClearedLayout(): void {
    if (!this.clearedMode) return;

    const screen = this.outputElement.parentElement;
    if (!screen) return;

    const liveHeight = this.liveEl.scrollHeight;
    const viewportHeight = screen.clientHeight;

    if (liveHeight < viewportHeight) {
      if (this.bottomSpacerEl)
        this.bottomSpacerEl.style.height = `${viewportHeight - liveHeight}px`;
      screen.scrollTop = this.clearedAnchorScrollTop ?? 0;
      return;
    }

    this.exitClearedMode();
    if (this.bottomSpacerEl) this.bottomSpacerEl.style.height = '0px';
    this.scrollPromptIntoViewBottom();
  }

  // --------------------------------------------------------------------------
  // Misc helpers
  // --------------------------------------------------------------------------

  updatePrompt(pwd: string, home?: string): void {
    const pathSpan = this.promptElement.querySelector('.prompt-path');
    if (pathSpan) {
      let displayPath = pwd;
      if (home && pwd.startsWith(home)) {
        displayPath = pwd.replace(home, '~');
      }
      pathSpan.textContent = displayPath;
    }
  }

  focusInput(): void {
    this.inputElement.focus();
  }

  getInputValue(): string {
    return this.inputElement.value;
  }

  setInputValue(value: string): void {
    this.inputElement.value = value;
  }

  clearInput(): void {
    this.inputElement.value = '';
  }

  private escapeHTML(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  getPromptHTML(): string {
    const clone = this.promptElement.cloneNode(true) as HTMLElement;
    const input = clone.querySelector('#terminal-input');
    if (input) input.remove();
    return clone.innerHTML;
  }
}
