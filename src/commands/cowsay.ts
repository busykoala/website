import { CommandArgs, CommandContext, CommandFn } from "../core/TerminalCore";

function splitTextIntoLines(text: string, maxLength = 34): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let line = "";

    for (const word of words) {
        if (line.length + word.length + 1 > maxLength) {
            lines.push(line.trim());
            line = word;
        } else {
            line += ` ${word}`;
        }
    }

    lines.push(line.trim());
    return lines;
}

export const cowsay: CommandFn = {
    description: "Generates a cow saying your input",
    usage: "cowsay <message>",
    execute: (args: CommandArgs, context: CommandContext) => {
        const pipedInput = args.flags._input as string | undefined;
        const text = pipedInput || args.positional.join(" ").trim().replace("<br>", "");

        if (!text) {
            return { output: "Error: No message provided for the cow to say.", statusCode: 1 };
        }

        const lines = splitTextIntoLines(text);
        const maxLen = lines.reduce((max, str) => Math.max(max, str.length), 0);

        // Construct the speech bubble
        let out = `&nbsp;${"-".repeat(maxLen + 2)}<br>`;
        if (lines.length === 1) {
            out += `&nbsp;< ${lines[0]} &nbsp;><br>`;
        } else {
            lines.forEach((line, index) => {
                const padding = "&nbsp;".repeat(maxLen - line.length + 1);
                if (index === 0) {
                    out += `&nbsp;/ ${line}${padding}&#92;<br>`;
                } else if (index === lines.length - 1) {
                    out += `&nbsp;&#92; ${line}${padding}/<br>`;
                } else {
                    out += `&nbsp;| ${line}${padding}|<br>`;
                }
            });
        }

        // Construct the cow ASCII art
        const cow = `
&nbsp;${"-".repeat(maxLen + 2)}<br>
&nbsp;&nbsp;&#92;&nbsp;&nbsp;&nbsp;^__^<br>
&nbsp;&nbsp;&nbsp;&#92;&nbsp;&nbsp;(oo)&#92;_______<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(__)&#92;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)&#92;/&#92;<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;||----w&nbsp;|<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;||&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;||<br>
        `;

        return { output: `<br>${out}${cow}`, statusCode: 0 };
    },
};
