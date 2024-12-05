import {CommandArgs, CommandContext, CommandFn, group, user} from "../core/TerminalCore";
import {FileSystem} from "../core/filesystem";

export const head: CommandFn = {
    description: "Displays the first few lines of a file",
    usage: "head <file>",
    execute: (args: CommandArgs, context: CommandContext) => {
        const filename = args.positional[0];
        if (!filename) {
            return { output: "Error: No file specified.", statusCode: 1 };
        }

        const fileSystem = context.terminal.getFileSystem();

        const filePath = fileSystem.normalizePath(`${context.env.PWD}/${filename}`);

        try {
            // Retrieve the file node
            const file = fileSystem.getNode(filePath, user, group);
            if (!file) {
                return { output: `Error: '${filename}' not found.`, statusCode: 1 };
            }

            // Check if the node is a file
            if (file.type !== "file") {
                return { output: `Error: '${filename}' is not a file.`, statusCode: 1 };
            }

            // Check read permissions
            if (!FileSystem.hasPermission(file, "read", user, group)) {
                return { output: `Error: Permission denied to read '${filename}'.`, statusCode: 1 };
            }

            // Extract the first 10 lines of the file
            const lines = file.content?.split("\n") || [];
            const output = lines.slice(0, 10).join("\n");

            return { output, statusCode: 0 };
        } catch (error) {
            return { output: `Error: ${(error as Error).message}`, statusCode: 1 };
        }
    },
};
