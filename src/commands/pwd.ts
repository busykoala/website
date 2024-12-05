import { CommandFn, CommandContext } from "../core/TerminalCore";

export const pwd: CommandFn = {
    description: "Prints the current working directory",
    usage: "pwd",
    execute: (_, context: CommandContext) => {
        // Simply return the current directory stored in the context's environment
        return { output: context.env.PWD, statusCode: 0 };
    },
};
