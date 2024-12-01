import { parseInput } from "./CommandParser";

export interface CommandContext {
    env: {
        PWD: string;         // Current working directory
        HOME: string;        // Home directory
        EDITOR: string;      // Default editor
        PATH: string;        // PATH variable
        SHELL: string;       // Shell type
        USER: string;        // User name
        COMMANDS: Record<string, string>; // Registered command descriptions
        [key: string]: any;  // Allow additional environment variables
    };
    version: string;       // Shell version
    history: string[];     // Command history
    files: Record<string, string>; // Simulated file system
}

export interface CommandArgs {
    positional: string[];  // Positional arguments like file paths
    flags: Record<string, string | boolean>; // Parsed flags, boolean or with values
}

export interface CommandFn {
    description: string; // Description of the command
    usage?: string;      // Optional usage information
    execute: (args: CommandArgs, context: CommandContext) => { output: string; statusCode: number };
}

export class TerminalCore {
    private commands: Record<string, CommandFn['execute']> = {};
    private history: string[] = [];
    private historyIndex = 0;
    private context: CommandContext;

    constructor(context: CommandContext) {
        this.context = context;
    }

    registerCommand(name: string, fn: CommandFn['execute']): void {
        this.commands[name] = fn;
    }

    execute(input: string): { output: string; statusCode: number } {
        if (!input.trim()) return { output: "", statusCode: 0 };

        this.history.push(input);
        this.historyIndex = this.history.length;

        const [commandName, ...args] = input.split(" ");
        const commandFn = this.commands[commandName];

        if (!commandFn) {
            return { output: `<br>Command '${commandName}' not found.`, statusCode: 127 };
        }

        try {
            const parsedArgs = parseInput(args.join(" "));
            return commandFn(parsedArgs, this.context);
        } catch (error) {
            if (error instanceof Error) {
                return { output: `Error executing command '${commandName}': ${error.message}`, statusCode: 1 };
            } else {
                return { output: `An unknown error occurred while executing '${commandName}'.`, statusCode: 1 };
            }
        }
    }

    navigateHistory(direction: "up" | "down"): string {
        if (direction === "up" && this.historyIndex > 0) this.historyIndex--;
        if (direction === "down" && this.historyIndex < this.history.length - 1) this.historyIndex++;
        return this.history[this.historyIndex] || "";
    }

    tabComplete(input: string): string {
        const [commandName] = input.split(" ");
        const matches = Object.keys(this.commands).filter((cmd) => cmd.startsWith(commandName));
        return matches.length === 1 ? matches[0] : input;
    }

    getContext(): CommandContext {
        return this.context;
    }
}
