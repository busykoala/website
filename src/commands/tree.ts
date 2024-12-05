import {CommandArgs, CommandContext, CommandFn, group, user} from "../core/TerminalCore";
import { FileSystem} from "../core/filesystem";

export const tree: CommandFn = {
    description: "Displays directory structure in a tree format",
    usage: "tree <path>",
    execute: (args: CommandArgs, context: CommandContext) => {
        const path = args.positional[0] || context.env.PWD;

        const fileSystem = context.terminal.getFileSystem();

        try {
            const normalizedPath = fileSystem.normalizePath(path);

            // Check read and execute permissions for the target directory
            const node = fileSystem.getNode(normalizedPath, user, group);
            if (!node) {
                return { output: `Error: Path '${path}' not found.`, statusCode: 1 };
            }

            if (node.type !== "directory") {
                return { output: `Error: '${path}' is not a directory.`, statusCode: 1 };
            }

            if (!FileSystem.hasPermission(node, "read", user, group) || !FileSystem.hasPermission(node, "execute", user, group)) {
                return { output: `Error: Permission denied to access '${path}'.`, statusCode: 1 };
            }

            // Generate the tree structure
            const treeOutput = fileSystem.generateTree(normalizedPath, user, group);
            return { output: `<div style="font-family: monospace;">${treeOutput}</div>`, statusCode: 0 };
        } catch (error) {
            return { output: `Error: ${(error as Error).message}`, statusCode: 1 };
        }
    },
};
