export function getNotFound(input: string) {
  return `<br>-bash: ${input}: Command not found`
}

export function getPermissionDenied(input: string) {
  return `<br>-bash: ${input}: Permission denied`
}
