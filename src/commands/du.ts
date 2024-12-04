import {CommandArgs, CommandContext, CommandFn, group, user} from "../core/TerminalCore";

export const du: CommandFn = {
    description: "Estimates file space usage",
    usage: "du <file|directory>",
    execute: (args: CommandArgs, context: CommandContext) => {
        const filePath = args.positional[0] || context.env.PWD;
        const fileSystem = context.terminal.getFileSystem();

        try {
            const normalizedPath = fileSystem.normalizePath(filePath);

            // Retrieve the node
            const size = fileSystem.calculateSize(normalizedPath, user, group);

            return { output: `${size} ${filePath}`, statusCode: 0 };
        } catch (error) {
            return { output: `Error: ${(error as Error).message}`, statusCode: 1 };
        }
    },
};
