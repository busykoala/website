import { test, expect } from '@playwright/test';
import { TerminalHelper } from './helpers';

test.describe('Fun Commands E2E Tests', () => {
  let terminal: TerminalHelper;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    terminal = new TerminalHelper(page);
    await terminal.waitForTerminal();
    await page.waitForTimeout(500);
  });

  test('cowsay - display cow saying text', async () => {
    await terminal.executeCommand('cowsay "Hello"');
    const output = await terminal.getOutput();
    expect(output).toContain('Hello');
    // Cowsay should have some ASCII art
    expect(output.length).toBeGreaterThan(20);
  });

  test('cowsay - with -e flag (eyes)', async () => {
    await terminal.executeCommand('cowsay -e XX "Test"');
    const output = await terminal.getOutput();
    expect(output).toContain('Test');
  });

  test('cowsay - with -T flag (tongue)', async () => {
    await terminal.executeCommand('cowsay -T U "Moo"');
    const output = await terminal.getOutput();
    expect(output).toContain('Moo');
  });

  test('fortune - display random fortune', async () => {
    await terminal.executeCommand('fortune');
    const output = await terminal.getOutput();
    // Should have some content
    expect(output.length).toBeGreaterThan(5);
  });

  test('sl - steam locomotive animation', async ({ page }) => {
    // sl creates an overlay animation
    await terminal.executeCommand('sl');
    // Wait for animation overlay to appear
    await page.waitForTimeout(500);
    // Check for the overlay element
    const overlay = page.locator('.sl-overlay');
    await expect(overlay).toBeVisible();
    // Wait for animation to complete (it should auto-remove)
    await page.waitForTimeout(1500);
  });

  test('cmatrix - matrix animation (with quick exit)', async ({ page }) => {
    // cmatrix starts an animation
    await terminal.executeCommand('cmatrix');
    await page.waitForTimeout(500);
    // The animation should be running
    const output = await terminal.getOutput();
    expect(output.length).toBeGreaterThan(0);
    // Note: In real usage, cmatrix would continue until Ctrl+C
  });
});
