import {CommandArgs, CommandContext, CommandFn, group, user} from "../core/TerminalCore";

export const mv: CommandFn = {
    description: "Moves or renames a file or directory",
    usage: "mv <source> <destination>",
    execute: (args: CommandArgs, context: CommandContext) => {
        const source = args.positional[0];
        const destination = args.positional[1];

        if (!source || !destination) {
            return { output: "Error: Source and destination are required.", statusCode: 1 };
        }

        const fileSystem = context.terminal.getFileSystem();
        const sourcePath = fileSystem.normalizePath(`${context.env.PWD}/${source}`);
        const destinationPath = fileSystem.normalizePath(`${context.env.PWD}/${destination}`);
        const destinationDir = destinationPath.substring(0, destinationPath.lastIndexOf("/"));
        const destinationName = destination.split("/").pop()!;

        try {
            // Retrieve the source node
            const sourceNode = fileSystem.getNode(sourcePath, user, group);
            if (!sourceNode) {
                return { output: `Error: '${source}' not found.`, statusCode: 1 };
            }

            // Ensure the user has permission to remove the source node
            if (!fileSystem.hasPermission(sourceNode, "write", user, group)) {
                return { output: `Error: Permission denied to move '${source}'.`, statusCode: 1 };
            }

            // Ensure the destination directory exists and is writable
            const destinationParent = fileSystem.getNode(destinationDir, user, group);
            if (!destinationParent || destinationParent.type !== "directory") {
                return { output: `Error: Destination directory '${destinationDir}' not found.`, statusCode: 1 };
            }
            if (!fileSystem.hasPermission(destinationParent, "write", user, group)) {
                return { output: `Error: Permission denied to write in '${destinationDir}'.`, statusCode: 1 };
            }

            // Remove the source node
            fileSystem.removeNode(sourcePath, user, group);

            // Add the node to the destination
            if (sourceNode.type === "file") {
                fileSystem.addFile(
                    destinationDir,
                    destinationName,
                    user,
                    group,
                    sourceNode.owner,
                    sourceNode.group,
                    sourceNode.content || "",
                    sourceNode.permissions
                );
            } else {
                fileSystem.addDirectory(
                    destinationDir,
                    destinationName,
                    user,
                    group,
                    sourceNode.owner,
                    sourceNode.group,
                    sourceNode.permissions
                );
            }

            return { output: `Successfully moved '${source}' to '${destination}'.`, statusCode: 0 };
        } catch (error) {
            return { output: `Error: ${(error as Error).message}`, statusCode: 1 };
        }
    },
};
