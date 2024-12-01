import {CommandArgs, CommandContext, CommandFn} from "../core/TerminalCore";

export const tail: CommandFn = {
    description: "Displays the last few lines of a file",
    usage: "tail <file>",
    execute: (args: CommandArgs, context: CommandContext) => {
        const filename = args.positional[0];
        if (!filename) {
            return { output: "Error: No file specified", statusCode: 1 };
        }

        const filePath = context.terminal.getFileSystem().normalizePath(
            `${context.env.PWD}/${filename}`
        );

        try {
            const file = context.terminal.getFileSystem().getNode(filePath);
            if (file?.type !== "file") {
                return { output: `Error: '${filename}' is not a file`, statusCode: 1 };
            }

            const lines = file.content?.split("\n") || [];
            return { output: lines.slice(-10).join("\n"), statusCode: 0 };
        } catch (error) {
            return { output: `Error: ${(error as Error).message}`, statusCode: 1 };
        }
    },
};
