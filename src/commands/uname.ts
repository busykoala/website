import {CommandArgs, CommandFn} from "../core/TerminalCore";

export const uname: CommandFn = {
    description: "Displays system information",
    usage: "uname [-a]",
    execute: (args: CommandArgs, _) => {
        const all = args.flags.a === true;
        const info = {
            sysname: "BusykoalaOS",
            nodename: "busynode",
            release: "1.0",
            version: "Version 1.0",
            machine: "x42_42",
        };

        return {
            output: all
                ? `${info.sysname} ${info.nodename} ${info.release} ${info.version} ${info.machine}`
                : info.sysname,
            statusCode: 0,
        };
    },
};
