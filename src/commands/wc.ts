import {CommandArgs, CommandContext, CommandFn} from "../core/TerminalCore";

export const wc: CommandFn = {
    description: "Counts lines, words, and characters in a file",
    usage: "wc <file>",
    execute: (args: CommandArgs, context: CommandContext) => {
        const filePath = args.positional[0];
        if (!filePath) {
            return { output: "Error: No file specified", statusCode: 1 };
        }

        const fullPath = context.terminal.getFileSystem().normalizePath(
            filePath.startsWith("/") ? filePath : `${context.env.PWD}/${filePath}`
        );

        try {
            const file = context.terminal.getFileSystem().getNode(fullPath);
            if (!file || file.type !== "file") {
                return { output: `Error: '${filePath}' is not a valid file`, statusCode: 1 };
            }

            const content = file.content || "";
            const lines = content.split("\n").length;
            const words = content.split(/\s+/).filter(Boolean).length;
            const characters = content.length;

            return { output: `${lines} ${words} ${characters} ${filePath}`, statusCode: 0 };
        } catch (error) {
            return { output: `Error: ${(error as Error).message}`, statusCode: 1 };
        }
    },
};
