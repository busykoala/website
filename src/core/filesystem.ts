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
}
