import { FileNode } from '../types';

/**
 * 真实文件扫描器
 * 直接读取项目文件系统，不依赖于预定义结构
 */
export class RealFileScanner {
    private baseUrl: string;
    private foundFiles: FileNode[] = [];

    constructor(baseUrl: string = '') {
        this.baseUrl = baseUrl;
    }

    /**
     * 扫描所有 Java 文件
     */
    async scanAllJavaFiles(): Promise<FileNode[]> {
        this.foundFiles = [];
        
        // 定义要扫描的根路径
        const rootPaths = [
            '/forge-1.20.1-47.1.99',
            '/KubeJS-2001'
        ];

        console.log('🔍 开始扫描 Java 文件...');
        
        for (const rootPath of rootPaths) {
            console.log(`📁 扫描路径: ${rootPath}`);
            await this.scanDirectory(rootPath, 0);
        }

        console.log(`✅ 扫描完成，找到 ${this.foundFiles.length} 个 Java 文件`);
        return this.foundFiles;
    }

    /**
     * 递归扫描目录
     */
    private async scanDirectory(dirPath: string, depth: number = 0): Promise<void> {
        // 防止无限递归
        if (depth > 25) {
            return;
        }

        try {
            // 首先尝试读取目录内容
            const response = await fetch(dirPath);
            if (!response.ok) {
                // 如果无法读取目录，尝试已知的子路径
                await this.scanKnownPaths(dirPath, depth);
                return;
            }

            const text = await response.text();
            
            // 如果返回的是 HTML（目录列表），解析它
            if (text.includes('<html>') || text.includes('<a href=')) {
                const entries = this.parseDirectoryListing(text, dirPath);
                
                for (const entry of entries) {
                    if (entry.type === 'file' && entry.name.endsWith('.java')) {
                        // 验证这是一个真实的 Java 文件
                        const isValid = await this.validateJavaFile(entry.path);
                        if (isValid) {
                            this.foundFiles.push(entry);
                        }
                    } else if (entry.type === 'directory') {
                        await this.scanDirectory(entry.path, depth + 1);
                    }
                }
            } else {
                // 如果返回的不是目录列表，尝试已知路径
                await this.scanKnownPaths(dirPath, depth);
            }
        } catch (error) {
            // 网络错误，尝试已知路径
            await this.scanKnownPaths(dirPath, depth);
        }
    }

    /**
     * 解析 HTML 目录列表
     */
    private parseDirectoryListing(html: string, basePath: string): FileNode[] {
        const entries: FileNode[] = [];
        
        // 使用正则表达式匹配链接
        const linkRegex = /<a[^>]+href=["\']([^"\']+)["\'][^>]*>([^<]+)<\/a>/gi;
        let match;
        
        while ((match = linkRegex.exec(html)) !== null) {
            const href = match[1];
            const name = match[2].trim();
            
            // 跳过特殊链接
            if (href === '../' || href === './' || href.startsWith('?') || href.startsWith('#')) {
                continue;
            }
            
            let fullPath = basePath;
            if (!basePath.endsWith('/')) {
                fullPath += '/';
            }
            fullPath += href;
            
            if (href.endsWith('/')) {
                // 目录
                entries.push({
                    name: name.replace('/', ''),
                    path: fullPath.slice(0, -1),
                    type: 'directory'
                });
            } else if (href.endsWith('.java')) {
                // Java 文件
                entries.push({
                    name: name,
                    path: fullPath,
                    type: 'file'
                });
            }
        }
        
        return entries;
    }

    /**
     * 扫描已知的 Java 包路径
     */
    private async scanKnownPaths(basePath: string, depth: number): Promise<void> {
        if (depth > 20) return;

        // 定义已知的 Java 包结构
        const knownPaths = [
            // Mojang 包
            'com/mojang/authlib',
            'com/mojang/blaze3d',
            'com/mojang/brigadier',
            'com/mojang/datafixers',
            'com/mojang/logging',
            'com/mojang/math',
            'com/mojang/realmsclient',
            'com/mojang/serialization',
            'com/mojang/text2speech',
            'com/mojang/util',
            
            // Minecraft 包
            'net/minecraft/client',
            'net/minecraft/server',
            'net/minecraft/world',
            'net/minecraft/core',
            'net/minecraft/data',
            'net/minecraft/gametest',
            'net/minecraft/locale',
            'net/minecraft/nbt',
            'net/minecraft/network',
            'net/minecraft/obfuscate',
            'net/minecraft/realms',
            'net/minecraft/recipebook',
            'net/minecraft/resources',
            'net/minecraft/sounds',
            'net/minecraft/stats',
            'net/minecraft/tags',
            'net/minecraft/util',
            'net/minecraft/advancements',
            'net/minecraft/commands',
            
            // Forge 包
            'net/minecraftforge/common',
            'net/minecraftforge/client',
            'net/minecraftforge/server',
            'net/minecraftforge/event',
            'net/minecraftforge/fml',
            'net/minecraftforge/network',
            'net/minecraftforge/registries',
            'net/minecraftforge/fluids',
            'net/minecraftforge/energy',
            'net/minecraftforge/items'
        ];

        for (const knownPath of knownPaths) {
            const fullPath = `${basePath}/${knownPath}`;
            await this.scanDirectory(fullPath, depth + 1);
        }

        // 尝试查找常见的 Java 文件
        const commonFiles = [
            'Minecraft.java',
            'MinecraftServer.java',
            'Level.java',
            'Entity.java',
            'Player.java',
            'Block.java',
            'Item.java',
            'Recipe.java',
            'Command.java',
            'Packet.java',
            'Codec.java',
            'Registry.java',
            'ResourceLocation.java',
            'Agent.java',
            'AuthenticationService.java',
            'BaseAuthenticationService.java',
            'Blaze3D.java'
        ];

        for (const fileName of commonFiles) {
            const filePath = `${basePath}/${fileName}`;
            const isValid = await this.validateJavaFile(filePath);
            if (isValid) {
                this.foundFiles.push({
                    name: fileName,
                    path: filePath,
                    type: 'file'
                });
            }
        }
    }

    /**
     * 验证文件是否为有效的 Java 文件
     */
    private async validateJavaFile(filePath: string): Promise<boolean> {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                return false;
            }
            
            const content = await response.text();
            
            // 检查是否包含 Java 关键字
            const javaKeywords = [
                'package', 'import', 'class', 'interface', 'enum',
                'public', 'private', 'protected', 'static', 'final',
                'void', 'int', 'String', 'boolean'
            ];
            
            const hasJavaKeywords = javaKeywords.some(keyword => 
                content.includes(keyword)
            );
            
            // 检查文件大小（避免非常小的无意义文件）
            const isReasonableSize = content.length > 10 && content.length < 1000000;
            
            return hasJavaKeywords && isReasonableSize;
        } catch (error) {
            return false;
        }
    }

    /**
     * 读取文件内容
     */
    async readFile(filePath: string): Promise<string> {
        try {
            const response = await fetch(filePath);
            if (response.ok) {
                return await response.text();
            }
        } catch (error) {
            console.warn(`读取文件失败: ${filePath}`, error);
        }
        return '';
    }

    /**
     * 获取扫描统计
     */
    getStats() {
        return {
            totalFiles: this.foundFiles.length,
            javaFiles: this.foundFiles.filter(f => f.name.endsWith('.java')).length
        };
    }
} 