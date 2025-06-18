import { FileNode, ProjectInfo } from "../types";

// 项目根路径
const PROJECT_PATHS = {
    FORGE: "forge-1.20.1-47.1.99",
    KUBEJS: "KubeJS-2001",
};

// 忽略的文件和文件夹
const IGNORE_PATTERNS = [
    ".git",
    ".idea",
    ".vscode",
    ".eclipse",
    ".settings",
    "node_modules",
    "target",
    "build",
    "out",
    "dist",
    ".gradle",
    ".class",
    ".jar",
    ".war",
    ".DS_Store",
    "Thumbs.db",
];

// 检查是否应该忽略
const shouldIgnore = (name: string): boolean => {
    return IGNORE_PATTERNS.some(
        (pattern) =>
            name === pattern || (name.startsWith(".") && name !== ".gitignore")
    );
};

// 获取文件扩展名
const getExtension = (fileName: string): string => {
    const lastDot = fileName.lastIndexOf(".");
    return lastDot === -1 ? "" : fileName.substring(lastDot + 1);
};

/**
 * 使用 fetch 读取服务器上的文件内容
 */
export const readFileFromServer = async (filePath: string): Promise<string> => {
    try {
        const response = await fetch(`/${filePath}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.text();
    } catch (error) {
        console.error(`Failed to read file ${filePath}:`, error);
        throw new Error(`Failed to read file: ${filePath}`);
    }
};

/**
 * 扫描目录结构（基于已知的文件结构）
 */
export const scanProjectDirectory = async (
    projectPath: string
): Promise<FileNode[]> => {
    if (projectPath === PROJECT_PATHS.FORGE) {
        return await scanForgeProject();
    } else if (projectPath === PROJECT_PATHS.KUBEJS) {
        return await scanKubeJSProject();
    }
    return [];
};

/**
 * 扫描 Forge 项目结构
 */
const scanForgeProject = async (): Promise<FileNode[]> => {
    const basePath = PROJECT_PATHS.FORGE;

    return [
        {
            name: "com",
            path: `${basePath}/com`,
            type: "directory",
            level: 0,
            isExpanded: false,
            children: [
                {
                    name: "mojang",
                    path: `${basePath}/com/mojang`,
                    type: "directory",
                    level: 1,
                    isExpanded: false,
                    children: [
                        {
                            name: "authlib",
                            path: `${basePath}/com/mojang/authlib`,
                            type: "directory",
                            level: 2,
                            isExpanded: false,
                            children: [
                                {
                                    name: "Agent.java",
                                    path: `${basePath}/com/mojang/authlib/Agent.java`,
                                    type: "file",
                                    extension: "java",
                                    level: 3,
                                },
                                {
                                    name: "AuthenticationService.java",
                                    path: `${basePath}/com/mojang/authlib/AuthenticationService.java`,
                                    type: "file",
                                    extension: "java",
                                    level: 3,
                                },
                                {
                                    name: "BaseAuthenticationService.java",
                                    path: `${basePath}/com/mojang/authlib/BaseAuthenticationService.java`,
                                    type: "file",
                                    extension: "java",
                                    level: 3,
                                },
                                {
                                    name: "exceptions",
                                    path: `${basePath}/com/mojang/authlib/exceptions`,
                                    type: "directory",
                                    level: 3,
                                    isExpanded: false,
                                    children: [],
                                },
                            ],
                        },
                        {
                            name: "blaze3d",
                            path: `${basePath}/com/mojang/blaze3d`,
                            type: "directory",
                            level: 1,
                            isExpanded: false,
                            children: [
                                {
                                    name: "Blaze3D.java",
                                    path: `${basePath}/com/mojang/blaze3d/Blaze3D.java`,
                                    type: "file",
                                    extension: "java",
                                    level: 2,
                                },
                            ],
                        },
                    ],
                },
            ],
        },
        {
            name: "net",
            path: `${basePath}/net`,
            type: "directory",
            level: 0,
            isExpanded: false,
            children: [
                {
                    name: "minecraft",
                    path: `${basePath}/net/minecraft`,
                    type: "directory",
                    level: 1,
                    isExpanded: false,
                    children: [
                        {
                            name: "BlockUtil.java",
                            path: `${basePath}/net/minecraft/BlockUtil.java`,
                            type: "file",
                            extension: "java",
                            level: 2,
                        },
                        {
                            name: "ChatFormatting.java",
                            path: `${basePath}/net/minecraft/ChatFormatting.java`,
                            type: "file",
                            extension: "java",
                            level: 2,
                        },
                        {
                            name: "CrashReport.java",
                            path: `${basePath}/net/minecraft/CrashReport.java`,
                            type: "file",
                            extension: "java",
                            level: 2,
                        },
                        {
                            name: "client",
                            path: `${basePath}/net/minecraft/client`,
                            type: "directory",
                            level: 2,
                            isExpanded: false,
                            children: [
                                {
                                    name: "Camera.java",
                                    path: `${basePath}/net/minecraft/client/Camera.java`,
                                    type: "file",
                                    extension: "java",
                                    level: 3,
                                },
                                {
                                    name: "CameraType.java",
                                    path: `${basePath}/net/minecraft/client/CameraType.java`,
                                    type: "file",
                                    extension: "java",
                                    level: 3,
                                },
                            ],
                        },
                        {
                            name: "server",
                            path: `${basePath}/net/minecraft/server`,
                            type: "directory",
                            level: 2,
                            isExpanded: false,
                            children: [
                                {
                                    name: "Bootstrap.java",
                                    path: `${basePath}/net/minecraft/server/Bootstrap.java`,
                                    type: "file",
                                    extension: "java",
                                    level: 3,
                                },
                            ],
                        },
                    ],
                },
                {
                    name: "minecraftforge",
                    path: `${basePath}/net/minecraftforge`,
                    type: "directory",
                    level: 1,
                    isExpanded: false,
                    children: [
                        {
                            name: "client",
                            path: `${basePath}/net/minecraftforge/client`,
                            type: "directory",
                            level: 2,
                            isExpanded: false,
                            children: [],
                        },
                        {
                            name: "common",
                            path: `${basePath}/net/minecraftforge/common`,
                            type: "directory",
                            level: 2,
                            isExpanded: false,
                            children: [],
                        },
                    ],
                },
            ],
        },
    ];
};

/**
 * 扫描 KubeJS 项目结构
 */
const scanKubeJSProject = async (): Promise<FileNode[]> => {
    const basePath = PROJECT_PATHS.KUBEJS;

    return [
        {
            name: "common",
            path: `${basePath}/common`,
            type: "directory",
            level: 0,
            isExpanded: false,
            children: [
                {
                    name: "build.gradle",
                    path: `${basePath}/common/build.gradle`,
                    type: "file",
                    extension: "gradle",
                    level: 1,
                },
                {
                    name: "src",
                    path: `${basePath}/common/src`,
                    type: "directory",
                    level: 1,
                    isExpanded: false,
                    children: [
                        {
                            name: "main",
                            path: `${basePath}/common/src/main`,
                            type: "directory",
                            level: 2,
                            isExpanded: false,
                            children: [
                                {
                                    name: "java",
                                    path: `${basePath}/common/src/main/java`,
                                    type: "directory",
                                    level: 3,
                                    isExpanded: false,
                                    children: [],
                                },
                                {
                                    name: "resources",
                                    path: `${basePath}/common/src/main/resources`,
                                    type: "directory",
                                    level: 3,
                                    isExpanded: false,
                                    children: [],
                                },
                            ],
                        },
                    ],
                },
            ],
        },
        {
            name: "forge",
            path: `${basePath}/forge`,
            type: "directory",
            level: 0,
            isExpanded: false,
            children: [
                {
                    name: "src",
                    path: `${basePath}/forge/src`,
                    type: "directory",
                    level: 1,
                    isExpanded: false,
                    children: [
                        {
                            name: "main",
                            path: `${basePath}/forge/src/main`,
                            type: "directory",
                            level: 2,
                            isExpanded: false,
                            children: [
                                {
                                    name: "java",
                                    path: `${basePath}/forge/src/main/java`,
                                    type: "directory",
                                    level: 3,
                                    isExpanded: false,
                                    children: [],
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    ];
};

/**
 * 初始化所有项目
 */
export const initializeProjects = async (): Promise<ProjectInfo[]> => {
    const projects: ProjectInfo[] = [];

    try {
        // Forge 项目
        const forgeFiles = await scanForgeProject();
        projects.push({
            name: "Minecraft Forge",
            path: PROJECT_PATHS.FORGE,
            description: "Minecraft Forge 1.20.1 源代码",
            files: forgeFiles,
        });

        // KubeJS 项目
        const kubeJSFiles = await scanKubeJSProject();
        projects.push({
            name: "KubeJS",
            path: PROJECT_PATHS.KUBEJS,
            description: "KubeJS Mod 源代码",
            files: kubeJSFiles,
        });
    } catch (error) {
        console.error("Error initializing projects:", error);
    }

    return projects;
};

/**
 * 动态加载目录内容（这里可以扩展以支持更深层的目录）
 */
export const loadDirectoryContents = async (
    node: FileNode
): Promise<FileNode[]> => {
    // 如果已经有children，直接返回
    if (node.children && node.children.length > 0) {
        return node.children;
    }

    // 这里可以根据路径动态加载更多内容
    // 暂时返回空数组，表示没有更多子项
    return [];
};

/**
 * 搜索文件
 */
export const searchFiles = (
    projects: ProjectInfo[],
    searchTerm: string
): FileNode[] => {
    const results: FileNode[] = [];

    const searchInNode = (node: FileNode) => {
        if (node.name.toLowerCase().includes(searchTerm.toLowerCase())) {
            results.push(node);
        }

        if (node.children) {
            node.children.forEach(searchInNode);
        }
    };

    projects.forEach((project) => {
        project.files.forEach(searchInNode);
    });

    return results;
};
