import concatPaths from "../helper/concat-paths"
import getDirs from "../data/directories"

function cmdCd(input: string) {
  const relativePath = input.split(" ")[1] || window.HOME
  const path = concatPaths(window.PWD, relativePath)
  if (getDirs().has(path)) {
    window.PWD = path
    return ""
  } else {
    return `cd: no such file or directory: ${relativePath}`
  }
}

export default cmdCd
