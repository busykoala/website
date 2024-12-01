import { CommandFn, CommandArgs, CommandContext } from "../core/TerminalCore";

// Store for aliases in a global object (this can be expanded if you want persistence)
export const aliases: Record<string, string> = {};

// The alias command lets users create, list, and remove aliases.
export const alias: CommandFn = {
    description: "Creates, lists, or removes command aliases.",
    usage: "alias [alias_name] [command] | alias",
    execute: (args: CommandArgs, context: CommandContext) => {
        const { positional, flags } = args;

        // If no positional argument is passed, show the current aliases
        if (positional.length === 0) {
            const aliasList = Object.entries(aliases)
                .map(([alias, command]) => `${alias}: ${command}`)
                .join("\n");
            return { output: aliasList || "No aliases set.", statusCode: 0 };
        }

        // If there are exactly two positional arguments, set an alias
        if (positional.length === 2) {
            const aliasName = positional[0];
            const command = positional[1];

            // Check if the alias already exists
            if (aliases[aliasName]) {
                return { output: `Alias '${aliasName}' already exists.`, statusCode: 1 };
            }

            // Set the alias
            aliases[aliasName] = command;
            return { output: `Alias '${aliasName}' created for '${command}'.`, statusCode: 0 };
        }

        // If there is only one positional argument (an alias name), remove it
        if (positional.length === 1) {
            const aliasName = positional[0];

            // Check if the alias exists
            if (!aliases[aliasName]) {
                return { output: `Alias '${aliasName}' not found.`, statusCode: 1 };
            }

            // Remove the alias
            delete aliases[aliasName];
            return { output: `Alias '${aliasName}' removed.`, statusCode: 0 };
        }

        // If the args don't match the above conditions, show usage info
        return {
            output: `Usage: alias [alias_name] [command] | alias`,
            statusCode: 1,
        };
    },
};
