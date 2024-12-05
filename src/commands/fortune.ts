import { CommandArgs, CommandContext, CommandFn } from "../core/TerminalCore";
const fortuneCookies: string[] = require("fortune-cookie")

export const fortune: CommandFn = {
    description: "Displays a random fortune cookie message",
    usage: "fortune",
    execute: (_args: CommandArgs, _context: CommandContext) => {
        // Generate a random fortune message
        const randomFortune = fortuneCookies[Math.floor(Math.random() * fortuneCookies.length)];
        return { output: `<br>${randomFortune}`, statusCode: 0 };
    },
};
