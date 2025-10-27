/**
 * InterpreterRegistry - Handles execution of scripts with shebang interpreters
 */

import type { CommandContext } from './TerminalCore';
import type { IOStreams } from './streams';
import { FileSystem } from './filesystem';
import { ExitCode } from '../utils/errorMessages';
import { shellInterpreter as shInterpreter } from './interpreters/shellInterpreter';
import { nodeInterpreter as jsInterpreter } from './interpreters/nodeInterpreter';

export type InterpreterFunction = (
  scriptPath: string,
  args: string[],
  context: CommandContext,
  io: IOStreams,
  fs: FileSystem,
) => Promise<number>;

export class InterpreterRegistry {
  private interpreters: Map<string, InterpreterFunction>;

  constructor() {
    this.interpreters = new Map();
    this.registerDefaultInterpreters();
  }

  /** Register an interpreter */
  register(name: string, handler: InterpreterFunction): void {
    this.interpreters.set(name, handler);
  }

  /** Execute a script with the appropriate interpreter */
  async execute(
    interpreter: string,
    scriptPath: string,
    args: string[],
    context: CommandContext,
    io: IOStreams,
    fs: FileSystem,
  ): Promise<number> {
    const handler = this.interpreters.get(interpreter);
    if (!handler) {
      io.stderr.write(`Interpreter not found: ${interpreter}\n`);
      return ExitCode.NOT_FOUND;
    }

    try {
      return await handler(scriptPath, args, context, io, fs);
    } catch (error) {
      io.stderr.write(`Script execution failed: ${error}\n`);
      return ExitCode.GENERAL_ERROR;
    }
  }

  /** Register default interpreters */
  private registerDefaultInterpreters(): void {
    // Shell interpreter (#!/bin/sh)
    this.register('sh', shInterpreter);
    this.register('/bin/sh', shInterpreter);
    this.register('/usr/bin/sh', shInterpreter);

    // Node.js interpreter (#!/usr/bin/env node)
    this.register('node', jsInterpreter);
    this.register('/usr/bin/node', jsInterpreter);
  }
}
