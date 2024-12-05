import { group, user } from "./TerminalCore";
import { busykoalaFiles } from "./data/busykoalaFiles";
import { baseFiles } from "./data/baseFiles";
import { FileSystemNode } from "./filesystem";
import { FileSystem } from "./filesystem";

export interface InitFileSystemNode extends FileSystemNode {
    directory: string;
}

export function addBaseFilesystem(fileSystem: FileSystem) {
    const allFiles: InitFileSystemNode[] = [...baseFiles, ...busykoalaFiles];

    // Define directories to create with their ownership
    const directories = [
        { path: "/bin", owner: "root", group: "root" },
        { path: "/etc", owner: "root", group: "root" },
        { path: "/boot", owner: "root", group: "root" },
        { path: "/lib", owner: "root", group: "root" },
        { path: "/var", owner: "root", group: "root" },
        { path: "/var/log", owner: "root", group: "root" },
        { path: "/home", owner: "root", group: "root" },
        { path: "/home/busykoala", owner: user, group },
        { path: "/home/busykoala/about", owner: user, group },
        { path: "/home/busykoala/.ssh", owner: user, group },
    ];

    // Create all directories with bypass permissions
    directories.forEach(({ path, owner, group }) => {
        const segments = path.split("/").filter(Boolean);
        let currentPath = "";
        segments.forEach((segment) => {
            const parentPath = currentPath || "/";
            currentPath = `${parentPath}/${segment}`.replace(/\/+/g, "/");

            try {
                fileSystem.addDirectory(
                    parentPath,
                    segment,
                    owner,
                    group,
                    owner,
                    group,
                    "rwxr-xr-x",
                    true // Bypass permissions
                );
            } catch (error) {
                // Silently handle existing directories
            }
        });
    });

    // Add files to the filesystem
    allFiles.forEach((file) => {
        try {
            fileSystem.addFile(
                file.directory,
                file.name,
                file.owner,
                file.group,
                file.owner,
                file.group,
                file.content || "",
                file.permissions || "rw-r--r--",
                false,
                true // Bypass permissions
            );
        } catch (error) {
            console.error(`Failed to add file '${file.name}' in '${file.directory}': ${(error as Error).message}`);
        }
    });
}
