import {CommandArgs, CommandContext, CommandFn} from "../core/TerminalCore";

export const touch: CommandFn = {
    description: "Creates an empty file or updates the timestamp of an existing file",
    usage: "touch <filename>",
    execute: (args: CommandArgs, context: CommandContext) => {
        const filename = args.positional[0];
        if (!filename) {
            return { output: "Error: No filename provided", statusCode: 1 };
        }

        const filePath = context.terminal.getFileSystem().normalizePath(
            `${context.env.PWD}/${filename}`
        );

        try {
            const file = context.terminal.getFileSystem().getNode(filePath);
            if (file) {
                file.modified = new Date(); // Update timestamp
            } else {
                context.terminal.getFileSystem().addFile(
                    context.env.PWD,
                    filename,
                    "",
                    context.env.USER
                );
            }
            return { output: "", statusCode: 0 };
        } catch (error) {
            return { output: `Error: ${(error as Error).message}`, statusCode: 1 };
        }
    },
};
