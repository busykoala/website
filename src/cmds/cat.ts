import { files } from "../data/files"
import concatPaths from "../helper/concat-paths"

function cmdCat(input: string) {
  const relativePath = input.split(" ")[1]
  const path = concatPaths(window.PWD, relativePath)
  const lastSlashIndex = path.lastIndexOf('/')
  const directory = path.substring(0, lastSlashIndex)
  const fileName = path.substring(lastSlashIndex + 1)
  const file = files.find((file) => file.directory === directory && file.fileName === fileName)
  if (file) {
    return file.content
  } else {
    return "<br>File not found"
  }
}

export default cmdCat
