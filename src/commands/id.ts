import { CommandFn, user, group, supplementaryGroups } from "../core/TerminalCore";

export const id: CommandFn = {
    description: "Displays user ID, group ID, and supplementary group IDs",
    usage: "id",
    execute: () => {
        // Format the output similar to the Linux `id` command
        const output = `uid=${user}(${user}) gid=${group}(${group}) groups=${[group, ...supplementaryGroups].join(",")}`;
        return { output, statusCode: 0 };
    },
};
