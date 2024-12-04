import {CommandArgs, CommandContext, CommandFn, group, user} from "../core/TerminalCore";

export const find: CommandFn = {
    description: "Searches for files and directories",
    usage: "find <path> <name>",
    execute: (args: CommandArgs, context: CommandContext) => {
        const searchPath = args.positional[0] || context.env.PWD;
        const searchName = args.positional[1];

        if (!searchName) {
            return { output: "Error: Search name is required.", statusCode: 1 };
        }

        const fileSystem = context.terminal.getFileSystem();

        try {
            const normalizedPath = fileSystem.normalizePath(searchPath);

            // Check if the search path exists and is accessible
            const node = fileSystem.getNode(normalizedPath, user, group);
            if (!node) {
                return { output: `Error: Path '${searchPath}' not found.`, statusCode: 1 };
            }

            if (node.type !== "directory") {
                return { output: `Error: '${searchPath}' is not a directory.`, statusCode: 1 };
            }

            if (!fileSystem.hasPermission(node, "read", user, group) || !fileSystem.hasPermission(node, "execute", user, group)) {
                return { output: `Error: Permission denied to access '${searchPath}'.`, statusCode: 1 };
            }

            // Perform the search
            const results = fileSystem.findNodes(normalizedPath, searchName, user, group);
            if (results.length === 0) {
                return { output: `No matches found for '${searchName}' in '${searchPath}'.`, statusCode: 0 };
            }

            return { output: results.join("\n"), statusCode: 0 };
        } catch (error) {
            return { output: `Error: ${(error as Error).message}`, statusCode: 1 };
        }
    },
};
