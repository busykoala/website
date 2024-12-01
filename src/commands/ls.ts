import { CommandFn, CommandArgs, CommandContext } from "../core/TerminalCore";

export const ls: CommandFn = {
    description: "Lists directory contents",
    usage: "ls [-l] [-a] [path]",
    execute: (args: CommandArgs, context: CommandContext) => {
        const path = args.positional[0] || context.env.PWD; // Use the first positional argument or PWD
        const showLong = args.flags.l === true;
        const showHidden = args.flags.a === true;

        try {
            const entries = context.terminal.getFileSystem().listDirectory(path, {
                showHidden,
                longFormat: showLong,
            });

            if (showLong) {
                const rows = entries.map((entry) => {
                    const permissions = entry.permissions;
                    const owner = entry.owner;
                    const group = entry.group;
                    const size = entry.size.toString();
                    const date = entry.modified.toLocaleString();
                    const name = entry.name;

                    return `
                        <tr>
                            <td>${permissions}</td>
                            <td>${owner}</td>
                            <td>${group}</td>
                            <td>${size}</td>
                            <td>${date}</td>
                            <td>${name}</td>
                        </tr>
                    `;
                });

                const table = `
                    <table>
                        <thead>
                            <tr>
                                <th>Permissions</th>
                                <th>Owner</th>
                                <th>Group</th>
                                <th>Size</th>
                                <th>Date</th>
                                <th>Name</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows.join("")}
                        </tbody>
                    </table>
                `;
                return { output: table, statusCode: 0 };
            }

            // For non-long format, join file/directory names with a space
            const names = entries.map((entry) => entry.name);
            return { output: names.join(" "), statusCode: 0 };
        } catch (error) {
            return { output: `Error: ${(error as Error).message}`, statusCode: 1 };
        }
    },
};
