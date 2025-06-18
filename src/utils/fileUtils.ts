import { FileNode, ProjectInfo, SupportedLanguage } from "../types";

/**
 * 获取文件语言类型
 */
export const getFileLanguage = (filename: string): SupportedLanguage => {
    const ext = filename.split(".").pop()?.toLowerCase();
    switch (ext) {
        case "java":
            return "java";
        case "json":
            return "json";
        case "gradle":
        case "kts":
            return "gradle";
        default:
            return "text";
    }
};

/**
 * 获取文件图标类型
 */
export const getFileIcon = (node: FileNode): string => {
    if (node.type === "directory") {
        return node.isExpanded ? "folder-open" : "folder";
    }

    const ext = node.extension?.toLowerCase();
    switch (ext) {
        case "java":
            return "coffee";
        case "json":
            return "braces";
        case "gradle":
        case "kts":
            return "settings";
        case "md":
            return "file-text";
        default:
            return "file";
    }
};

/**
 * 构建项目文件树结构
 */
export const buildProjectStructure = (): ProjectInfo[] => {
    const forgeProject: ProjectInfo = {
        name: "Minecraft Forge",
        path: "forge-1.20.1-47.1.99",
        description: "Minecraft Forge 1.20.1 源代码",
        files: [
            {
                name: "com",
                path: "forge-1.20.1-47.1.99/com",
                type: "directory",
                isExpanded: false,
                level: 0,
                children: [
                    {
                        name: "mojang",
                        path: "forge-1.20.1-47.1.99/com/mojang",
                        type: "directory",
                        isExpanded: false,
                        level: 1,
                        children: [
                            {
                                name: "authlib",
                                path: "forge-1.20.1-47.1.99/com/mojang/authlib",
                                type: "directory",
                                isExpanded: false,
                                level: 2,
                                children: [
                                    {
                                        name: "Agent.java",
                                        path: "forge-1.20.1-47.1.99/com/mojang/authlib/Agent.java",
                                        type: "file",
                                        extension: "java",
                                        level: 3,
                                    },
                                    {
                                        name: "AuthenticationService.java",
                                        path: "forge-1.20.1-47.1.99/com/mojang/authlib/AuthenticationService.java",
                                        type: "file",
                                        extension: "java",
                                        level: 3,
                                    },
                                    {
                                        name: "BaseAuthenticationService.java",
                                        path: "forge-1.20.1-47.1.99/com/mojang/authlib/BaseAuthenticationService.java",
                                        type: "file",
                                        extension: "java",
                                        level: 3,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                name: "net",
                path: "forge-1.20.1-47.1.99/net",
                type: "directory",
                isExpanded: false,
                level: 0,
                children: [
                    {
                        name: "minecraft",
                        path: "forge-1.20.1-47.1.99/net/minecraft",
                        type: "directory",
                        isExpanded: false,
                        level: 1,
                        children: [
                            {
                                name: "client",
                                path: "forge-1.20.1-47.1.99/net/minecraft/client",
                                type: "directory",
                                isExpanded: false,
                                level: 2,
                                children: [],
                            },
                            {
                                name: "server",
                                path: "forge-1.20.1-47.1.99/net/minecraft/server",
                                type: "directory",
                                isExpanded: false,
                                level: 2,
                                children: [],
                            },
                        ],
                    },
                    {
                        name: "minecraftforge",
                        path: "forge-1.20.1-47.1.99/net/minecraftforge",
                        type: "directory",
                        isExpanded: false,
                        level: 1,
                        children: [],
                    },
                ],
            },
        ],
    };

    const kubeJSProject: ProjectInfo = {
        name: "KubeJS",
        path: "KubeJS-2001",
        description: "KubeJS Mod 源代码",
        files: [
            {
                name: "common",
                path: "KubeJS-2001/common",
                type: "directory",
                isExpanded: false,
                level: 0,
                children: [
                    {
                        name: "build.gradle",
                        path: "KubeJS-2001/common/build.gradle",
                        type: "file",
                        extension: "gradle",
                        level: 1,
                    },
                    {
                        name: "src",
                        path: "KubeJS-2001/common/src",
                        type: "directory",
                        isExpanded: false,
                        level: 1,
                        children: [],
                    },
                ],
            },
            {
                name: "forge",
                path: "KubeJS-2001/forge",
                type: "directory",
                isExpanded: false,
                level: 0,
                children: [
                    {
                        name: "src",
                        path: "KubeJS-2001/forge/src",
                        type: "directory",
                        isExpanded: false,
                        level: 1,
                        children: [],
                    },
                ],
            },
        ],
    };

    return [forgeProject, kubeJSProject];
};

/**
 * 模拟读取文件内容
 */
export const readFileContent = async (filePath: string): Promise<string> => {
    // 模拟网络延迟
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 根据文件路径返回示例内容
    if (filePath.includes("Agent.java")) {
        return `package com.mojang.authlib;

/**
 * Minecraft Authentication Agent
 * 
 * This class represents an authentication agent for Minecraft services.
 * It handles authentication protocols and user management.
 */
public class Agent {
    
    private final String name;
    private final int version;
    
    /**
     * Creates a new Agent with the specified name and version.
     * 
     * @param name the agent name
     * @param version the agent version
     */
    public Agent(String name, int version) {
        this.name = name;
        this.version = version;
    }
    
    /**
     * Gets the agent name.
     * 
     * @return the agent name
     */
    public String getName() {
        return name;
    }
    
    /**
     * Gets the agent version.
     * 
     * @return the agent version
     */
    public int getVersion() {
        return version;
    }
    
    @Override
    public String toString() {
        return "Agent{name='" + name + "', version=" + version + "}";
    }
}`;
    }

    if (filePath.includes("AuthenticationService.java")) {
        return `package com.mojang.authlib;

/**
 * Base interface for all authentication services.
 * 
 * This interface defines the contract for authentication services
 * used by Minecraft to authenticate users.
 */
public interface AuthenticationService {
    
    /**
     * Authenticates a user with the given credentials.
     * 
     * @param username the username
     * @param password the password
     * @return true if authentication was successful
     */
    boolean authenticate(String username, String password);
    
    /**
     * Logs out the current user.
     */
    void logout();
    
    /**
     * Checks if the user is currently logged in.
     * 
     * @return true if logged in
     */
    boolean isLoggedIn();
    
    /**
     * Gets the current user profile.
     * 
     * @return the user profile, or null if not logged in
     */
    UserProfile getUserProfile();
}`;
    }

    if (filePath.includes("build.gradle")) {
        return `plugins {
    id 'java-library'
    id 'maven-publish'
    id 'net.minecraftforge.gradle' version '5.1.+'
}

version = project.mod_version
group = project.mod_group_id
archivesBaseName = project.mod_id

java.toolchain.languageVersion = JavaLanguageVersion.of(17)

repositories {
    maven {
        name = 'ParchmentMC'
        url = 'https://maven.parchmentmc.org'
    }
}

dependencies {
    minecraft 'net.minecraftforge:forge:1.20.1-47.1.99'
    
    // KubeJS dependencies
    implementation fg.deobf("dev.latvian.mods:kubejs-forge:\${kubejs_version}")
    implementation fg.deobf("dev.latvian.mods:rhino-forge:\${rhino_version}")
}

tasks.withType(JavaCompile).configureEach {
    options.encoding = 'UTF-8'
}`;
    }

    // 默认返回示例内容
    return `// File: ${filePath}
// This is a placeholder content for ${filePath.split("/").pop()}

// TODO: Implement actual file reading from the project structure
// This would typically involve:
// 1. Reading the actual file from the filesystem
// 2. Parsing the content based on file type
// 3. Handling different encodings and formats

public class PlaceholderClass {
    // Placeholder implementation
    public void exampleMethod() {
        System.out.println("This is placeholder content for: ${filePath}");
    }
}`;
};

/**
 * 搜索文件和内容
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

/**
 * 扁平化文件树为列表
 */
export const flattenFileTree = (nodes: FileNode[]): FileNode[] => {
    const result: FileNode[] = [];

    const flatten = (node: FileNode) => {
        result.push(node);
        if (node.type === "directory" && node.isExpanded && node.children) {
            node.children.forEach(flatten);
        }
    };

    nodes.forEach(flatten);
    return result;
};
