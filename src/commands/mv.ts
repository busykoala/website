import {CommandArgs, CommandContext, CommandFn} from "../core/TerminalCore";

export const mv: CommandFn = {
    description: "Moves or renames a file or directory",
    usage: "mv <source> <destination>",
    execute: (args: CommandArgs, context: CommandContext) => {
        const source = args.positional[0];
        const destination = args.positional[1];

        if (!source || !destination) {
            return { output: "Error: Source and destination are required", statusCode: 1 };
        }

        const sourcePath = context.terminal.getFileSystem().normalizePath(
            `${context.env.PWD}/${source}`
        );
        const destinationPath = context.terminal.getFileSystem().normalizePath(
            `${context.env.PWD}/${destination}`
        );

        try {
            const node = context.terminal.getFileSystem().getNode(sourcePath);
            if (!node) {
                return { output: `Error: '${source}' not found`, statusCode: 1 };
            }

            context.terminal.getFileSystem().removeNode(sourcePath);
            if (node.type === "file") {
                context.terminal.getFileSystem().addFile(
                    destinationPath.substring(0, destinationPath.lastIndexOf("/")),
                    destination.split("/").pop()!,
                    node.content || "",
                    node.owner,
                    node.permissions
                );
            } else {
                context.terminal.getFileSystem().addDirectory(
                    destinationPath.substring(0, destinationPath.lastIndexOf("/")),
                    destination.split("/").pop()!,
                    node.owner,
                    node.permissions
                );
            }

            return { output: "", statusCode: 0 };
        } catch (error) {
            return { output: `Error: ${(error as Error).message}`, statusCode: 1 };
        }
    },
};
