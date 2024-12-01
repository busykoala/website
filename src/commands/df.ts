import {CommandContext, CommandFn} from "../core/TerminalCore";

export const df: CommandFn = {
    description: "Displays disk space usage",
    usage: "df",
    execute: (_, context: CommandContext) => {
        return {
            output: `Filesystem&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Size&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Used&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Avail&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Use%&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Mounted on</br>mockfs&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;100M&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;50M&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;50M&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;50%&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/`,
            statusCode: 0,
        };
    },
};
