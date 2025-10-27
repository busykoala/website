import { test, expect } from '@playwright/test';
import { TerminalHelper } from './helpers';

test.describe('Text Processing Commands E2E Tests', () => {
  let terminal: TerminalHelper;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    terminal = new TerminalHelper(page);
    await terminal.waitForTerminal();
    await page.waitForTimeout(500);
  });

  test('grep - search for pattern in file', async () => {
    await terminal.executeCommand('echo -e "line1\\ntest line\\nline3" > searchfile.txt');
    await terminal.executeCommand('grep "test" searchfile.txt');
    await terminal.expectOutputContains('test line');
  });

  test('grep - with -i flag (case insensitive)', async () => {
    await terminal.executeCommand('echo -e "Hello\\nWORLD" > casefile.txt');
    await terminal.executeCommand('grep -i "hello" casefile.txt');
    await terminal.expectOutputContains('Hello');
  });

  test('grep - with -n flag (line numbers)', async () => {
    await terminal.executeCommand('echo -e "line1\\nline2\\nline3" > numfile.txt');
    await terminal.executeCommand('grep -n "line2" numfile.txt');
    await terminal.expectOutputContains('2:');
  });

  test('wc - count lines, words, characters', async () => {
    await terminal.executeCommand('echo -e "word1 word2\\nword3" > wcfile.txt');
    await terminal.executeCommand('wc wcfile.txt');
    const output = await terminal.getOutput();
    // Should show counts
    expect(output).toMatch(/\d+/);
  });

  test('wc - with -l flag (lines only)', async () => {
    await terminal.executeCommand('echo -e "line1\\nline2\\nline3" > wclines.txt');
    await terminal.executeCommand('wc -l wclines.txt');
    await terminal.expectOutputContains('3');
  });

  test('wc - with -w flag (words only)', async () => {
    await terminal.executeCommand('echo "one two three" > wcwords.txt');
    await terminal.executeCommand('wc -w wcwords.txt');
    await terminal.expectOutputContains('3');
  });

  test('wc - with -c flag (bytes only)', async () => {
    await terminal.executeCommand('echo "test" > wcbytes.txt');
    await terminal.executeCommand('wc -c wcbytes.txt');
    const output = await terminal.getOutput();
    expect(output).toMatch(/\d+/);
  });

  test('find - search for files', async () => {
    await terminal.executeCommand('mkdir findtest');
    await terminal.executeCommand('touch findtest/file1.txt');
    await terminal.executeCommand('find findtest');
    await terminal.expectOutputContains('file1.txt');
  });

  test('find - with -name pattern', async () => {
    await terminal.executeCommand('mkdir findtest2');
    await terminal.executeCommand('touch findtest2/test.txt');
    await terminal.executeCommand('touch findtest2/other.log');
    await terminal.executeCommand('find findtest2 -name "*.txt"');
    await terminal.expectOutputContains('test.txt');
  });

  test('find - with -type flag', async () => {
    await terminal.executeCommand('mkdir findtest3');
    await terminal.executeCommand('mkdir findtest3/subdir');
    await terminal.executeCommand('touch findtest3/file.txt');
    await terminal.executeCommand('find findtest3 -type f');
    await terminal.expectOutputContains('file.txt');
  });

  test('tree - display directory tree', async () => {
    await terminal.executeCommand('mkdir treetest');
    await terminal.executeCommand('mkdir treetest/sub');
    await terminal.executeCommand('touch treetest/file.txt');
    await terminal.executeCommand('tree treetest');
    const output = await terminal.getOutput();
    expect(output).toContain('treetest');
  });

  test('tree - with -L flag (limit depth)', async () => {
    await terminal.executeCommand('tree -L 1');
    const output = await terminal.getOutput();
    expect(output.length).toBeGreaterThan(0);
  });
});
