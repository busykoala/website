import {CommandArgs, CommandContext, CommandFn} from "../core/TerminalCore";

export const chmod: CommandFn = {
    description: "Changes file permissions",
    usage: "chmod <permissions> <file>",
    execute: (args: CommandArgs, context: CommandContext) => {
        const permissions = args.positional[0];
        const filename = args.positional[1];

        if (!permissions || !filename) {
            return { output: "Error: Permissions and file are required", statusCode: 1 };
        }

        const filePath = context.terminal.getFileSystem().normalizePath(
            `${context.env.PWD}/${filename}`
        );

        try {
            const file = context.terminal.getFileSystem().getNode(filePath);
            if (!file) {
                return { output: `Error: '${filename}' not found`, statusCode: 1 };
            }

            file.permissions = permissions;
            return { output: "", statusCode: 0 };
        } catch (error) {
            return { output: `Error: ${(error as Error).message}`, statusCode: 1 };
        }
    },
};
