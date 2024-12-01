import {CommandArgs, CommandContext, CommandFn} from "../core/TerminalCore";

export const mkdir: CommandFn = {
    description: "Creates a new directory",
    usage: "mkdir <directory>",
    execute: (args: CommandArgs, context: CommandContext) => {
        const directoryName = args.positional[0];
        if (!directoryName) {
            return { output: "Error: No directory name specified", statusCode: 1 };
        }

        const fullPath = context.terminal.getFileSystem().normalizePath(
            `${context.env.PWD}/${directoryName}`
        );

        try {
            context.terminal.getFileSystem().addDirectory(
                fullPath.substring(0, fullPath.lastIndexOf("/")),
                directoryName,
                context.env.USER
            );
            return { output: "", statusCode: 0 };
        } catch (error) {
            return { output: `Error: ${(error as Error).message}`, statusCode: 1 };
        }
    },
};
