import { CommandFn, CommandArgs, CommandContext } from "../core/TerminalCore";

export const echo: CommandFn = {
    description: "Prints the given text to the terminal",
    usage: "echo [text]",
    execute: (args: CommandArgs, context: CommandContext) => {
        const output = args.positional.join(" ");
        return { output, statusCode: 0 };
    },
};
