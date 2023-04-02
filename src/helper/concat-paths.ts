function concatPaths(basePath: string, relativePath: string) {
  let fullPath = basePath + "/" + relativePath;
  if (relativePath.startsWith("/")) {
    // relativePath is absolute
    fullPath = relativePath
  }
  const parts = fullPath.split("/");
    const stack = [];
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === "..") {
        stack.pop();
      } else if (parts[i] !== "." && parts[i] !== "") {
        stack.push(parts[i]);
      }
    }
    return `/${stack.join("/")}`
}

export default concatPaths
