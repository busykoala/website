import { TerminalCore, CommandFn, CommandArgs, CommandContext } from "./core/TerminalCore";
import { help } from "./commands/help";
import { clear } from "./commands/clear";
import { ls } from "./commands/ls";
import { cat } from "./commands/cat";
import { pwd } from "./commands/pwd";
import { cd } from "./commands/cd";
import { history } from "./commands/history";
import { echo } from "./commands/echo";
import { env } from "./commands/env";
import { exportEnv } from "./commands/export";
import { unsetEnv } from "./commands/unset";
import { touch } from "./commands/touch";
import { chmod } from "./commands/chmod";
import { chown } from "./commands/chown";
import { cp } from "./commands/cp";
import { date } from "./commands/date";
import { df } from "./commands/df";
import { du } from "./commands/du";
import { find } from "./commands/find";
import { grep } from "./commands/grep";
import { head } from "./commands/head";
import { mkdir } from "./commands/mkdir";
import { mv } from "./commands/mv";
import { rm } from "./commands/rm";
import { tail } from "./commands/tail";
import { tree } from "./commands/tree";
import { uname } from "./commands/uname";
import { wc } from "./commands/wc";
import { whoami } from "./commands/whoami";
import { fortune } from "./commands/fortune";
import { cowsay } from "./commands/cowsay";
import { sl } from "./commands/sl";
import { cmatrix } from "./commands/cmatrix";

class TerminalState {
  private static running = false;
  private static interval: any;

  static setRunning(value: boolean) {
    this.running = value;
  }

  static getRunning(): boolean {
    return this.running;
  }

  static setInterval(value: any) {
    this.interval = value;
  }

  static getInterval(): any {
    return this.interval;
  }
}

export const TerminalStateController = {
  setRunning: TerminalState.setRunning,
  getRunning: TerminalState.getRunning,
  setInterval: TerminalState.setInterval,
  getInterval: TerminalState.getInterval
};

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
  cmatrix,
  cat,
  cd,
  chmod,
  chown,
  clear,
  cp,
  sl,
  date,
  df,
  du,
  echo,
  env,
  export: exportEnv,
  find,
  grep,
  head,
  help,
  history,
  fortune,
  cowsay,
  ls,
  mkdir,
  mv,
  pwd,
  rm,
  tail,
  touch,
  tree,
  uname,
  unset: unsetEnv,
  wc,
  whoami,
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
  // Add the command to the history
  if (input.trim()) {
    terminal.getContext().history.push(input); // Store the command in the terminal's history
  }

  // Add a prefix to the new prompt if the status code indicates an error
  const promptPrefix = statusCode > 1 ? `<span style="color:red;">x</span>` : "";

  // Clean up the prompt itself, ensuring no extra spaces or line breaks
  const cleanedPrompt = promptDiv.innerHTML
      .replace(/<input.*?>/i, `<span>${input}</span>`)
      .replace(/\s+</g, "<");

  // Append the cleaned prompt and the command's output to the history
  historyDiv.innerHTML += `<div>${cleanedPrompt}</div>`;
  if (output) {
    historyDiv.innerHTML += `<div>${output}</div>`;
  }

  // Set up the new prompt with a fresh input field
  promptDiv.innerHTML = `${promptPrefix}<span style="color:cornflowerblue;">website</span><span>@</span><span style="color:aqua;">busykoala</span>:<span style="color:lawngreen;" class="pwd">${terminal.getContext().env.PWD}</span>$&nbsp;<input type="text" id="input" autofocus>`;

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
  if (e.ctrlKey && e.key.toLowerCase() === "l") { // Handle Ctrl+L to clear the terminal
    e.preventDefault(); // Prevent the default browser behavior for Ctrl+L
    terminal.execute("clear"); // Execute the 'clear' command
    updateTerminal("", "", 0); // Clear the terminal visually
  }
  if (e.ctrlKey && e.key === 'c') {
    TerminalStateController.setRunning(false);
    let interval = TerminalStateController.getInterval();
    clearInterval(interval); // Stop the interval for the matrix animation
    const matrixDiv = document.getElementById("matrix-animation");
    if (matrixDiv) {
      matrixDiv.innerHTML = "";  // Clear the matrix effect when stopped
    }
    updateTerminal('Matrix stopped.', '', 0);  // Optionally display a message when stopped
  }
});

// Responsive UI Adjustments
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
);
document.getElementById("desktop")!.style.display = isMobile ? "none" : "";
document.getElementById("mobile")!.style.display = isMobile ? "" : "none";
