import cmdCat from "./cmds/cat"
import cmdHelp from "./cmds/help"
import cmdLs from "./cmds/ls"
import cmdHistory from "./cmds/history"
import cmdPwd from "./cmds/pwd"
import cmdCd from "./cmds/cd"
import cmdEnv from "./cmds/env"
import cmdFortune from "./cmds/fortune"
import cmdCowsay from "./cmds/cowsay"
import cmdEcho from "./cmds/echo"

declare global {
  interface Window {
    PWD: string;
    HOME: string;
  }
}

window.PWD = "/home/busykoala"
window.HOME = "/home/busykoala"

let version = "0.0.1"
let count = 0
let history: Array<string> = []
let historyNumber = 0

function runCommand() {
  const trailDiv = document.getElementById("history") as HTMLDivElement
  let trail = trailDiv.innerHTML
  const promptDiv = document.getElementById("prompt") as HTMLDivElement
  const childNodes = promptDiv.querySelectorAll(":not(input)")
  let prompt = ""
  for (const childNode of childNodes) {
    prompt += childNode.outerHTML
  }
  const inputDiv = document.getElementById("input") as HTMLInputElement
  const input = inputDiv.value

  const commands = input.split("|")
  let output = ""
  commands.forEach((command) => {
    if (command.trimEnd() === "clear") { trail = "" }
    const outputClean = output.replace("<br>", "").replace("\n", "").trimStart().trimEnd()
    const currendCommand = `${command} ${outputClean}`.trimStart()
    output = getOutput(currendCommand)
  })

  // if (input === "clear") { trail = "" }
  // const output = getOutput(input)
  if (count < 1 || input.startsWith("clear")) {
    trailDiv!.innerHTML = `${trail}${prompt}${input}${output}`
    count++
  } else {
    trailDiv!.innerHTML = `${trail}<br>${prompt}${input}${output}`
    count++
  }
  const pwdElements = document.querySelectorAll('.pwd')
  const lastPwdElement = pwdElements[pwdElements.length - 1]
  lastPwdElement.textContent = window.PWD
  history.push(input)
  inputDiv.value = ""
}

function getOutput(input: string) {
  if (input === "" || input === "clear") {
    return ""
  }
  let command = input.split(" ")[0]
  if (command === "help") { return cmdHelp(input, version) }
  else if (command === "cat") { return cmdCat(input) }
  else if (command === "ls") { return cmdLs(input) }
  else if (command === "pwd") { return cmdPwd() }
  else if (command === "cd") { return cmdCd(input) }
  else if (command === "echo") { return cmdEcho(input) }
  else if (command === "history") { return cmdHistory(history) }
  else if (command === "env") { return cmdEnv() }
  else if (command === "fortune") { return cmdFortune() }
  else if (command === "cowsay") { return cmdCowsay(input) }
  else if (command === "clear") { return "" }
  else { return `<br>Command '${command}' not found` }

}

const inputElement = document.getElementById('input') as HTMLInputElement

inputElement.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    runCommand()
    historyNumber = history.length
  }
})

inputElement.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === 'ArrowUp') {
    if (historyNumber - 1 >= 0) {
      historyNumber -= 1
    }
    if (history[historyNumber]) {
      const inputDiv = document.getElementById("input") as HTMLInputElement
      inputDiv.value = history[historyNumber]
    }
  }
})

inputElement.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === 'ArrowDown') {
    if (historyNumber + 1 < history.length) {
      historyNumber += 1
    }
    if (history[historyNumber]) {
      const inputDiv = document.getElementById("input") as HTMLInputElement
      inputDiv.value = history[historyNumber]
    }
  }
})
