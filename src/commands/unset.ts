import { CommandFn, CommandArgs, CommandContext } from "../core/TerminalCore";

export const unsetEnv: CommandFn = {
    description: "Unsets an environment variable",
    usage: "unset <KEY>",
    execute: (args: CommandArgs, context: CommandContext) => {
        const key = args.positional[0];

        if (!key) {
            return { output: "Error: No variable specified.", statusCode: 1 };
        }

        if (!(key in context.env)) {
            return { output: `Error: '${key}' is not set.`, statusCode: 1 };
        }

        // Remove the variable from the environment
        delete context.env[key];

        return { output: "", statusCode: 0 };
    },
};
