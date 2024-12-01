import { CommandFn, CommandArgs, CommandContext } from "../core/TerminalCore";

export const clear: CommandFn = {
    description: "Clears the terminal screen",
    usage: "clear",
    execute: (args: CommandArgs, context: CommandContext) => {
        document.getElementById("history")!.innerHTML = "";
        return { output: "", statusCode: 0 };
    },
};