import { CommandArgs } from "./TerminalCore";

export function parseInput(input: string): CommandArgs {
    const args: CommandArgs = { positional: [], flags: {} };

    const parts = input.match(/"[^"]+"|'[^']+'|\S+/g) || []; // Split while preserving quotes

    let lastFlag: string | null = null;

    parts.forEach((part) => {
        if (part.startsWith("--")) {
            const [key, value] = part.slice(2).split("=");
            if (value !== undefined) {
                args.flags[key] = value;
            } else {
                lastFlag = key;
                args.flags[key] = true;
            }
        } else if (part.startsWith("-")) {
            part.slice(1).split("").forEach((char) => {
                args.flags[char] = true;
                lastFlag = char;
            });
        } else {
            if (lastFlag && args.flags[lastFlag] === true) {
                args.flags[lastFlag] = part;
                lastFlag = null;
            } else {
                args.positional.push(part.replace(/^["']|["']$/g, ""));
            }
        }
    });

    return args;
}
