import {CommandArgs, CommandContext, CommandFn} from "../core/TerminalCore";

export const rm: CommandFn = {
    description: "Removes files or directories",
    usage: "rm <file>",
    execute: (args: CommandArgs, context: CommandContext) => {
        const target = args.positional[0];
        if (!target) {
            return { output: "Error: No target specified", statusCode: 1 };
        }

        const filePath = context.terminal.getFileSystem().normalizePath(
            `${context.env.PWD}/${target}`
        );

        try {
            context.terminal.getFileSystem().removeNode(filePath);
            return { output: "", statusCode: 0 };
        } catch (error) {
            return { output: `Error: ${(error as Error).message}`, statusCode: 1 };
        }
    },
};
