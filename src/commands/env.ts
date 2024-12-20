import { CommandFn, CommandContext } from "../core/TerminalCore";

export const env: CommandFn = {
    description: "Displays environment variables",
    usage: "env",
    execute: (_, context: CommandContext) => {
        // Retrieve environment variables from the context
        const envVariables = context.env;

        if (Object.keys(envVariables).length === 0) {
            return { output: "No environment variables set.", statusCode: 0 };
        }

        // Exclude the COMMANDS property and format the environment variables for display
        const formattedEnv = Object.entries(envVariables)
            .filter(([key]) => key !== "COMMANDS") // Exclude COMMANDS
            .map(([key, value]) => `${key}=${value}`)
            .join("</br>");

        return { output: formattedEnv, statusCode: 0 };
    },
};
