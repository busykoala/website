export interface CommandArgs {
    positional: string[]; // Non-flag arguments (e.g., file paths)
    flags: Record<string, string | boolean>; // Parsed flags and their values
}

export function parseInput(input: string): CommandArgs {
    const tokens = input.trim().split(/\s+/); // Split by whitespace
    const positional: string[] = [];
    const flags: Record<string, string | boolean> = {};

    let expectingValueForFlag: string | null = null;

    tokens.forEach((token) => {
        if (expectingValueForFlag) {
            // Assign value to the last flag
            flags[expectingValueForFlag] = token;
            expectingValueForFlag = null;
        } else if (token.startsWith("--")) {
            // Handle long-form flags (e.g., --help, --file=value)
            const [flag, value] = token.slice(2).split("=", 2);
            if (value !== undefined) {
                flags[flag] = value;
            } else {
                flags[flag] = true; // Boolean flag
                expectingValueForFlag = flag; // Might expect a value later
            }
        } else if (token.startsWith("-") && token.length > 1) {
            // Handle short-form flags (e.g., -h, -abc, -f value)
            const flagChars = token.slice(1).split("");
            flagChars.forEach((char, index) => {
                if (index === flagChars.length - 1 && index !== token.length - 2) {
                    // If this is the last flag in the group, check if it expects a value
                    expectingValueForFlag = char;
                } else {
                    flags[char] = true; // Boolean flag
                }
            });
        } else {
            // Handle positional arguments
            positional.push(token);
        }
    });

    // If a flag was expecting a value but didn't get one, reset it
    if (expectingValueForFlag) {
        flags[expectingValueForFlag] = true; // Reset to boolean flag
    }

    return { positional, flags };
}
