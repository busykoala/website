function cmdHelp(_: string, version: string) {
  return `<br>
    Busykoala shell, version ${version} (${navigator.userAgent})<br>
    These shell commands are available:<br><br>
    cat [FILE]<br>
    cd [DIRECTORY]<br>
    cowsay STRING<br>
    env<br>
    fortune<br>
    history<br>
    ls [FILE]<br>
    mkdir [DIRECTORY]<br>
    pwd
  `
}

export default cmdHelp
