import {CommandArgs, CommandContext, CommandFn} from "../core/TerminalCore";

export const chown: CommandFn = {
    description: "Changes file ownership",
    usage: "chown <user> <file>",
    execute: (args: CommandArgs, context: CommandContext) => {
        const user = args.positional[0];
        const filePath = args.positional[1];

        if (!user || !filePath) {
            return { output: "Error: User and file must be specified", statusCode: 1 };
        }

        const fullPath = context.terminal.getFileSystem().normalizePath(
            filePath.startsWith("/") ? filePath : `${context.env.PWD}/${filePath}`
        );

        try {
            const file = context.terminal.getFileSystem().getNode(fullPath);
            if (!file) {
                return { output: `Error: '${filePath}' not found`, statusCode: 1 };
            }

            file.owner = user;
            return { output: "", statusCode: 0 };
        } catch (error) {
            return { output: `Error: ${(error as Error).message}`, statusCode: 1 };
        }
    },
};
