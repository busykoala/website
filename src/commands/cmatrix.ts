import { CommandFn, CommandArgs, CommandContext } from "../core/TerminalCore";
import { TerminalStateController } from "../index";

// The cmatrix command simulates a terminal matrix effect, now covering the entire page.
export const cmatrix: CommandFn = {
    description: "Displays the cmatrix-style falling characters effect.",
    usage: "cmatrix",
    execute: (args: CommandArgs, context: CommandContext) => {
        // Get the number of columns based on the page width
        const columns = Math.floor(window.innerWidth / 16);  // Number of columns
        const rows = Math.floor(window.innerHeight / 16);   // Number of rows

        // Expanded character set (including more symbols)
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*()_+=[]{}|;:,.<>?/~`!'.split('');

        // Define a list of colors to choose from
        const colors = ["#00FF00", "#FF4500", "#FFD700", "#00BFFF", "#FF1493", "#ADFF2F", "#FF6347", "#8A2BE2", "#00FA9A", "#DAA520"];

        // Create an array of streams for each column
        const streams: { y: number; characters: string[]; color: string; tailLength: number }[] = [];
        for (let i = 0; i < columns; i++) {
            streams.push({
                y: Math.random() * rows,  // Random starting y-coordinate
                characters: characters,
                color: colors[Math.floor(Math.random() * colors.length)],  // Randomly pick a color for the stream
                tailLength: Math.floor(Math.random() * 10) + 5,  // Random tail length to simulate stream flow
            });
        }

        // Function to render the matrix effect
        const renderMatrix = () => {
            let output = "";
            streams.forEach((stream, index) => {
                // Randomly pick a character from the expanded list
                const randomChar = stream.characters[Math.floor(Math.random() * stream.characters.length)];

                // Add the character with the position (y) for each column, using the stream's color
                output += `<span style="position: absolute; top: ${stream.y * 16}px; left: ${index * 16}px; color: ${stream.color}; font-weight: bold;">${randomChar}</span>`;

                // Add a "tail" to each stream, giving it a glowing effect
                for (let i = 1; i < stream.tailLength; i++) {
                    const opacity = (stream.tailLength - i) / stream.tailLength;
                    output += `<span style="position: absolute; top: ${(stream.y + i) * 16}px; left: ${index * 16}px; color: ${stream.color}; opacity: ${opacity};">${randomChar}</span>`;
                }

                // Move the stream down and reset if it's out of bounds
                stream.y++;
                if (stream.y > rows) {
                    stream.y = 0;  // Reset to top
                }
            });

            // Insert the matrix into the page as a background overlay
            const matrixDiv = document.getElementById("matrix-animation");
            if (matrixDiv) {
                matrixDiv.innerHTML = output;
            }
        };

        // Start the animation if it's not already running
        if (!TerminalStateController.getRunning()) {
            TerminalStateController.setRunning(true);
            const interval = setInterval(() => {
                renderMatrix();
            }, 30); // Speed up the falling effect

            // Store the interval for stopping later
            TerminalStateController.setInterval(interval);
        }

        // Return the status and output
        return { output: "Matrix is running. Press 'Ctrl+C' to stop.", statusCode: 0 };
    },
};
