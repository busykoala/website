import {CommandArgs, CommandContext, CommandFn, group, user} from "../core/TerminalCore";
import {FileSystem} from "../core/filesystem";

export const rm: CommandFn = {
    description: "Removes files or directories",
    usage: "rm <file|directory>",
    execute: (args: CommandArgs, context: CommandContext) => {
        const target = args.positional[0];
        if (!target) {
            return { output: "Error: No target specified.", statusCode: 1 };
        }

        const fileSystem = context.terminal.getFileSystem();

        const filePath = fileSystem.normalizePath(`${context.env.PWD}/${target}`);

        try {
            // Retrieve the target node
            const targetNode = fileSystem.getNode(filePath, user, group);
            if (!targetNode) {
                return { output: `Error: '${target}' not found.`, statusCode: 1 };
            }

            // Check if the user has write permission to remove the target node
            if (!FileSystem.hasPermission(targetNode, "write", user, group)) {
                return { output: `Error: Permission denied to remove '${target}'.`, statusCode: 1 };
            }

            // Remove the node
            fileSystem.removeNode(filePath, user, group);

            return { output: `Successfully removed '${target}'.`, statusCode: 0 };
        } catch (error) {
            return { output: `Error: ${(error as Error).message}`, statusCode: 1 };
        }
    },
};
