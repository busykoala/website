import {CommandArgs, CommandContext, CommandFn, group, user} from "../core/TerminalCore";

export const touch: CommandFn = {
    description: "Creates an empty file or updates the timestamp of an existing file",
    usage: "touch <filename>",
    execute: (args: CommandArgs, context: CommandContext) => {
        const filename = args.positional[0];
        if (!filename) {
            return { output: "Error: No filename provided.", statusCode: 1 };
        }

        const fileSystem = context.terminal.getFileSystem();
        const filePath = fileSystem.normalizePath(`${context.env.PWD}/${filename}`);

        try {
            const file = fileSystem.getNode(filePath, user, group);

            if (file) {
                if (file.type !== "file") {
                    return { output: `Error: '${filename}' is not a file.`, statusCode: 1 };
                }

                // Check write permissions to update the file's timestamp
                if (!fileSystem.hasPermission(file, "write", user, group)) {
                    return { output: `Error: Permission denied to update '${filename}'.`, statusCode: 1 };
                }

                // Update the modified timestamp
                file.modified = new Date();
            } else {
                // Check write permissions in the parent directory
                const parentPath = filePath.substring(0, filePath.lastIndexOf("/"));
                const parentDir = fileSystem.getNode(parentPath, user, group);

                if (!parentDir || parentDir.type !== "directory") {
                    return { output: `Error: Parent directory '${parentPath}' not found.`, statusCode: 1 };
                }

                if (!fileSystem.hasPermission(parentDir, "write", user, group)) {
                    return { output: `Error: Permission denied to create '${filename}'.`, statusCode: 1 };
                }

                // Create a new file
                fileSystem.addFile(
                    parentPath,
                    filename,
                    user,
                    group,
                    user,
                    group,
                    "",
                    "rw-r--r--"
                );
            }

            return { output: `Successfully updated or created '${filename}'.`, statusCode: 0 };
        } catch (error) {
            return { output: `Error: ${(error as Error).message}`, statusCode: 1 };
        }
    },
};
