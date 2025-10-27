import { Shell } from './core/Shell';
import { Renderer } from './core/Renderer';
import { CommandContext } from './core/TerminalCore';
import { FileSystem } from './core/filesystem';
import { addBaseFilesystem } from './core/addBaseFilesystem';
import { getWelcomeBanner } from './core/welcome';
import { registerAllCommands } from './utils/commandRegistry';

// Initialize on DOM ready
async function initTerminal() {
  // Check if mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );

  const terminalContainer = document.getElementById('terminal-container') as HTMLElement;
  const mobileDiv = document.getElementById('mobile') as HTMLElement;

  if (isMobile) {
    terminalContainer.style.display = 'none';
    mobileDiv.style.display = 'block';
    return;
  } else {
    terminalContainer.style.display = 'flex';
    mobileDiv.style.display = 'none';
  }

  // Get DOM elements
  const outputElement = document.getElementById('terminal-output') as HTMLElement;
  const promptElement = document.getElementById('terminal-prompt') as HTMLElement;
  const inputElement = document.getElementById('terminal-input') as HTMLInputElement;

  // Initialize file system
  const fileSystem = new FileSystem();
  addBaseFilesystem(fileSystem);

  // Create a minimal TerminalCore for filesystem access
  // Note: We'll migrate away from TerminalCore eventually, but keep it for now for compatibility
  const terminalCore = {
    getFileSystem: () => fileSystem,
  };

  // Create context
  const context: CommandContext = {
    env: {
      PWD: '/home/busykoala',
      HOME: '/home/busykoala',
      EDITOR: 'nvim',
      PATH: '/bin:/usr/local/bin:/usr/bin:/sbin',
      SHELL: '/bin/zsh',
      USER: 'busykoala',
      COMMANDS: {},
      LAST_EXIT_CODE: '0',
    },
    version: '2.0.0',
    history: [],
    files: {},
    terminal: terminalCore as any,
    shell: null as any, // Will be set after Shell creation
  };

  // Create renderer
  const renderer = new Renderer({
    outputElement,
    promptElement,
    inputElement,
  });

  // Create shell
  const shell = new Shell({
    renderer,
    context,
  });

  // Store shell reference in context
  context.shell = shell;

  // Auto-discover and register all commands
  await registerAllCommands(shell);

  // Display welcome banner
  renderer.writeHTML(getWelcomeBanner());

  // Update status bar time
  function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });
    const timeElement = document.querySelector('.statusbar-time');
    if (timeElement) {
      (timeElement as HTMLElement).textContent = timeString;
    }
  }
  updateTime();
  setInterval(updateTime, 1000);

  // Keyboard event handlers
  const handleReverseSearchKey = async (e: KeyboardEvent): Promise<boolean> => {
    if (!shell.isReverseSearchActive()) return false;

    if (e.key === 'Escape') {
      e.preventDefault();
      shell.abortReverseSearch();
      return true;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      shell.acceptReverseSearch();
      const input = renderer.getInputValue();
      if (input.trim()) await shell.executeCommand(input);
      return true;
    }

    if (e.ctrlKey && e.key.toLowerCase() === 'r') {
      e.preventDefault();
      shell.nextReverseSearch();
      return true;
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      shell.typeReverseSearchChar(e.key);
      return true;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      shell.backspaceReverseSearch();
      return true;
    }

    return false;
  };

  const handleNormalKey = async (e: KeyboardEvent): Promise<void> => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const input = renderer.getInputValue();
      await shell.executeCommand(input);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const historyCommand = shell.navigateHistory('up');
      renderer.setInputValue(historyCommand);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const historyCommand = shell.navigateHistory('down');
      renderer.setInputValue(historyCommand);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const input = renderer.getInputValue();
      const completed = shell.tabComplete(input);
      renderer.setInputValue(completed);
    } else if (e.ctrlKey && e.key.toLowerCase() === 'l') {
      // Clear terminal and redraw prompt (like real shell)
      e.preventDefault();
      shell.clear();
      renderer.updatePrompt(context.env.PWD, context.env.HOME);
      renderer.focusInput();
    } else if (e.ctrlKey && e.key.toLowerCase() === 'r') {
      // Enter reverse i-search mode
      e.preventDefault();
      shell.startReverseSearch();
    } else if (e.ctrlKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      shell.cancelCurrentExecution();
    }
  };

  inputElement.addEventListener('keydown', async (e) => {
    // Clear tab suggestions on any key except Tab
    if (e.key !== 'Tab') {
      renderer.clearCompletions?.();
    }

    // Handle reverse search mode first
    const wasHandled = await handleReverseSearchKey(e);
    if (wasHandled) return;

    // Handle normal mode keys
    await handleNormalKey(e);
  });

  // Click anywhere to focus input
  document.addEventListener('click', (e) => {
    if (e.target !== inputElement) {
      renderer.focusInput();
    }
  });

  // Initial focus
  renderer.focusInput();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initTerminal();
  });
} else {
  initTerminal();
}
