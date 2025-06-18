import { FileNode, ProjectInfo } from "../types";

// 检查浏览器是否支持 File System Access API
export const isFileSystemAPISupported = (): boolean => {
    return 'showDirectoryPicker' in window;
};

// 需要忽略的文件和文件夹
const shouldIgnore = (name: string): boolean => {
    const ignorePatterns = [
        '.git', '.idea', '.vscode', '.eclipse', '.settings',
        'node_modules', 'target', 'build', 'out', 'dist',
        '.gradle', '.class', '.jar', '.war',
        '.DS_Store', 'Thumbs.db', '*.tmp', '*.log'
    ];
    
    return ignorePatterns.some(pattern => {
        if (pattern.includes('*')) {
            const regex = new RegExp(pattern.replace('*', '.*'));
            return regex.test(name);
        }
        return name === pattern || name.startsWith('.');
    });
};

// 获取文件扩展名
const getExtension = (fileName: string): string => {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot === -1 ? '' : fileName.substring(lastDot + 1);
};

/**
 * 递归读取目录结构
 */
const readDirectoryRecursive = async (
    dirHandle: FileSystemDirectoryHandle,
    basePath: string = '',
    level: number = 0
): Promise<FileNode[]> => {
    const files: FileNode[] = [];
    
    try {
        for await (const [name, handle] of dirHandle.entries()) {
            // 跳过忽略的文件/文件夹
            if (shouldIgnore(name)) {
                continue;
            }

            const path = basePath ? `${basePath}/${name}` : name;

            if (handle.kind === 'directory') {
                // 目录节点
                const dirNode: FileNode = {
                    name,
                    path,
                    type: 'directory',
                    level,
                    isExpanded: false,
                    children: [] // 延迟加载
                };
                files.push(dirNode);
            } else if (handle.kind === 'file') {
                // 文件节点
                const extension = getExtension(name);
                const fileNode: FileNode = {
                    name,
                    path,
                    type: 'file',
                    extension,
                    level
                };
                files.push(fileNode);
            }
        }
    } catch (error) {
        console.error('Error reading directory:', error);
    }

    // 排序：目录在前，文件在后，同类型按名称排序
    files.sort((a, b) => {
        if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
    });

    return files;
};

/**
 * 动态加载目录内容
 */
export const loadDirectoryContent = async (
    dirHandle: FileSystemDirectoryHandle,
    relativePath: string,
    level: number
): Promise<FileNode[]> => {
    try {
        // 根据相对路径导航到目标目录
        let currentHandle = dirHandle;
        if (relativePath) {
            const pathParts = relativePath.split('/').filter(part => part);
            for (const part of pathParts) {
                currentHandle = await currentHandle.getDirectoryHandle(part);
            }
        }

        return await readDirectoryRecursive(currentHandle, relativePath, level);
    } catch (error) {
        console.error('Error loading directory content:', error);
        return [];
    }
};

/**
 * 读取文件内容
 */
export const readFileContent = async (
    dirHandle: FileSystemDirectoryHandle,
    filePath: string
): Promise<string> => {
    try {
        // 解析文件路径
        const pathParts = filePath.split('/').filter(part => part);
        const fileName = pathParts.pop();
        
        if (!fileName) {
            throw new Error('Invalid file path');
        }

        // 导航到文件所在目录
        let currentHandle = dirHandle;
        for (const part of pathParts) {
            currentHandle = await currentHandle.getDirectoryHandle(part);
        }

        // 获取文件句柄并读取内容
        const fileHandle = await currentHandle.getFileHandle(fileName);
        const file = await fileHandle.getFile();
        const content = await file.text();
        
        return content;
    } catch (error) {
        console.error('Error reading file:', error);
        throw new Error(`Failed to read file: ${filePath}`);
    }
};

/**
 * 让用户选择项目文件夹
 */
export const selectProjectDirectory = async (): Promise<{
    dirHandle: FileSystemDirectoryHandle;
    projectInfo: ProjectInfo;
} | null> => {
    try {
        if (!isFileSystemAPISupported()) {
            throw new Error('File System Access API is not supported in this browser');
        }

        // 让用户选择文件夹
        const dirHandle = await (window as any).showDirectoryPicker({
            mode: 'read',
            startIn: 'documents'
        });

        // 读取根目录内容
        const files = await readDirectoryRecursive(dirHandle, '', 0);

        const projectInfo: ProjectInfo = {
            name: dirHandle.name,
            path: dirHandle.name,
            description: `本地项目: ${dirHandle.name}`,
            files
        };

        return { dirHandle, projectInfo };
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            console.log('User cancelled directory selection');
            return null;
        }
        console.error('Error selecting directory:', error);
        throw error;
    }
};

/**
 * 批量选择多个项目文件夹
 */
export const selectMultipleProjects = async (): Promise<{
    projects: ProjectInfo[];
    dirHandles: Map<string, FileSystemDirectoryHandle>;
}> => {
    const projects: ProjectInfo[] = [];
    const dirHandles = new Map<string, FileSystemDirectoryHandle>();

    try {
        // 让用户选择第一个文件夹 (Forge)
        console.log('请选择 Minecraft Forge 项目文件夹...');
        const forgeResult = await selectProjectDirectory();
        if (forgeResult) {
            forgeResult.projectInfo.name = 'Minecraft Forge';
            forgeResult.projectInfo.description = 'Minecraft Forge 源代码';
            projects.push(forgeResult.projectInfo);
            dirHandles.set(forgeResult.projectInfo.path, forgeResult.dirHandle);
        }

        // 让用户选择第二个文件夹 (KubeJS)
        if (confirm('是否要添加 KubeJS 项目？')) {
            console.log('请选择 KubeJS 项目文件夹...');
            const kubeJSResult = await selectProjectDirectory();
            if (kubeJSResult) {
                kubeJSResult.projectInfo.name = 'KubeJS';
                kubeJSResult.projectInfo.description = 'KubeJS Mod 源代码';
                projects.push(kubeJSResult.projectInfo);
                dirHandles.set(kubeJSResult.projectInfo.path, kubeJSResult.dirHandle);
            }
        }

        return { projects, dirHandles };
    } catch (error) {
        console.error('Error selecting multiple projects:', error);
        throw error;
    }
};

/**
 * 搜索文件（在已加载的文件树中）
 */
export const searchInFileTree = (
    files: FileNode[],
    searchTerm: string
): FileNode[] => {
    const results: FileNode[] = [];
    
    const searchRecursive = (nodes: FileNode[]) => {
        for (const node of nodes) {
            if (node.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                results.push(node);
            }
            if (node.children) {
                searchRecursive(node.children);
            }
        }
    };
    
    searchRecursive(files);
    return results;
}; 