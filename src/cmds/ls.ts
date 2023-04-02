import { files, BusykoalaFile } from "../data/files"
import getDirs from "../data/directories"
import concatPaths from "../helper/concat-paths"

function cmdLs(input: string) {
  const relativePath = input.split(" ")[1]
  let lsFiles: Array<BusykoalaFile>
  if (relativePath) {
    const lsPath = concatPaths(window.PWD, relativePath)
    lsFiles = files.filter((file) => file.directory === lsPath)
  } else {
    lsFiles = files.filter((file) => file.directory === window.PWD)
  }

  const localDirs = new Set<string>()
  getDirs().forEach((dir) => {
    if (dir.startsWith(window.PWD) && dir !== window.PWD) {
      const localDir = window.PWD === "/" ? dir.substring(window.PWD.length) : dir.substring(window.PWD.length + 1)
      const localDirSplit = localDir.split("/")[0]
      if (!localDirSplit.startsWith(".")) {
        localDirs.add(localDirSplit)
      }
    }
  })
  let filesAndDirs = [...lsFiles.map(o=>o.fileName), ...localDirs].sort()
  return `<br>${filesAndDirs.join(" ")}`
}

export default cmdLs
