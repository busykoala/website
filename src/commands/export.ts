import { CommandFn, CommandArgs, CommandContext } from "../core/TerminalCore";

export const exportEnv: CommandFn = {
    description: "Sets or displays environment variables",
    usage: "export [KEY=VALUE]",
    execute: (args: CommandArgs, context: CommandContext) => {
        // If no arguments are provided, display all environment variables
        if (args.positional.length === 0) {
            const formattedEnv = Object.entries(context.env)
                .map(([key, value]) => `${key}=${value}`)
                .join("</br>");
            return { output: formattedEnv, statusCode: 0 };
        }

        // Process each KEY=VALUE pair
        for (const pair of args.positional) {
            const [key, value] = pair.split("=");
            if (!key || value === undefined) {
                return { output: `Error: Invalid format '${pair}'. Use KEY=VALUE.`, statusCode: 1 };
            }

            // Update the environment variable
            context.env[key] = value;
        }

        return { output: "", statusCode: 0 };
    },
};
