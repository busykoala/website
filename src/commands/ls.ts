import {CommandArgs, CommandContext, CommandFn, group, user} from "../core/TerminalCore";

export const ls: CommandFn = {
    description: "Lists directory contents",
    usage: "ls [-l] [-a] [path]",
    execute: (args: CommandArgs, context: CommandContext) => {
        console.log(args);
        const inputPath = args.positional[0] || "."; // Default to current directory
        const currentPath = context.env.PWD; // Current working directory
        const showLong = args.flags.l === true;
        const showHidden = args.flags.a === true;

        try {
            const fileSystem = context.terminal.getFileSystem();
            const resolvedPath = fileSystem.resolveRelativePath(inputPath, currentPath);

            // Retrieve directory entries with the correct user and group
            const entries = fileSystem.listDirectory(resolvedPath, user, group, {
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
