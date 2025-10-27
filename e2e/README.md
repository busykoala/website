# E2E Tests with Playwright

This directory contains end-to-end tests for the busykoala.io terminal website using Playwright.

## Test Suites

The E2E tests are organized into 6 comprehensive test suites covering all 35 commands:

### 1. basic-commands.spec.ts (17 tests)

Tests for basic system and information commands:

- `echo` - with -n, -e flags
- `pwd` - print working directory
- `whoami` - current user
- `hostname` - system hostname
- `id` - with -u flag
- `date` - with custom format
- `uname` - with -a flag
- `clear` - clear terminal
- `help` - with specific command
- `history` - command history

### 2. filesystem-commands.spec.ts (26 tests)

Tests for file system operations:

- `ls` - with -l, -a flags
- `cd` - with relative paths
- `mkdir` - with -p flag
- `touch` - multiple files
- `cat` - with -n flag, multiple files
- `head` - with -n flag
- `tail` - with -n flag
- `cp` - with -r flag
- `mv` - move/rename
- `rm` - with -r flag
- `chmod` - numeric and symbolic modes
- `chown` - change ownership

### 3. text-processing.spec.ts (13 tests)

Tests for text processing commands:

- `grep` - with -i, -n flags
- `wc` - with -l, -w, -c flags
- `find` - with -name, -type flags
- `tree` - with -L flag

### 4. system-info.spec.ts (9 tests)

Tests for system information and environment:

- `df` - with -h flag
- `du` - with -h, -s flags
- `env` - list environment variables
- `export` - set variables
- `unset` - remove variables

### 5. fun-commands.spec.ts (6 tests)

Tests for fun/entertainment commands:

- `cowsay` - with -e, -T flags
- `fortune` - random fortunes
- `sl` - steam locomotive animation
- `cmatrix` - matrix animation

### 6. user-scripts.spec.ts (10 tests)

Tests for user script creation and execution:

- Creating and executing simple scripts
- Pre-seeded scripts (hello.sh, greet.sh, count.sh)
- Complex scripts with multiple commands
- Scripts using grep and find
- Scripts with environment variables
- Scripts with file operations
- Scripts with command piping
- Scripts with output redirection

## Running Tests

### Prerequisites

- Node.js and Yarn installed
- System Chromium browser installed (or configure Playwright to use another browser)

### Run all E2E tests

```bash
yarn test:e2e
```

### Run with UI mode

```bash
yarn test:e2e:ui
```

### Run in headed mode (see browser)

```bash
yarn test:e2e:headed
```

### Run specific test file

```bash
yarn test:e2e basic-commands.spec.ts
```

### Run tests matching a pattern

```bash
yarn test:e2e --grep "echo"
```

### Debug mode

```bash
yarn test:e2e:debug
```

## Configuration

The Playwright configuration is in `playwright.config.ts` at the project root.

Key settings:

- **Base URL**: http://127.0.0.1:5173
- **Browser**: System Chromium with --no-sandbox flag
- **Web Server**: Automatically starts Vite dev server before tests
- **Timeout**: 120 seconds for server startup
- **Action Timeout**: 10 seconds per action

## Test Helper

The `helpers.ts` file provides a `TerminalHelper` class with utilities for:

- Waiting for terminal to be ready
- Executing commands
- Reading output
- Clearing output
- Checking output content
- Getting current directory

## Notes

- Tests use system Chromium with `--no-sandbox` and `--disable-setuid-sandbox` flags for compatibility
- The dev server automatically starts on port 5173 when running tests
- Each test suite uses `beforeEach` to initialize a fresh terminal state
- Tests interact with the web-based terminal through the DOM

## Coverage

Total: **81 E2E tests** covering:

- All 35 commands listed in the issue
- Various flags and arguments for each command
- User script creation and execution
- Output verification

## Troubleshooting

If tests fail to run:

1. **Port already in use**: Kill any running Vite processes

   ```bash
   pkill -f vite
   ```

2. **Chromium issues**: Verify system Chromium is installed

   ```bash
   /usr/bin/chromium --version
   ```

3. **Timeout issues**: Increase timeout in `playwright.config.ts`

4. **Permission issues**: Ensure Chromium can run with --no-sandbox
