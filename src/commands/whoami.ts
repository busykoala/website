import {CommandContext, CommandFn} from "../core/TerminalCore";

export const whoami: CommandFn = {
    description: "Displays the current user",
    usage: "whoami",
    execute: (_, context: CommandContext) => {
        return { output: context.env.USER, statusCode: 0 };
    },
};
