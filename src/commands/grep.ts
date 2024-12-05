import {CommandArgs, CommandContext, CommandFn, user, group} from "../core/TerminalCore";
import {FileSystem} from "../core/filesystem";

export const grep: CommandFn = {
    description: "Searches for a pattern in a file",
    usage: "grep <pattern> <file>",
    execute: (args: CommandArgs, context: CommandContext) => {
        const pattern = args.positional[0];
        const filename = args.positional[1];

        if (!pattern || !filename) {
            return { output: "Error: Pattern and file are required.", statusCode: 1 };
        }

        const fileSystem = context.terminal.getFileSystem();
        const filePath = fileSystem.normalizePath(`${context.env.PWD}/${filename}`);

        try {
            // Retrieve the file node
            const file = fileSystem.getNode(filePath, user, group);
            if (!file) {
                return { output: `Error: '${filename}' not found.`, statusCode: 1 };
            }

            // Ensure the node is a file
            if (file.type !== "file") {
                return { output: `Error: '${filename}' is not a file.`, statusCode: 1 };
            }

            // Check read permissions
            if (!FileSystem.hasPermission(file, "read", user, group)) {
                return { output: `Error: Permission denied to read '${filename}'.`, statusCode: 1 };
            }

            // Search for the pattern
            const lines = file.content?.split("\n") || [];
            const matches = lines.filter((line) => line.includes(pattern));

            if (matches.length === 0) {
                return { output: `No matches found for '${pattern}' in '${filename}'.`, statusCode: 0 };
            }

            return { output: matches.join("\n"), statusCode: 0 };
        } catch (error) {
            return { output: `Error: ${(error as Error).message}`, statusCode: 1 };
        }
    },
};
