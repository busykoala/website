import {CommandArgs, CommandContext, CommandFn, group, user} from "../core/TerminalCore";

export const tail: CommandFn = {
    description: "Displays the last few lines of a file",
    usage: "tail <file>",
    execute: (args: CommandArgs, context: CommandContext) => {
        const filename = args.positional[0];
        if (!filename) {
            return { output: "Error: No file specified.", statusCode: 1 };
        }

        const fileSystem = context.terminal.getFileSystem();
        const filePath = fileSystem.normalizePath(`${context.env.PWD}/${filename}`);

        try {
            // Retrieve the file node
            const fileNode = fileSystem.getNode(filePath, user, group);
            if (!fileNode) {
                return { output: `Error: '${filename}' not found.`, statusCode: 1 };
            }

            // Ensure the target is a file
            if (fileNode.type !== "file") {
                return { output: `Error: '${filename}' is not a file.`, statusCode: 1 };
            }

            // Check read permissions
            if (!fileSystem.hasPermission(fileNode, "read", user, group)) {
                return { output: `Error: Permission denied to read '${filename}'.`, statusCode: 1 };
            }

            // Retrieve the last 10 lines of the file
            const lines = fileNode.content?.split("\n") || [];
            const output = lines.slice(-10).join("\n");

            return { output, statusCode: 0 };
        } catch (error) {
            return { output: `Error: ${(error as Error).message}`, statusCode: 1 };
        }
    },
};
