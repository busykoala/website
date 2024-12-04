import {CommandFn, CommandArgs, CommandContext, group, user} from "../core/TerminalCore";

export const cd: CommandFn = {
    description: "Changes the current working directory",
    usage: "cd <directory>",
    execute: (args: CommandArgs, context: CommandContext) => {
        const targetPath = args.positional[0];

        if (!targetPath) {
            // If no argument is provided, change to the home directory
            context.env.PWD = context.env.HOME;
            return { output: "", statusCode: 0 };
        }

        // Resolve the full path
        const fullPath = context.terminal.getFileSystem().normalizePath(
            targetPath.startsWith("/") ? targetPath : `${context.env.PWD}/${targetPath}`
        );

        try {
            const node = context.terminal.getFileSystem().getNode(fullPath, user, group);

            if (!node) {
                return { output: `Error: Directory '${targetPath}' not found.`, statusCode: 1 };
            }

            if (node.type !== "directory") {
                return { output: `Error: '${targetPath}' is not a directory.`, statusCode: 1 };
            }

            // Change the current working directory
            context.env.PWD = fullPath;
            return { output: "", statusCode: 0 };
        } catch (error) {
            return { output: `Error: ${(error as Error).message}`, statusCode: 1 };
        }
    },
};
