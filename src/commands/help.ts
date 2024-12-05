import { CommandFn, CommandArgs, CommandContext } from "../core/TerminalCore";

export const help: CommandFn = {
    description: "Displays a list of available commands",
    usage: "help",
    execute: (args: CommandArgs, context: CommandContext) => {
        const commandList = Object.keys(context.env.COMMANDS)
            .map((cmd) => `<strong>${cmd}</strong>: ${context.env.COMMANDS[cmd]}`)
            .join("<br>");
        return { output: `Available Commands:<br>${commandList}`, statusCode: 0 };
    },
};
