type FileType = "file" | "directory";

interface FileSystemNode {
    type: FileType;
    name: string;
    permissions: string;
    owner: string;
    size: number;
    modified: Date;
    content?: string; // For files only
    children?: Record<string, FileSystemNode>; // For directories only
}

export class FileSystem {
    private root: FileSystemNode;

    constructor() {
        this.root = {
            type: "directory",
            name: "/",
            permissions: "rwxr-xr-x",
            owner: "root",
            size: 0,
            modified: new Date(),
            children: {},
        };
    }

    // Normalize a file path to handle ".." and "."
    public normalizePath(path: string): string {
        const segments = path.split("/").filter((segment) => segment && segment !== ".");
        const stack: string[] = [];

        for (const segment of segments) {
            if (segment === "..") {
                stack.pop(); // Go up one directory
            } else {
                stack.push(segment); // Add segment to path
            }
        }

        return "/" + stack.join("/");
    }

    addDirectory(path: string, name: string, owner: string = "root", permissions: string = "rwxr-xr-x") {
        const normalizedPath = this.normalizePath(path);
        const dir = this.getNode(normalizedPath);
        if (dir && dir.type === "directory") {
            if (!dir.children) dir.children = {}; // Initialize children if undefined
            dir.children[name] = {
                type: "directory",
                name,
                permissions,
                owner,
                size: 0,
                modified: new Date(),
                children: {}, // Directories always have children
            };
        } else {
            throw new Error(`Directory '${path}' not found.`);
        }
    }

    addFile(
        path: string,
        name: string,
        content: string = "",
        owner: string = "root",
        permissions: string = "rw-r--r--"
    ) {
        const normalizedPath = this.normalizePath(path);
        const dir = this.getNode(normalizedPath);
        if (dir && dir.type === "directory") {
            if (!dir.children) dir.children = {}; // Initialize children if undefined
            dir.children[name] = {
                type: "file",
                name,
                permissions,
                owner,
                size: content.length,
                modified: new Date(),
                content,
            };
        } else {
            throw new Error(`Directory '${path}' not found.`);
        }
    }

    getNode(path: string): FileSystemNode | null {
        const normalizedPath = this.normalizePath(path);
        const segments = normalizedPath.split("/").filter((segment) => segment); // Split the path into segments
        let currentNode: FileSystemNode | null = this.root; // Start at the root

        for (const segment of segments) {
            if (!currentNode || currentNode.type !== "directory") {
                return null; // Path doesn't exist or is invalid
            }

            // Ensure children is always defined
            if (!currentNode.children) {
                return null; // No children available, so the path is invalid
            }

            currentNode = currentNode.children[segment] || null; // Traverse to the next child
        }

        return currentNode; // Return the resolved node or null if not found
    }

    listDirectory(path: string, options: { showHidden?: boolean; longFormat?: boolean } = {}): string[] {
        const normalizedPath = this.normalizePath(path);
        const dir = this.getNode(normalizedPath);
        if (dir && dir.type === "directory") {
            const entries = Object.values(dir.children || {}); // Safely access children

            // Filter hidden files if `showHidden` is not enabled
            const filteredEntries = entries.filter((entry) => options.showHidden || !entry.name.startsWith("."));

            if (options.longFormat) {
                // Format each entry in long format
                return filteredEntries.map((entry) => {
                    const permissions = entry.permissions.padEnd(10, " ");
                    const owner = entry.owner.padEnd(10, " ");
                    const size = entry.size.toString().padStart(6, " ");
                    const date = entry.modified.toLocaleString().padEnd(20, " ");
                    const name = entry.name;
                    return `${permissions} ${owner} ${size} ${date} ${name}`;
                });
            }

            // Short format: Only return names
            return filteredEntries.map((entry) => entry.name);
        } else {
            throw new Error(`Directory '${path}' not found.`);
        }
    }

    // Calculates the size of a directory or file (for `du`)
    calculateSize(path: string): number {
        const node = this.getNode(path);
        if (!node) {
            throw new Error(`Path '${path}' not found.`);
        }

        if (node.type === "file") {
            return node.size;
        }

        // Recursively calculate the size of directories
        const children = Object.values(node.children || {});
        return children.reduce((total, child) => total + this.calculateSize(`${path}/${child.name}`), 0);
    }

    // Finds nodes by name (for `find`)
    findNodes(path: string, name: string): string[] {
        const dir = this.getNode(path);
        if (!dir || dir.type !== "directory") {
            throw new Error(`Directory '${path}' not found.`);
        }

        const results: string[] = [];
        const children = Object.values(dir.children || {});

        for (const child of children) {
            if (child.name === name) {
                results.push(`${path}/${child.name}`);
            }

            if (child.type === "directory") {
                results.push(...this.findNodes(`${path}/${child.name}`, name));
            }
        }

        return results;
    }

    // Removes a file or directory (for `rm` or `mv`)
    removeNode(path: string): void {
        const normalizedPath = this.normalizePath(path);
        const parentPath = normalizedPath.substring(0, normalizedPath.lastIndexOf("/"));
        const nodeName = normalizedPath.substring(normalizedPath.lastIndexOf("/") + 1);

        const parent = this.getNode(parentPath);
        if (parent && parent.type === "directory" && parent.children) {
            delete parent.children[nodeName];
        } else {
            throw new Error(`Cannot remove '${path}'.`);
        }
    }

    // Generates a tree view of the directory structure (for `tree`)
    generateTree(path: string, depth: number = 0, isLast: boolean = true): string {
        const dir = this.getNode(path);
        if (!dir || dir.type !== "directory") {
            throw new Error(`Directory '${path}' not found.`);
        }

        const children = Object.values(dir.children || {});

        const treeLines = children.map((child, index) => {
            const isChildLast = index === children.length - 1;

            // Use HTML symbols for the tree structure
            const indent = "&nbsp;".repeat(depth * 4); // 4 spaces per depth level
            const branch = isChildLast ? "&nbsp;&nbsp;&nbsp;&nbsp;&#9492;&mdash;" : "&nbsp;&nbsp;&nbsp;&nbsp;&#9500;&mdash;";
            const displayName = child.type === "directory" ? `<strong>${child.name}/</strong>` : child.name;

            if (child.type === "directory") {
                return `
                <div>${indent}${branch} ${displayName}</div>
                ${this.generateTree(`${path}/${child.name}`, depth + 1, isChildLast)}
            `;
            }
            return `<div>${indent}${branch} ${displayName}</div>`;
        });

        return treeLines.join("");
    }
}
