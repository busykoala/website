function cmdHistory(history: Array<string>) {
  if (history.length > 0) {
    return `<br>${history.join("<br>")}`
  }
  return ""
}

export default cmdHistory
