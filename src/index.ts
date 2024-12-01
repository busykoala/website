import { TerminalCore, CommandFn, CommandArgs, CommandContext } from "./core/TerminalCore";

// Initialize Terminal
const terminal = new TerminalCore({
  env: {
    PWD: "/home/busykoala",
    HOME: "/home/busykoala",
    EDITOR: "nvim",
    PATH: "/bin:/usr/local/bin:/usr/bin:/sbin",
    SHELL: "/bin/busyshell",
    USER: "busykoala",
    COMMANDS: {},
  },
  version: "1.0.0",
  history: [],
  files: {},
});

// Commands
const commands: Record<string, CommandFn> = {
  help: {
    description: "Displays a list of available commands",
    usage: "help",
    execute: (args: CommandArgs, context: CommandContext) => {
      const commandList = Object.keys(context.env.COMMANDS)
          .map((cmd) => `<strong>${cmd}</strong>: ${context.env.COMMANDS[cmd]}`)
          .join("<br>");
      return { output: `Available Commands:<br>${commandList}`, statusCode: 0 };
    },
  },
  clear: {
    description: "Clears the terminal screen",
    usage: "clear",
    execute: (args: CommandArgs, context: CommandContext) => {
      document.getElementById("history")!.innerHTML = "";
      return { output: "", statusCode: 0 };
    },
  },
};

// Register Commands
Object.entries(commands).forEach(([name, command]) => {
  terminal.registerCommand(name, command.execute);
  terminal.getContext().env.COMMANDS[name] = command.description;
});

// DOM Elements
const historyDiv = document.getElementById("history") as HTMLDivElement;
const promptDiv = document.getElementById("prompt") as HTMLDivElement;

// Terminal Updates
const updateTerminal = (input: string, output: string, statusCode: number) => {
  // Add a prefix to the new prompt if the status code indicates an error
  const promptPrefix = statusCode > 1 ? `<span style="color:red;">x</span> ` : "";

  // Replace the input field in the previous prompt with the typed command
  const executedPrompt = promptDiv.innerHTML.replace(
      /<input.*?>/i, // Match the input element
      `<span>${input}</span>` // Replace it with the typed command
  );

  // Append the current prompt and command output to the history
  historyDiv.innerHTML += `${executedPrompt}${output}<br>`;

  // Set up the new prompt with a fresh input field
  promptDiv.innerHTML = `
    ${promptPrefix}&nbsp;<span style="color:cornflowerblue;">website</span><span>@</span>
    <span style="color:aqua;">busykoala</span>:<span style="color:lawngreen;" class="pwd">
      ${terminal.getContext().env.PWD}
    </span>$&nbsp;<input type="text" id="input" autofocus>
  `;

  // Ensure the new input field is focused
  const newInputField = document.getElementById("input") as HTMLInputElement;
  if (newInputField) newInputField.focus();

  // Scroll to the bottom of the page
  window.scrollTo(0, document.body.scrollHeight);
};

// Event Listeners
document.addEventListener("keydown", (e) => {
  const inputField = document.getElementById("input") as HTMLInputElement;

  if (e.key === "Enter" && inputField) {
    const input = inputField.value.trim();
    const result = terminal.execute(input);
    const { output, statusCode } = result;
    updateTerminal(input, output, statusCode);
  }
  if (e.key === "ArrowUp") {
    const inputField = document.getElementById("input") as HTMLInputElement;
    if (inputField) inputField.value = terminal.navigateHistory("up");
  }
  if (e.key === "ArrowDown") {
    const inputField = document.getElementById("input") as HTMLInputElement;
    if (inputField) inputField.value = terminal.navigateHistory("down");
  }
  if (e.key === "Tab") {
    e.preventDefault();
    const inputField = document.getElementById("input") as HTMLInputElement;
    if (inputField) inputField.value = terminal.tabComplete(inputField.value);
  }
});

// Responsive UI Adjustments
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
);
document.getElementById("desktop")!.style.display = isMobile ? "none" : "";
document.getElementById("mobile")!.style.display = isMobile ? "" : "none";
