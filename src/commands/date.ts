import {CommandFn} from "../core/TerminalCore";

export const date: CommandFn = {
    description: "Displays the current date and time",
    usage: "date",
    execute: (_, __) => {
        const now = new Date();
        return { output: now.toString(), statusCode: 0 };
    },
};
