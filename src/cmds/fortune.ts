const fortune: string[] = require("fortune-cookie")

function cmdFortune() {
  return `<br>${fortune[Math.floor(Math.random() * fortune.length)]}`
}

export default cmdFortune
