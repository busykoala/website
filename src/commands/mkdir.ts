import {CommandArgs, CommandContext, CommandFn, group, user} from "../core/TerminalCore";

export const mkdir: CommandFn = {
    description: "Creates a new directory",
    usage: "mkdir <directory>",
    execute: (args: CommandArgs, context: CommandContext) => {
        const directoryName = args.positional[0];
        if (!directoryName) {
            return { output: "Error: No directory name specified.", statusCode: 1 };
        }

        const fileSystem = context.terminal.getFileSystem();

        // Resolve the full path of the new directory
        const fullPath = fileSystem.normalizePath(`${context.env.PWD}/${directoryName}`);
        const parentPath = fullPath.substring(0, fullPath.lastIndexOf("/"));
        const dirName = directoryName.split("/").pop()!;

        try {
            // Add the directory, ensuring permission checks
            fileSystem.addDirectory(
                parentPath,
                dirName,
                user,
                group,
                user,
                group,
                "rwxr-xr-x"
            );
            return { output: `Directory '${directoryName}' created successfully.`, statusCode: 0 };
        } catch (error) {
            return { output: `Error: ${(error as Error).message}`, statusCode: 1 };
        }
    },
};
