import { rootDirs } from '../data/directories'
import concatPaths from "../helper/concat-paths"
import { files } from '../data/files'

function cmdMkdir(input: string) {
  const relativePath = input.split(" ")[1] || window.HOME
  // multiple elements (not supported yet)
  if (relativePath.includes("/")) {
    return `mkdir: cannot create directory '${relativePath}': No such file or directory`
  }
  const path = concatPaths(window.PWD, relativePath)
  // path exists
  if (rootDirs.includes(path)) {
    return `mkdir: cannot create directory '${relativePath}': File exists`
  }
  // path equal to file
  const allFilePaths = files.map(file => {
    return file.directory + "/" + file.fileName
  })
  if (allFilePaths.includes(path)) {
    return `mkdir: cannot create directory '${relativePath}': File exists`
  }
  rootDirs.push(path)
  return ''
}

export default cmdMkdir
