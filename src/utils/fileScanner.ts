import { FileNode, ProjectInfo } from "../types";

/**
 * 检查文件是否应该被忽略
 */
const shouldIgnoreFile = (name: string): boolean => {
    const ignorePatterns = [
        // 常见的忽略文件/文件夹
        "node_modules",
        ".git",
        ".idea",
        ".vscode",
        "target",
        "build",
        "out",
        "dist",
        // 临时文件
        ".DS_Store",
        "Thumbs.db",
        "*.tmp",
        "*.log",
        // 编译产物
        "*.class",
        "*.jar",
        "*.war",
        // 其他
        ".gradle",
        ".settings",
        ".project",
        ".classpath",
    ];

    return ignorePatterns.some((pattern) => {
        if (pattern.includes("*")) {
            const regex = new RegExp(pattern.replace("*", ".*"));
            return regex.test(name);
        }
        return name === pattern || name.startsWith(pattern);
    });
};

/**
 * 获取文件扩展名
 */
const getFileExtension = (filename: string): string => {
    const lastDot = filename.lastIndexOf(".");
    return lastDot === -1 ? "" : filename.substring(lastDot + 1);
};

/**
 * 递归扫描目录结构
 */
const scanDirectory = async (
    basePath: string,
    relativePath: string = "",
    level: number = 0
): Promise<FileNode[]> => {
    const files: FileNode[] = [];
    const fullPath = basePath + (relativePath ? "/" + relativePath : "");

    try {
        // 使用现有的项目结构数据来模拟文件扫描
        // 在真实环境中，这里会使用 fs.readdir 等 Node.js API
        const projectStructure = await getProjectStructure(
            basePath,
            relativePath,
            level
        );
        return projectStructure;
    } catch (error) {
        console.error(`Error scanning directory ${fullPath}:`, error);
        return [];
    }
};

/**
 * 获取项目结构（基于实际文件系统数据）
 */
const getProjectStructure = async (
    basePath: string,
    relativePath: string,
    level: number
): Promise<FileNode[]> => {
    // 这里我们根据实际的项目布局来构建更完整的文件树
    if (basePath.includes("forge-1.20.1-47.1.99")) {
        return await getForgeProjectStructure(relativePath, level);
    } else if (basePath.includes("KubeJS-2001")) {
        return await getKubeJSProjectStructure(relativePath, level);
    }
    return [];
};

/**
 * 获取 Forge 项目结构
 */
const getForgeProjectStructure = async (
    relativePath: string,
    level: number
): Promise<FileNode[]> => {
    const basePath = "forge-1.20.1-47.1.99";

    // 根据相对路径构建对应的文件结构
    if (relativePath === "") {
        // 根目录
        return [
            {
                name: "com",
                path: `${basePath}/com`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [], // 延迟加载
            },
            {
                name: "net",
                path: `${basePath}/net`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [], // 延迟加载
            },
        ];
    }

    if (relativePath === "com") {
        return [
            {
                name: "mojang",
                path: `${basePath}/com/mojang`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [],
            },
        ];
    }

    if (relativePath === "com/mojang") {
        return [
            {
                name: "authlib",
                path: `${basePath}/com/mojang/authlib`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [],
            },
            {
                name: "blaze3d",
                path: `${basePath}/com/mojang/blaze3d`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [],
            },
            {
                name: "blocklist",
                path: `${basePath}/com/mojang/blocklist`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [],
            },
            {
                name: "brigadier",
                path: `${basePath}/com/mojang/brigadier`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [],
            },
            {
                name: "datafixers",
                path: `${basePath}/com/mojang/datafixers`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [],
            },
            {
                name: "serialization",
                path: `${basePath}/com/mojang/serialization`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [],
            },
        ];
    }

    if (relativePath === "com/mojang/authlib") {
        return [
            {
                name: "Agent.java",
                path: `${basePath}/com/mojang/authlib/Agent.java`,
                type: "file",
                extension: "java",
                level: level,
            },
            {
                name: "AuthenticationService.java",
                path: `${basePath}/com/mojang/authlib/AuthenticationService.java`,
                type: "file",
                extension: "java",
                level: level,
            },
            {
                name: "BaseAuthenticationService.java",
                path: `${basePath}/com/mojang/authlib/BaseAuthenticationService.java`,
                type: "file",
                extension: "java",
                level: level,
            },
            {
                name: "exceptions",
                path: `${basePath}/com/mojang/authlib/exceptions`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [],
            },
            {
                name: "minecraft",
                path: `${basePath}/com/mojang/authlib/minecraft`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [],
            },
            {
                name: "yggdrasil",
                path: `${basePath}/com/mojang/authlib/yggdrasil`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [],
            },
        ];
    }

    if (relativePath === "net") {
        return [
            {
                name: "minecraft",
                path: `${basePath}/net/minecraft`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [],
            },
            {
                name: "minecraftforge",
                path: `${basePath}/net/minecraftforge`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [],
            },
        ];
    }

    if (relativePath === "net/minecraft") {
        return [
            {
                name: "BlockUtil.java",
                path: `${basePath}/net/minecraft/BlockUtil.java`,
                type: "file",
                extension: "java",
                level: level,
            },
            {
                name: "CharPredicate.java",
                path: `${basePath}/net/minecraft/CharPredicate.java`,
                type: "file",
                extension: "java",
                level: level,
            },
            {
                name: "ChatFormatting.java",
                path: `${basePath}/net/minecraft/ChatFormatting.java`,
                type: "file",
                extension: "java",
                level: level,
            },
            {
                name: "CrashReport.java",
                path: `${basePath}/net/minecraft/CrashReport.java`,
                type: "file",
                extension: "java",
                level: level,
            },
            {
                name: "client",
                path: `${basePath}/net/minecraft/client`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [],
            },
            {
                name: "server",
                path: `${basePath}/net/minecraft/server`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [],
            },
            {
                name: "world",
                path: `${basePath}/net/minecraft/world`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [],
            },
            {
                name: "data",
                path: `${basePath}/net/minecraft/data`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [],
            },
            {
                name: "util",
                path: `${basePath}/net/minecraft/util`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [],
            },
        ];
    }

    if (relativePath === "net/minecraft/client") {
        return [
            {
                name: "Camera.java",
                path: `${basePath}/net/minecraft/client/Camera.java`,
                type: "file",
                extension: "java",
                level: level,
            },
            {
                name: "CameraType.java",
                path: `${basePath}/net/minecraft/client/CameraType.java`,
                type: "file",
                extension: "java",
                level: level,
            },
            {
                name: "gui",
                path: `${basePath}/net/minecraft/client/gui`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [],
            },
            {
                name: "renderer",
                path: `${basePath}/net/minecraft/client/renderer`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [],
            },
        ];
    }

    if (relativePath === "net/minecraft/server") {
        return [
            {
                name: "Bootstrap.java",
                path: `${basePath}/net/minecraft/server/Bootstrap.java`,
                type: "file",
                extension: "java",
                level: level,
            },
            {
                name: "ConsoleInput.java",
                path: `${basePath}/net/minecraft/server/ConsoleInput.java`,
                type: "file",
                extension: "java",
                level: level,
            },
            {
                name: "commands",
                path: `${basePath}/net/minecraft/server/commands`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [],
            },
            {
                name: "level",
                path: `${basePath}/net/minecraft/server/level`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [],
            },
        ];
    }

    if (relativePath === "net/minecraftforge") {
        return [
            {
                name: "client",
                path: `${basePath}/net/minecraftforge/client`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [],
            },
            {
                name: "common",
                path: `${basePath}/net/minecraftforge/common`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [],
            },
            {
                name: "event",
                path: `${basePath}/net/minecraftforge/event`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [],
            },
            {
                name: "fml",
                path: `${basePath}/net/minecraftforge/fml`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [],
            },
        ];
    }

    return [];
};

/**
 * 获取 KubeJS 项目结构
 */
const getKubeJSProjectStructure = async (
    relativePath: string,
    level: number
): Promise<FileNode[]> => {
    const basePath = "KubeJS-2001";

    if (relativePath === "") {
        return [
            {
                name: "common",
                path: `${basePath}/common`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [],
            },
            {
                name: "forge",
                path: `${basePath}/forge`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [],
            },
        ];
    }

    if (relativePath === "common") {
        return [
            {
                name: "build.gradle",
                path: `${basePath}/common/build.gradle`,
                type: "file",
                extension: "gradle",
                level: level,
            },
            {
                name: "src",
                path: `${basePath}/common/src`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [],
            },
        ];
    }

    if (relativePath === "common/src") {
        return [
            {
                name: "main",
                path: `${basePath}/common/src/main`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [],
            },
        ];
    }

    if (relativePath === "common/src/main") {
        return [
            {
                name: "java",
                path: `${basePath}/common/src/main/java`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [],
            },
            {
                name: "resources",
                path: `${basePath}/common/src/main/resources`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [],
            },
        ];
    }

    if (relativePath === "forge") {
        return [
            {
                name: "src",
                path: `${basePath}/forge/src`,
                type: "directory",
                isExpanded: false,
                level: level,
                children: [],
            },
        ];
    }

    return [];
};

/**
 * 动态加载文件夹内容
 */
export const loadDirectoryContents = async (
    node: FileNode
): Promise<FileNode[]> => {
    if (node.type !== "directory") {
        return [];
    }

    // 计算相对路径
    const pathParts = node.path.split("/");
    const projectRoot = pathParts[0];
    const relativePath = pathParts.slice(1).join("/");

    const children = await getProjectStructure(
        projectRoot,
        relativePath,
        (node.level || 0) + 1
    );
    return children;
};

/**
 * 扫描所有项目
 */
export const scanAllProjects = async (): Promise<ProjectInfo[]> => {
    const projects: ProjectInfo[] = [];

    // Forge 项目
    const forgeFiles = await scanDirectory("forge-1.20.1-47.1.99");
    projects.push({
        name: "Minecraft Forge",
        path: "forge-1.20.1-47.1.99",
        description: "Minecraft Forge 1.20.1 源代码",
        files: forgeFiles,
    });

    // KubeJS 项目
    const kubeJSFiles = await scanDirectory("KubeJS-2001");
    projects.push({
        name: "KubeJS",
        path: "KubeJS-2001",
        description: "KubeJS Mod 源代码",
        files: kubeJSFiles,
    });

    return projects;
};
