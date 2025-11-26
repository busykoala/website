import { test, expect } from '@playwright/test';
import { TerminalHelper } from './helpers';

test.describe('File System Commands E2E Tests', () => {
  let terminal: TerminalHelper;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    terminal = new TerminalHelper(page);
    await terminal.waitForTerminal();
    await page.waitForTimeout(500);
  });

  test('ls - list directory contents', async () => {
    await terminal.executeCommand('ls');
    const output = await terminal.getOutput();
    // Should show some files
    expect(output.length).toBeGreaterThan(0);
  });

  test('ls - with -l flag (long format)', async () => {
    await terminal.executeCommand('ls -l');
    await terminal.expectOutputContains('rw');
  });

  test('ls - with -a flag (show hidden)', async () => {
    await terminal.executeCommand('ls -a');
    const output = await terminal.getOutput();
    expect(output).toContain('.');
  });

  test('cd - change directory', async () => {
    await terminal.executeCommand('cd /');
    const dir = await terminal.getCurrentDirectory();
    expect(dir).toBe('/');
  });

  test('cd - with relative path', async () => {
    await terminal.executeCommand('cd ..');
    const dir = await terminal.getCurrentDirectory();
    expect(dir).toBe('/home');
  });

  test('mkdir - create directory', async () => {
    await terminal.executeCommand('mkdir testdir');
    await terminal.executeCommand('ls');
    await terminal.expectOutputContains('testdir');
  });

  test('mkdir - with -p flag (create parents)', async () => {
    await terminal.executeCommand('mkdir -p dir1/dir2/dir3');
    await terminal.executeCommand('ls dir1/dir2');
    await terminal.expectOutputContains('dir3');
  });

  test('touch - create file', async () => {
    await terminal.executeCommand('touch newfile.txt');
    await terminal.executeCommand('ls');
    await terminal.expectOutputContains('newfile.txt');
  });

  test('touch - multiple files', async () => {
    await terminal.executeCommand('touch file1.txt file2.txt');
    await terminal.executeCommand('ls');
    await terminal.expectOutputContains('file1.txt');
    await terminal.expectOutputContains('file2.txt');
  });

  test('cat - display file contents', async () => {
    await terminal.executeCommand('cat hello.sh');
    await terminal.expectOutputContains('Hello');
  });

  test('cat - with -n flag (number lines)', async () => {
    await terminal.executeCommand('cat -n hello.sh');
    const output = await terminal.getOutput();
    expect(output).toMatch(/\s+1\s/);
  });

  test('cat - concatenate multiple files', async () => {
    await terminal.executeCommand('echo "file1" > f1.txt');
    await terminal.executeCommand('echo "file2" > f2.txt');
    await terminal.executeCommand('cat f1.txt f2.txt');
    await terminal.expectOutputContains('file1');
    await terminal.expectOutputContains('file2');
  });

  test('head - show first lines of file', async () => {
    await terminal.executeCommand('head hello.sh');
    const output = await terminal.getOutput();
    expect(output.length).toBeGreaterThan(0);
  });

  test('head - with -n flag', async () => {
    await terminal.executeCommand('head -n 2 hello.sh');
    const output = await terminal.getOutput();
    const lines = output.trim().split('\n');
    // Should have limited output
    expect(lines.length).toBeLessThanOrEqual(5);
  });

  test('tail - show last lines of file', async () => {
    await terminal.executeCommand('tail hello.sh');
    const output = await terminal.getOutput();
    expect(output.length).toBeGreaterThan(0);
  });

  test('tail - with -n flag', async () => {
    await terminal.executeCommand('tail -n 2 hello.sh');
    const output = await terminal.getOutput();
    expect(output.length).toBeGreaterThan(0);
  });

  test('cp - copy file', async () => {
    await terminal.executeCommand('echo "test content" > original.txt');
    await terminal.executeCommand('cp original.txt copy.txt');
    await terminal.executeCommand('cat copy.txt');
    await terminal.expectOutputContains('test content');
  });

  test('cp - with -r flag (recursive)', async () => {
    await terminal.executeCommand('mkdir source');
    await terminal.executeCommand('echo "test" > source/file.txt');
    await terminal.executeCommand('cp -r source dest');
    await terminal.executeCommand('cat dest/file.txt');
    await terminal.expectOutputContains('test');
  });

  test('mv - move/rename file', async () => {
    await terminal.executeCommand('echo "content" > oldname.txt');
    await terminal.executeCommand('mv oldname.txt newname.txt');
    await terminal.executeCommand('ls');
    await terminal.expectOutputContains('newname.txt');
  });

  test('rm - remove file', async () => {
    await terminal.executeCommand('echo "delete me" > todelete.txt');
    await terminal.executeCommand('rm todelete.txt');
    await terminal.executeCommand('ls');
    const output = await terminal.getOutput();
    expect(output?.includes('todelete.txt') || false).toBe(false);
  });

  test('rm - with -r flag (recursive)', async () => {
    await terminal.executeCommand('mkdir dirtoremove');
    await terminal.executeCommand('echo "file" > dirtoremove/file.txt');
    await terminal.executeCommand('rm -r dirtoremove');
    await terminal.executeCommand('ls');
    const output = await terminal.getOutput();
    expect(output?.includes('dirtoremove') || false).toBe(false);
  });

  test('chmod - change file permissions', async () => {
    await terminal.executeCommand('echo "test" > permtest.txt');
    await terminal.executeCommand('chmod 644 permtest.txt');
    await terminal.executeCommand('ls -l permtest.txt');
    await terminal.expectOutputContains('rw-');
  });

  test('chmod - with symbolic mode', async () => {
    await terminal.executeCommand('echo "test" > permtest2.txt');
    await terminal.executeCommand('chmod +x permtest2.txt');
    await terminal.executeCommand('ls -l permtest2.txt');
    await terminal.expectOutputContains('x');
  });

  test('chown - change file owner', async () => {
    await terminal.executeCommand('echo "test" > owntest.txt');
    await terminal.executeCommand('chown root owntest.txt');
    // Just verify it doesn't error
    await terminal.executeCommand('ls -l owntest.txt');
  });
});
