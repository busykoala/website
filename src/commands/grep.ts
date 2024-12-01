import {CommandArgs, CommandContext, CommandFn} from "../core/TerminalCore";

export const grep: CommandFn = {
    description: "Searches for a pattern in a file",
    usage: "grep <pattern> <file>",
    execute: (args: CommandArgs, context: CommandContext) => {
        const pattern = args.positional[0];
        const filename = args.positional[1];

        if (!pattern || !filename) {
            return { output: "Error: Pattern and file are required", statusCode: 1 };
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
            const matches = lines.filter((line) => line.includes(pattern));
            return { output: matches.join("\n"), statusCode: 0 };
        } catch (error) {
            return { output: `Error: ${(error as Error).message}`, statusCode: 1 };
        }
    },
};
