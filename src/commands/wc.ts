import {CommandArgs, CommandContext, CommandFn, group, user} from "../core/TerminalCore";

export const wc: CommandFn = {
    description: "Counts lines, words, and characters in a file",
    usage: "wc <file>",
    execute: (args: CommandArgs, context: CommandContext) => {
        const filePath = args.positional[0];
        if (!filePath) {
            return { output: "Error: No file specified.", statusCode: 1 };
        }

        const fileSystem = context.terminal.getFileSystem();

        const fullPath = fileSystem.normalizePath(
            filePath.startsWith("/") ? filePath : `${context.env.PWD}/${filePath}`
        );

        try {
            // Retrieve the file node
            const file = fileSystem.getNode(fullPath, user, group);
            if (!file || file.type !== "file") {
                return { output: `Error: '${filePath}' is not a valid file.`, statusCode: 1 };
            }

            // Check read permissions
            if (!fileSystem.hasPermission(file, "read", user, group)) {
                return { output: `Error: Permission denied to read '${filePath}'.`, statusCode: 1 };
            }

            // Calculate lines, words, and characters
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
