import { CommandFn, CommandArgs, CommandContext } from "../core/TerminalCore";

export const cat: CommandFn = {
    description: "Displays file content",
    usage: "cat <file>",
    execute: (args: CommandArgs, context: CommandContext) => {
        const filePath = args.positional[0]; // Take the first positional argument

        if (!filePath) {
            return { output: "Error: No file specified", statusCode: 1 };
        }

        // Resolve the full path using the normalized path
        const fullPath = context.terminal.getFileSystem().normalizePath(
            filePath.startsWith("/") ? filePath : `${context.env.PWD}/${filePath}`
        );

        try {
            const file = context.terminal.getFileSystem().getNode(fullPath);

            if (!file) {
                return { output: `Error: '${fullPath}' does not exist`, statusCode: 1 };
            }

            if (file.type === "file") {
                return { output: file.content || "", statusCode: 0 };
            } else {
                return { output: `Error: '${fullPath}' is not a file`, statusCode: 1 };
            }
        } catch (error) {
            return { output: `Error: ${(error as Error).message}`, statusCode: 1 };
        }
    },
};
