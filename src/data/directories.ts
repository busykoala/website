import { files } from "./files"

const rootDirs = [
  "/",
  "/home",
  "/home/busykoala"
]

function getDirs(additionalDirs: Array<string> = []) {
  const directories = new Set<string>()
  rootDirs.forEach((dir) => {
    directories.add(dir);
  })
  files.forEach((file) => {
    directories.add(file.directory);
  })
  additionalDirs.forEach((dir) => {
    directories.add(dir);
  })
  return directories
}

export default getDirs
