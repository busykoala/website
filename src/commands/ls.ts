import { CommandFn, CommandArgs, CommandContext } from "../core/TerminalCore";

export const ls: CommandFn = {
    description: "Lists directory contents",
    usage: "ls [-l] [-a] [path]",
    execute: (args: CommandArgs, context: CommandContext) => {
        const path = args.positional[0] || context.env.PWD; // Use the first positional argument or PWD
        const showLong = args.flags.l === true;
        const showHidden = args.flags.a === true;

        try {
            const contents = context.terminal.getFileSystem().listDirectory(path, {
                longFormat: showLong,
                showHidden,
            });

            if (showLong) {
                const formattedContents = contents.map((entry) => {
                    const [permissions, owner, size, date, name] = entry.split(/\s+/);
                    return `${permissions.padEnd(10)} ${owner.padEnd(10)} ${size.padStart(6)} ${date} ${name}`;
                });
                return { output: formattedContents.join("</br>"), statusCode: 0 };
            }

            return { output: contents.join(" "), statusCode: 0 }; // Space-separated for non-long format
        } catch (error) {
            return { output: `Error: ${(error as Error).message}`, statusCode: 1 };
        }
    },
};
