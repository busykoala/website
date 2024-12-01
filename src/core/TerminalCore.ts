import { parseInput } from "./CommandParser";
import { FileSystem } from "./filesystem";
import {aliases} from "../commands/alias";

export interface CommandContext {
    env: {
        PWD: string;
        HOME: string;
        EDITOR: string;
        PATH: string;
        SHELL: string;
        USER: string;
        COMMANDS: Record<string, string>;
        [key: string]: any;
    };
    version: string;
    history: string[];
    files: Record<string, string>;
    terminal: TerminalCore;
}

export interface CommandArgs {
    positional: string[];
    flags: Record<string, string | boolean>;
}

export interface CommandFn {
    description: string;
    usage?: string;
    execute: (args: CommandArgs, context: CommandContext) => { output: string; statusCode: number };
}

function addBaseFilesystem(fileSystem: FileSystem) {
    fileSystem.addDirectory("/", "home", "root", "root");
    fileSystem.addDirectory("/home", "busykoala", "busykoala", "busykoala");
    fileSystem.addFile("/home/busykoala", "README.txt", "Welcome to the mock filesystem!", "busykoala", "busykoala");
    fileSystem.addFile(
        "/home/busykoala",
        "multiline.txt",
        `This is line 1\nThis is line 2\nThis is line 3\nEnd of file.`
    );

}

export class TerminalCore {
    private commands: Record<string, CommandFn["execute"]> = {};
    private history: string[] = [];
    private historyIndex = 0;
    private context: CommandContext;
    private fileSystem: FileSystem;

    constructor(context: Omit<CommandContext, "terminal">) {
        this.fileSystem = new FileSystem();

        // Initialize context with the terminal reference
        this.context = {
            ...context,
            terminal: this,
        };

        addBaseFilesystem(this.fileSystem);
    }

    getFileSystem() {
        return this.fileSystem;
    }

    registerCommand(name: string, fn: CommandFn["execute"]): void {
        this.commands[name] = fn;
    }

    execute(input: string): { output: string; statusCode: number } {
        if (!input.trim()) return { output: "", statusCode: 0 };

        this.history.push(input);
        this.historyIndex = this.history.length;

        // Split the input into individual commands by pipe
        const commands = input.split("|").map((cmd) => cmd.trim());
        let currentOutput = "";
        let statusCode = 0;

        for (const [index, command] of commands.entries()) {
            // Handle piping by injecting the previous output as a special flag
            const isPiped = index > 0; // True if this command is after a pipe
            const result = this.executeCommand(command, isPiped ? currentOutput : "");
            currentOutput = result.output;
            statusCode = result.statusCode;

            if (statusCode !== 0) {
                // Stop execution if a command fails
                return { output: currentOutput, statusCode };
            }
        }

        return { output: currentOutput, statusCode };
    }

    private executeCommand(command: string, input: string): { output: string; statusCode: number } {
        const [commandName, ...args] = command.split(" ");

        // Check if the command is an alias and replace it with the original command
        const expandedCommand = aliases[commandName] || commandName;
        const commandFn = this.commands[expandedCommand];

        if (!commandFn) {
            return { output: `<br>Command '${expandedCommand}' not found.`, statusCode: 127 };
        }

        try {
            const parsedArgs = parseInput(args.join(" "));

            // Prepend the piped input as the first positional argument
            if (input) {
                parsedArgs.positional.unshift(input);
            }

            return commandFn(parsedArgs, this.context);
        } catch (error) {
            if (error instanceof Error) {
                return { output: `Error executing command '${expandedCommand}': ${error.message}`, statusCode: 1 };
            } else {
                return { output: `An unknown error occurred while executing '${expandedCommand}'.`, statusCode: 1 };
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
