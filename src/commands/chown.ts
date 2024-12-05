import {CommandArgs, CommandContext, CommandFn, group} from "../core/TerminalCore";
import {user} from "../core/TerminalCore"

export const chown: CommandFn = {
    description: "Changes file ownership",
    usage: "chown <user> <file>",
    execute: (args: CommandArgs, context: CommandContext) => {
        const userFromInput = args.positional[0];
        const filePath = args.positional[1];

        if (!userFromInput || !filePath) {
            return { output: "Error: User and file must be specified", statusCode: 1 };
        }

        const fullPath = context.terminal.getFileSystem().normalizePath(
            filePath.startsWith("/") ? filePath : `${context.env.PWD}/${filePath}`
        );

        try {
            const file = context.terminal.getFileSystem().getNode(fullPath, user, group);
            if (!file) {
                return { output: `Error: '${filePath}' not found`, statusCode: 1 };
            }

            file.owner = userFromInput;
            return { output: "", statusCode: 0 };
        } catch (error) {
            return { output: `Error: ${(error as Error).message}`, statusCode: 1 };
        }
    },
};
