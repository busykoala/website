import {CommandFn} from "../core/TerminalCore";

export const sl: CommandFn = {
    description: "Steam Locomotive animation",
    usage: "sl",
    execute: (_, __) => {
        // Train ASCII art with a placeholder for dynamic steam
        const trainTemplate = (steam: string) => `
            <pre id="train-animation" style="position: absolute; white-space: pre; font-family: monospace;">
     e@@@@@@@@@@@@@@@
    @@@""""""""""
   @"${steam}___________
  II__[w] | [i] [z] |
 {======|_|~~~~~~~~~|
/oO--000'"\`-OO---OO-'
            </pre>
        `;

        // Steam patterns for animation
        const steamPatterns = [
            "     ",
            "  .  ",
            " ..  ",
            " ... ",
            " ....",
            ".....",
        ];

        // Insert the initial train into the body
        const body = document.body;
        const trainElement = document.createElement("div");
        trainElement.innerHTML = trainTemplate(steamPatterns[0]);
        body.appendChild(trainElement);

        const trainNode = document.getElementById("train-animation");
        if (trainNode) {
            trainNode.style.right = "-300px"; // Start position (off-screen to the right)
            trainNode.style.top = `${window.innerHeight / 2}px`; // Vertically center the train
            trainNode.style.animation = "trainMove 10s linear forwards";

            // Animate the steam dynamically
            let steamIndex = 0;
            const steamInterval = setInterval(() => {
                if (trainNode) {
                    trainNode.innerHTML = trainTemplate(steamPatterns[steamIndex]);
                    steamIndex = (steamIndex + 1) % steamPatterns.length; // Cycle through patterns
                }
            }, 300); // Update steam every 300ms

            // Remove the train element and stop steam animation after the animation ends
            trainNode.addEventListener("animationend", () => {
                clearInterval(steamInterval);
                trainNode.remove();
            });
        }

        return { output: "", statusCode: 0 }; // No terminal output
    },
};
