import { test, expect } from '@playwright/test';
import { TerminalHelper } from './helpers';

test.describe('Basic Commands E2E Tests', () => {
  let terminal: TerminalHelper;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    terminal = new TerminalHelper(page);
    await terminal.waitForTerminal();
    // Wait a bit for welcome message to finish
    await page.waitForTimeout(500);
  });

  test('echo - basic text output', async () => {
    await terminal.executeCommand('echo "Hello World"');
    await terminal.expectOutputContains('Hello World');
  });

  test('echo - with flags -n (no newline)', async () => {
    await terminal.executeCommand('echo -n "test"');
    await terminal.expectOutputContains('test');
  });

  test('echo - with flags -e (enable backslash escapes)', async () => {
    await terminal.executeCommand('echo -e "line1\\nline2"');
    await terminal.expectOutputContains('line1');
    await terminal.expectOutputContains('line2');
  });

  test('pwd - print working directory', async () => {
    await terminal.executeCommand('pwd');
    await terminal.expectOutputContains('/home/busykoala');
  });

  test('whoami - show current user', async () => {
    await terminal.executeCommand('whoami');
    await terminal.expectOutputContains('busykoala');
  });

  test('hostname - show hostname', async () => {
    await terminal.executeCommand('hostname');
    await terminal.expectOutputContains('busyhost');
  });

  test('id - show user identity', async () => {
    await terminal.executeCommand('id');
    await terminal.expectOutputContains('uid=');
    await terminal.expectOutputContains('busykoala');
  });

  test('id - with -u flag (user ID only)', async () => {
    await terminal.executeCommand('id -u');
    const output = await terminal.getOutput();
    expect(output).toMatch(/\d+/);
  });

  test('date - show current date', async () => {
    await terminal.executeCommand('date');
    const output = await terminal.getOutput();
    // Check for date format
    expect(output).toMatch(/\d{4}/); // Year
  });

  test('date - with custom format', async () => {
    await terminal.executeCommand('date +%Y');
    const output = await terminal.getOutput();
    expect(output).toMatch(/\d{4}/);
  });

  test('uname - system information', async () => {
    await terminal.executeCommand('uname');
    await terminal.expectOutputContains('Linux');
  });

  test('uname - with -a flag (all information)', async () => {
    await terminal.executeCommand('uname -a');
    const output = await terminal.getOutput();
    expect(output).toContain('Linux');
  });

  test('clear - clear terminal', async () => {
    await terminal.executeCommand('echo "test"');
    await terminal.executeCommand('clear');
    // After clear, output should be minimal
    const output = await terminal.getOutput();
    expect(output?.includes('test') || false).toBe(false);
  });

  test('help - show help message', async () => {
    await terminal.executeCommand('help');
    await terminal.expectOutputContains('Available commands');
  });

  test('help - with specific command', async () => {
    await terminal.executeCommand('help echo');
    await terminal.expectOutputContains('echo');
  });

  test('history - show command history', async () => {
    await terminal.executeCommand('echo "test1"');
    await terminal.executeCommand('echo "test2"');
    await terminal.executeCommand('history');
    await terminal.expectOutputContains('echo "test1"');
    await terminal.expectOutputContains('echo "test2"');
  });
});
