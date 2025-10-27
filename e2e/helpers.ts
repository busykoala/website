import { Page, expect } from '@playwright/test';

/**
 * Helper to interact with the terminal in the web UI
 */
export class TerminalHelper {
  constructor(private page: Page) {}

  /**
   * Wait for the terminal to be ready
   */
  async waitForTerminal() {
    await this.page.waitForSelector('#terminal-input', { state: 'visible' });
  }

  /**
   * Execute a command in the terminal and wait for output
   */
  async executeCommand(command: string) {
    const input = this.page.locator('#terminal-input');
    await input.fill(command);
    await input.press('Enter');
    // Give the command time to execute and render
    await this.page.waitForTimeout(200);
  }

  /**
   * Get the terminal output element
   */
  async getOutput(): Promise<string> {
    const outputElement = this.page.locator('#terminal-output');
    const content = await outputElement.textContent();
    return content ?? '';
  }

  /**
   * Get the last output line(s) after a command
   */
  async getLastOutput(lines: number = 1) {
    const output = await this.getOutput();
    if (!output) return '';
    const allLines = output.trim().split('\n');
    return allLines.slice(-lines).join('\n');
  }

  /**
   * Clear the terminal output for clean test state
   */
  async clearOutput() {
    await this.executeCommand('clear');
  }

  /**
   * Check if output contains expected text
   */
  async expectOutputContains(text: string) {
    const output = await this.getOutput();
    expect(output).toContain(text);
  }

  /**
   * Check if output matches a pattern
   */
  async expectOutputMatches(pattern: RegExp) {
    const output = await this.getOutput();
    expect(output).toMatch(pattern);
  }

  /**
   * Get the current working directory from the prompt
   */
  async getCurrentDirectory(): Promise<string> {
    const promptPath = this.page.locator('.prompt-path');
    const content = await promptPath.textContent();
    return content ?? '';
  }

  /**
   * Wait for a specific text to appear in the output
   */
  async waitForOutputContains(text: string, timeout: number = 5000) {
    await this.page.waitForFunction(
      (expectedText) => {
        const output = document.querySelector('#terminal-output');
        return output?.textContent?.includes(expectedText) ?? false;
      },
      text,
      { timeout },
    );
  }
}
