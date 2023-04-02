function cmdEcho(input: string) {
  return `<br>
    ${input.split(" ").slice(1).join(" ").trimEnd().replace(/^['"]|['"]$/g, "")}
    `
}

export default cmdEcho
