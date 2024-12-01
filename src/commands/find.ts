import {CommandArgs, CommandContext, CommandFn} from "../core/TerminalCore";

export const find: CommandFn = {
    description: "Searches for files and directories",
    usage: "find <path> <name>",
    execute: (args: CommandArgs, context: CommandContext) => {
        const searchPath = args.positional[0] || context.env.PWD;
        const searchName = args.positional[1];

        if (!searchName) {
            return { output: "Error: Search name is required", statusCode: 1 };
        }

        try {
            const results = context.terminal.getFileSystem().findNodes(searchPath, searchName);
            return { output: results.join("\n"), statusCode: 0 };
        } catch (error) {
            return { output: `Error: ${(error as Error).message}`, statusCode: 1 };
        }
    },
};
