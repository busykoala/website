type FileType = "file" | "directory";

export interface FileSystemNode {
    type: FileType;
    name: string;
    permissions: string; // e.g., "rwxr-xr-x"
    owner: string; // Owner of the file or directory
    group: string; // Group associated with the file or directory
    size: number; // Size in bytes (for files only)
    modified: Date; // Last modification date
    content?: string; // File content (for files only)
    children?: Record<string, FileSystemNode>; // Children nodes (for directories only)
}

export class FileSystem {
    private root: FileSystemNode;

    constructor() {
        this.root = {
            type: "directory",
            name: "/",
            permissions: "rwxr-xr-x",
            owner: "root",
            group: "root",
            size: 0,
            modified: new Date(),
            children: {},
        };
    }

    // Normalize a file path to handle "." and ".."
    public normalizePath(path: string): string {
        const segments = path.split("/").filter((segment) => segment && segment !== ".");
        const stack: string[] = [];

        for (const segment of segments) {
            if (segment === "..") {
                stack.pop(); // Go up one directory
            } else {
                stack.push(segment); // Move into directory
            }
        }

        return "/" + stack.join("/");
    }

    // Check permissions for a node
    public static hasPermission(
        node: FileSystemNode,
        operation: "read" | "write" | "execute",
        user: string,
        group: string
    ): boolean {
        const permissionIndex = { read: 0, write: 1, execute: 2 };
        const ownerPermissions = node.permissions.slice(0, 3);
        const groupPermissions = node.permissions.slice(3, 6);
        const otherPermissions = node.permissions.slice(6, 9);

        const permissions =
            node.owner === user
                ? ownerPermissions
                : node.group === group
                    ? groupPermissions
                    : otherPermissions;

        return permissions[permissionIndex[operation]] !== "-";
    }

    // Add a directory with permission checks
    public addDirectory(
        path: string,
        name: string,
        user: string,
        group: string,
        owner: string,
        dirGroup: string,
        permissions: string = "rwxr-xr-x",
        bypassPermissions: boolean = false
    ) {
        const normalizedPath = this.normalizePath(path);
        const parent = this.getNode(normalizedPath, user, group);

        if (!parent || parent.type !== "directory") {
            throw new Error(`Parent directory '${path}' not found.`);
        }

        if (!bypassPermissions && !FileSystem.hasPermission(parent, "write", user, group)) {
            throw new Error(`Permission denied: Cannot create directory in '${path}'.`);
        }

        if (!parent.children) parent.children = {};

        // Check if the directory already exists
        if (parent.children[name]) {
            if (parent.children[name].type === "directory") {
                // Directory already exists, skip creation
                return;
            } else {
                throw new Error(`A directory with the name '${name}' already exists in '${path}'.`);
            }
        }

        // Create the directory if it does not exist
        parent.children[name] = {
            type: "directory",
            name,
            permissions,
            owner,
            group: dirGroup,
            size: 0,
            modified: new Date(),
            children: {},
        };
    }

    public addFile(
        path: string,
        name: string,
        user: string,
        group: string,
        owner: string,
        fileGroup: string,
        content: string = "",
        permissions: string = "rw-r--r--",
        append: boolean = false,
        bypassPermissions: boolean = false
    ) {
        const normalizedPath = this.normalizePath(path);
        const parent = this.getNode(normalizedPath, user, group);

        if (!parent || parent.type !== "directory") {
            throw new Error(`Parent directory '${path}' not found.`);
        }

        if (!bypassPermissions && !FileSystem.hasPermission(parent, "write", user, group)) {
            throw new Error(`Permission denied: Cannot create file in '${path}'.`);
        }

        if (!parent.children) parent.children = {};

        const existingFile = parent.children[name];
        if (existingFile && existingFile.type === "file") {
            if (!bypassPermissions && !FileSystem.hasPermission(existingFile, "write", user, group)) {
                throw new Error(`Permission denied: Cannot write to file '${name}'.`);
            }

            if (append) {
                existingFile.content = (existingFile.content || "") + content;
                existingFile.size += content.length;
                existingFile.modified = new Date();
            } else {
                existingFile.content = content;
                existingFile.size = content.length;
                existingFile.modified = new Date();
            }
        } else {
            parent.children[name] = {
                type: "file",
                name,
                permissions,
                owner,
                group: fileGroup,
                size: content.length,
                modified: new Date(),
                content,
            };
        }
    }

    // Get a node with permission checks
    public getNode(path: string, user: string, group: string, permission: 'read' | 'write' | 'execute' = 'execute'): FileSystemNode | null {
        const normalizedPath = this.normalizePath(path);
        const segments = normalizedPath.split("/").filter((segment) => segment);
        let currentNode: FileSystemNode | null = this.root;

        for (const segment of segments) {
            if (!currentNode || currentNode.type !== "directory") return null;
            if (!FileSystem.hasPermission(currentNode, permission, user, group)) {
                throw new Error(`Permission denied: Cannot access '${path}'.`);
            }

            currentNode = currentNode.children?.[segment] || null;
        }

        return currentNode;
    }

    // List directory contents with permission checks
    public listDirectory(
        path: string,
        user: string,
        group: string,
        options: { showHidden?: boolean; longFormat?: boolean } = {}
    ): FileSystemNode[] {
        const dir = this.getNode(path, user, group);

        if (!dir || dir.type !== "directory") {
            throw new Error(`Directory '${path}' not found.`);
        }

        if (!FileSystem.hasPermission(dir, "read", user, group)) {
            throw new Error(`Permission denied: Cannot list directory '${path}'.`);
        }

        const entries = Object.values(dir.children || {});
        return entries.filter((entry) => options.showHidden || !entry.name.startsWith("."));
    }

    // Remove a node with permission checks
    public removeNode(path: string, user: string, group: string): void {
        const normalizedPath = this.normalizePath(path);
        const parentPath = normalizedPath.substring(0, normalizedPath.lastIndexOf("/"));
        const nodeName = normalizedPath.substring(normalizedPath.lastIndexOf("/") + 1);

        const parent = this.getNode(parentPath, user, group);

        if (!parent || parent.type !== "directory" || !parent.children) {
            throw new Error(`Cannot remove '${path}': Not found.`);
        }

        const node = parent.children[nodeName];
        if (!node) {
            throw new Error(`Cannot remove '${path}': Node not found.`);
        }

        if (!FileSystem.hasPermission(node, "write", user, group)) {
            throw new Error(`Permission denied: Cannot remove '${path}'.`);
        }

        delete parent.children[nodeName];
    }

    // Generate a tree view of the directory structure (for `tree`)
    public generateTree(path: string, user: string, group: string, depth: number = 0, isLast: boolean = true): string {
        const dir = this.getNode(path, user, group);

        if (!dir || dir.type !== "directory") {
            throw new Error(`Directory '${path}' not found.`);
        }

        const children = Object.values(dir.children || {});
        const treeLines = children.map((child, index) => {
            const isChildLast = index === children.length - 1;
            const indent = "&nbsp;".repeat(depth * 4);
            const branch = isChildLast ? "&nbsp;&nbsp;&nbsp;&nbsp;&#9492;&mdash;" : "&nbsp;&nbsp;&nbsp;&nbsp;&#9500;&mdash;";
            const displayName = child.type === "directory" ? `<strong>${child.name}/</strong>` : child.name;

            if (child.type === "directory") {
                return `
                    <div>${indent}${branch} ${displayName}</div>
                    ${this.generateTree(`${path}/${child.name}`, user, group, depth + 1, isChildLast)}
                `;
            }
            return `<div>${indent}${branch} ${displayName}</div>`;
        });

        return treeLines.join("");
    }

    public findNodes(
        path: string,
        name: string,
        user: string,
        group: string,
        currentPath: string = ""
    ): string[] {
        const node = this.getNode(path, user, group);

        if (!node || node.type !== "directory") {
            throw new Error(`Directory '${path}' not found.`);
        }

        // Check permissions for the directory
        if (!FileSystem.hasPermission(node, "read", user, group) || !FileSystem.hasPermission(node, "execute", user, group)) {
            throw new Error(`Permission denied to search in '${path}'.`);
        }

        const results: string[] = [];
        const children = Object.values(node.children || {});

        // Iterate over children to find matches and recurse into directories
        for (const child of children) {
            const childPath = `${currentPath}/${child.name}`;
            if (child.name === name) {
                results.push(this.normalizePath(childPath));
            }
            if (child.type === "directory") {
                results.push(
                    ...this.findNodes(`${path}/${child.name}`, name, user, group, this.normalizePath(childPath))
                );
            }
        }

        return results;
    }

    public calculateSize(path: string, user: string, group: string): number {
        const node = this.getNode(path, user, group);

        if (!node) {
            throw new Error(`Path '${path}' not found.`);
        }

        // Check permissions for the node
        if (!FileSystem.hasPermission(node, "read", user, group)) {
            throw new Error(`Permission denied: Cannot access '${path}'.`);
        }

        if (node.type === "file") {
            return node.size; // Return file size directly
        }

        // For directories, recursively calculate the size of all children
        const children = Object.values(node.children || {});
        return children.reduce((totalSize, child) => {
            return totalSize + this.calculateSize(`${path}/${child.name}`, user, group);
        }, 0);
    }
}
