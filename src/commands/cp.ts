import {CommandArgs, CommandContext, CommandFn, group, user} from "../core/TerminalCore";

export const cp: CommandFn = {
    description: "Copies a file",
    usage: "cp <source> <destination>",
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
        const destinationFileName = destination.split("/").pop()!;

        try {
            // Retrieve the source node
            const sourceNode = fileSystem.getNode(sourcePath, user, group);
            if (!sourceNode) {
                return { output: `Error: '${source}' not found.`, statusCode: 1 };
            }

            // Ensure the source is a file
            if (sourceNode.type !== "file") {
                return { output: "Error: Copying directories is not supported.", statusCode: 1 };
            }

            // Ensure write permissions on the destination directory
            const destinationParent = fileSystem.getNode(destinationDir, user, group);
            if (!destinationParent || destinationParent.type !== "directory") {
                return { output: `Error: Destination directory '${destinationDir}' not found.`, statusCode: 1 };
            }

            // Add the file to the destination
            fileSystem.addFile(
                destinationDir,
                destinationFileName,
                user,
                group,
                sourceNode.owner,
                sourceNode.group,
                sourceNode.content || "",
                sourceNode.permissions
            );

            return { output: `File '${source}' copied to '${destination}'.`, statusCode: 0 };
        } catch (error) {
            return { output: `Error: ${(error as Error).message}`, statusCode: 1 };
        }
    },
};
