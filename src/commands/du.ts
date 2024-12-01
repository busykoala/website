import {CommandArgs, CommandContext, CommandFn} from "../core/TerminalCore";

export const du: CommandFn = {
    description: "Estimates file space usage",
    usage: "du <file>",
    execute: (args: CommandArgs, context: CommandContext) => {
        const filePath = args.positional[0] || context.env.PWD;

        try {
            const size = context.terminal.getFileSystem().calculateSize(filePath);
            return { output: `${size} ${filePath}`, statusCode: 0 };
        } catch (error) {
            return { output: `Error: ${(error as Error).message}`, statusCode: 1 };
        }
    },
};
