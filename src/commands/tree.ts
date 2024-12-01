import { CommandArgs, CommandContext, CommandFn } from "../core/TerminalCore";

export const tree: CommandFn = {
    description: "Displays directory structure in a tree format",
    usage: "tree <path>",
    execute: (args: CommandArgs, context: CommandContext) => {
        const path = args.positional[0] || context.env.PWD;

        try {
            const treeOutput = context.terminal.getFileSystem().generateTree(path);
            return { output: `<div style="font-family: monospace;">${treeOutput}</div>`, statusCode: 0 };
        } catch (error) {
            return { output: `Error: ${(error as Error).message}`, statusCode: 1 };
        }
    },
};
