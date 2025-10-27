import { test } from '@playwright/test';
import { TerminalHelper } from './helpers';

test.describe('User Scripts E2E Tests', () => {
  let terminal: TerminalHelper;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    terminal = new TerminalHelper(page);
    await terminal.waitForTerminal();
    await page.waitForTimeout(500);
  });

  test('create and execute simple shell script', async () => {
    // Create a simple script
    await terminal.executeCommand(
      'cat > myscript.sh << EOF\n#!/bin/sh\necho "Script executed successfully"\nEOF',
    );
    await terminal.executeCommand('chmod +x myscript.sh');
    await terminal.executeCommand('./myscript.sh');
    await terminal.expectOutputContains('Script executed successfully');
  });

  test('execute pre-seeded hello.sh script', async () => {
    // The filesystem comes with hello.sh pre-seeded
    await terminal.executeCommand('./hello.sh');
    await terminal.expectOutputContains('Hello');
  });

  test('execute pre-seeded greet.sh with arguments', async () => {
    // greet.sh accepts positional arguments
    await terminal.executeCommand('./greet.sh World');
    await terminal.expectOutputContains('Hello, World');
  });

  test('execute pre-seeded count.sh script', async () => {
    // count.sh should count from 1 to 3
    await terminal.executeCommand('./count.sh');
    await terminal.expectOutputContains('1');
    await terminal.expectOutputContains('2');
    await terminal.expectOutputContains('3');
  });

  test('create script using multiple commands', async () => {
    // Create a more complex script that uses multiple commands
    await terminal.executeCommand(
      'cat > complex.sh << "EOF"\n#!/bin/sh\necho "Starting script..."\nmkdir -p test_output\ndate > test_output/timestamp.txt\ncat test_output/timestamp.txt\necho "Script completed"\nEOF',
    );
    await terminal.executeCommand('chmod +x complex.sh');
    await terminal.executeCommand('./complex.sh');
    await terminal.expectOutputContains('Starting script...');
    await terminal.expectOutputContains('Script completed');
  });

  test('create script with grep and find', async () => {
    // Create a script that uses text processing commands
    await terminal.executeCommand(
      'cat > search_script.sh << "EOF"\n#!/bin/sh\necho "Creating test files..."\necho "hello world" > file1.txt\necho "goodbye world" > file2.txt\necho "Searching for world:"\ngrep "world" file1.txt file2.txt\nEOF',
    );
    await terminal.executeCommand('chmod +x search_script.sh');
    await terminal.executeCommand('./search_script.sh');
    await terminal.expectOutputContains('hello world');
    await terminal.expectOutputContains('goodbye world');
  });

  test('create script with environment variables', async () => {
    // Create a script that uses environment variables
    await terminal.executeCommand(
      'cat > env_script.sh << "EOF"\n#!/bin/sh\nexport MY_VAR="test_value"\necho "Variable set: $MY_VAR"\necho "Current user: $USER"\necho "Home directory: $HOME"\nEOF',
    );
    await terminal.executeCommand('chmod +x env_script.sh');
    await terminal.executeCommand('./env_script.sh');
    await terminal.expectOutputContains('Variable set: test_value');
    await terminal.expectOutputContains('Current user: busykoala');
    await terminal.expectOutputContains('Home directory: /home/busykoala');
  });

  test('create script with file operations', async () => {
    // Create a script that creates, modifies, and removes files
    await terminal.executeCommand(
      'cat > file_ops.sh << "EOF"\n#!/bin/sh\necho "Creating directory structure..."\nmkdir -p test_dir/subdir\ntouch test_dir/file1.txt\ntouch test_dir/subdir/file2.txt\necho "Directory tree:"\ntree test_dir\necho "Cleaning up..."\nrm -r test_dir\necho "Done"\nEOF',
    );
    await terminal.executeCommand('chmod +x file_ops.sh');
    await terminal.executeCommand('./file_ops.sh');
    await terminal.expectOutputContains('Creating directory structure...');
    await terminal.expectOutputContains('Done');
  });

  test('create script with command piping', async () => {
    // Create a script that demonstrates piping
    await terminal.executeCommand(
      'cat > pipe_script.sh << "EOF"\n#!/bin/sh\necho "Line 1\nLine 2\nLine 3\nLine 4\nLine 5" > numbers.txt\necho "First 3 lines:"\nhead -n 3 numbers.txt\necho "Last 2 lines:"\ntail -n 2 numbers.txt\nEOF',
    );
    await terminal.executeCommand('chmod +x pipe_script.sh');
    await terminal.executeCommand('./pipe_script.sh');
    await terminal.expectOutputContains('First 3 lines:');
    await terminal.expectOutputContains('Last 2 lines:');
  });

  test('verify script output with redirection', async () => {
    // Create a script that redirects output to a file
    await terminal.executeCommand(
      'cat > redirect_script.sh << "EOF"\n#!/bin/sh\necho "Writing to file..."\ndate > output.txt\necho "Current directory:" >> output.txt\npwd >> output.txt\necho "File contents:"\ncat output.txt\nEOF',
    );
    await terminal.executeCommand('chmod +x redirect_script.sh');
    await terminal.executeCommand('./redirect_script.sh');
    await terminal.expectOutputContains('Writing to file...');
    await terminal.expectOutputContains('File contents:');
    await terminal.expectOutputContains('/home/busykoala');
  });
});
