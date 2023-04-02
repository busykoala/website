function splitTextIntoLines(text: string): string[] {
  const maxLength = 34
  const words = text.split(' ')
  const lines = []
  let line = ''
  for (const word of words) {
    if (line.length + word.length + 1 > maxLength) {
      lines.push(line.trim())
      line = word
    } else {
      line += ` ${word}`
    }
  }
  lines.push(line.trim())
  return lines
}

function cmdCowsay(input: string) {
  const text = input.split(" ").slice(1).join(" ").trimEnd().replace(/^['"]|['"]$/g, "")
  const lines = splitTextIntoLines(text)
  const maxLen = lines.reduce((max, str) => Math.max(max, str.length), 0)
  let out = `&nbsp${"-".repeat(maxLen + 2)}<br>`
  if (lines.length === 1) {
    out += `<&nbsp;${lines[0]}&nbsp;><br>`
  } else {
    lines.forEach((line, index)=>{
      const padding = "&nbsp;".repeat(
         maxLen - line.length + 1)
      if (index === 0) {
        out += `/&nbsp;${line}${padding}&#92;<br>`
      } else if (index === lines.length - 1) {
        out += `&#92;&nbsp;${line}${padding}/<br>`
      } else {
        out += `|&nbsp;${line}${padding}|<br>`
      }
    })
  }
  const cow = `
&nbsp${"-".repeat(maxLen + 2)}<br>
&nbsp;&nbsp;&#92;&nbsp;&nbsp;&nbsp;^__^<br>
&nbsp;&nbsp;&nbsp;&#92;&nbsp;&nbsp;(oo)&#92;_______<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(__)&#92;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)&#92;/&#92;<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;||----w&nbsp;|<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;||&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;||<br>
  `
  return `<br>${out}${cow}`
}

export default cmdCowsay
