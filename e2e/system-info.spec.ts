import { test, expect } from '@playwright/test';
import { TerminalHelper } from './helpers';

test.describe('System Information Commands E2E Tests', () => {
  let terminal: TerminalHelper;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    terminal = new TerminalHelper(page);
    await terminal.waitForTerminal();
    await page.waitForTimeout(500);
  });

  test('df - display disk space usage', async () => {
    await terminal.executeCommand('df');
    await terminal.expectOutputContains('Filesystem');
  });

  test('df - with -h flag (human readable)', async () => {
    await terminal.executeCommand('df -h');
    const output = await terminal.getOutput();
    expect(output).toContain('Filesystem');
  });

  test('du - display directory space usage', async () => {
    await terminal.executeCommand('mkdir dutest');
    await terminal.executeCommand('echo "content" > dutest/file.txt');
    await terminal.executeCommand('du dutest');
    const output = await terminal.getOutput();
    expect(output).toMatch(/\d+/);
  });

  test('du - with -h flag (human readable)', async () => {
    await terminal.executeCommand('du -h');
    const output = await terminal.getOutput();
    expect(output.length).toBeGreaterThan(0);
  });

  test('du - with -s flag (summary)', async () => {
    await terminal.executeCommand('mkdir dutest2');
    await terminal.executeCommand('echo "test" > dutest2/file.txt');
    await terminal.executeCommand('du -s dutest2');
    const output = await terminal.getOutput();
    expect(output).toMatch(/\d+/);
  });

  test('env - display environment variables', async () => {
    await terminal.executeCommand('env');
    await terminal.expectOutputContains('HOME');
    await terminal.expectOutputContains('PWD');
  });

  test('export - set environment variable', async () => {
    await terminal.executeCommand('export TESTVAR=value123');
    await terminal.executeCommand('env');
    await terminal.expectOutputContains('TESTVAR=value123');
  });

  test('export - set multiple variables', async () => {
    await terminal.executeCommand('export VAR1=val1 VAR2=val2');
    await terminal.executeCommand('env');
    await terminal.expectOutputContains('VAR1=val1');
    await terminal.expectOutputContains('VAR2=val2');
  });

  test('unset - remove environment variable', async () => {
    await terminal.executeCommand('export REMOVEVAR=test');
    await terminal.executeCommand('unset REMOVEVAR');
    await terminal.executeCommand('env');
    const output = await terminal.getOutput();
    expect(output?.includes('REMOVEVAR') || false).toBe(false);
  });
});
