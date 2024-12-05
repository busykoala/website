import { CommandFn, CommandContext } from "../core/TerminalCore";

export const history: CommandFn = {
    description: "Displays the command history",
    usage: "history",
    execute: (_, context: CommandContext) => {
        // Retrieve the command history from the context
        const commandHistory = context.history;

        if (commandHistory.length === 0) {
            return { output: "No commands in history.", statusCode: 0 };
        }

        // Format the history with line numbers
        const formattedHistory = commandHistory
            .map((command, index) => `${index + 1} ${command}`)
            .join("</br>");

        return { output: formattedHistory, statusCode: 0 };
    },
};
