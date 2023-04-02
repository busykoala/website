function cmdEnv() {
  let output = "<br>"
  for (const [key, value] of Object.entries(window)) {
    if (typeof key === "string" && key.toUpperCase() === key) {
      console.log(`${key}: ${value}`);
      output += `${key}=${value}<br>`
    }
  }
  return output
}

export default cmdEnv
