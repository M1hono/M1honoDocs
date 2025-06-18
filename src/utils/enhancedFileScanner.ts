import { FileNode } from '../types';

/**
 * 增强的文件扫描器
 * 专门用于深度扫描 Java 项目，确保找到所有类文件
 */
export class EnhancedFileScanner {
  private foundFiles: FileNode[] = [];
  private scannedPaths = new Set<string>();

  /**
   * 递归扫描指定路径下的所有 Java 文件
   */
  async scanJavaFiles(basePaths: string[]): Promise<FileNode[]> {
    this.foundFiles = [];
    this.scannedPaths.clear();

    for (const basePath of basePaths) {
      await this.scanDirectory(basePath);
    }

    console.log(`📁 文件扫描完成: 找到 ${this.foundFiles.length} 个 Java 文件`);
    return this.foundFiles;
  }

  /**
   * 递归扫描目录
   */
  private async scanDirectory(dirPath: string, depth: number = 0): Promise<void> {
    // 防止无限递归和重复扫描
    if (depth > 20 || this.scannedPaths.has(dirPath)) {
      return;
    }
    
    this.scannedPaths.add(dirPath);

    try {
      // 尝试读取目录内容
      const response = await fetch(dirPath);
      if (!response.ok) {
        // 如果无法作为目录读取，尝试作为文件读取
        if (dirPath.endsWith('.java')) {
          const fileResponse = await fetch(dirPath);
          if (fileResponse.ok) {
            this.foundFiles.push({
              name: dirPath.split('/').pop() || dirPath,
              path: dirPath,
              type: 'file'
            });
          }
        }
        return;
      }

      const content = await response.text();
      
      // 解析目录列表（假设服务器返回类似文件列表的内容）
      const entries = this.parseDirectoryListing(content, dirPath);
      
      for (const entry of entries) {
        if (entry.type === 'file' && entry.name.endsWith('.java')) {
          this.foundFiles.push(entry);
        } else if (entry.type === 'directory') {
          await this.scanDirectory(entry.path, depth + 1);
        }
      }
    } catch (error) {
      // 如果目录读取失败，尝试已知的子目录结构
      await this.scanKnownStructure(dirPath, depth);
    }
  }

  /**
   * 解析目录列表
   */
  private parseDirectoryListing(content: string, basePath: string): FileNode[] {
    const entries: FileNode[] = [];
    
    // 尝试解析 HTML 目录列表
    const lines = content.split('\n');
    for (const line of lines) {
      // 查找链接标签
      const linkMatch = line.match(/<a\s+href="([^"]+)">([^<]+)<\/a>/i);
      if (linkMatch) {
        const href = linkMatch[1];
        const name = linkMatch[2];
        
        // 跳过父目录链接
        if (href === '../' || href === './') continue;
        
        const fullPath = basePath.endsWith('/') ? basePath + href : basePath + '/' + href;
        
        if (href.endsWith('/')) {
          // 目录
          entries.push({
            name: name,
            path: fullPath.slice(0, -1), // 移除末尾的 /
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
    }
    
    return entries;
  }

  /**
   * 扫描已知的项目结构
   */
  private async scanKnownStructure(basePath: string, depth: number): Promise<void> {
    if (depth > 15) return;

    // Minecraft Forge 和 Mojang 的典型包结构
    const knownPaths = [
      'com', 'net', 'org', 'java', 'javax',
      'minecraft', 'mojang', 'authlib', 'blaze3d', 'brigadier',
      'datafixers', 'logging', 'math', 'realmsclient', 'serialization',
      'text2speech', 'util', 'client', 'server', 'world', 'entity',
      'block', 'item', 'recipe', 'tag', 'command', 'data', 'network',
      'resources', 'sounds', 'stats', 'advancements', 'core', 'gametest',
      'locale', 'nbt', 'obfuscate', 'realms', 'recipebook'
    ];

    for (const subPath of knownPaths) {
      const fullPath = basePath.endsWith('/') ? basePath + subPath : basePath + '/' + subPath;
      await this.scanDirectory(fullPath, depth + 1);
    }

    // 尝试直接扫描常见的文件
    const commonFiles = [
      'Minecraft.java', 'MinecraftServer.java', 'Level.java', 'Entity.java',
      'Player.java', 'Block.java', 'Item.java', 'Recipe.java', 'Command.java',
      'Packet.java', 'Codec.java', 'Registry.java', 'ResourceLocation.java'
    ];

    for (const fileName of commonFiles) {
      const filePath = basePath.endsWith('/') ? basePath + fileName : basePath + '/' + fileName;
      try {
        const response = await fetch(filePath);
        if (response.ok) {
          this.foundFiles.push({
            name: fileName,
            path: filePath,
            type: 'file'
          });
        }
      } catch (error) {
        // 忽略错误，继续尝试其他文件
      }
    }
  }

  /**
   * 使用批量路径扫描
   */
  async batchScanPaths(): Promise<FileNode[]> {
    const basePaths = [
      '/forge-1.20.1-47.1.99/com',
      '/forge-1.20.1-47.1.99/net',
      '/KubeJS-2001/common/src/main/java',
      '/KubeJS-2001/forge/src/main/java'
    ];

    // 扩展路径列表，包含更深层的包路径
    const expandedPaths: string[] = [...basePaths];
    
    // Mojang 包路径
    const mojangPaths = [
      '/forge-1.20.1-47.1.99/com/mojang/authlib',
      '/forge-1.20.1-47.1.99/com/mojang/blaze3d',
      '/forge-1.20.1-47.1.99/com/mojang/brigadier',
      '/forge-1.20.1-47.1.99/com/mojang/datafixers',
      '/forge-1.20.1-47.1.99/com/mojang/logging',
      '/forge-1.20.1-47.1.99/com/mojang/math',
      '/forge-1.20.1-47.1.99/com/mojang/realmsclient',
      '/forge-1.20.1-47.1.99/com/mojang/serialization',
      '/forge-1.20.1-47.1.99/com/mojang/text2speech',
      '/forge-1.20.1-47.1.99/com/mojang/util'
    ];

    // Minecraft 包路径
    const minecraftPaths = [
      '/forge-1.20.1-47.1.99/net/minecraft/client',
      '/forge-1.20.1-47.1.99/net/minecraft/server',
      '/forge-1.20.1-47.1.99/net/minecraft/world',
      '/forge-1.20.1-47.1.99/net/minecraft/core',
      '/forge-1.20.1-47.1.99/net/minecraft/data',
      '/forge-1.20.1-47.1.99/net/minecraft/gametest',
      '/forge-1.20.1-47.1.99/net/minecraft/locale',
      '/forge-1.20.1-47.1.99/net/minecraft/nbt',
      '/forge-1.20.1-47.1.99/net/minecraft/network',
      '/forge-1.20.1-47.1.99/net/minecraft/obfuscate',
      '/forge-1.20.1-47.1.99/net/minecraft/realms',
      '/forge-1.20.1-47.1.99/net/minecraft/recipebook',
      '/forge-1.20.1-47.1.99/net/minecraft/resources',
      '/forge-1.20.1-47.1.99/net/minecraft/sounds',
      '/forge-1.20.1-47.1.99/net/minecraft/stats',
      '/forge-1.20.1-47.1.99/net/minecraft/tags',
      '/forge-1.20.1-47.1.99/net/minecraft/util',
      '/forge-1.20.1-47.1.99/net/minecraft/advancements',
      '/forge-1.20.1-47.1.99/net/minecraft/commands'
    ];

    // Forge 包路径
    const forgePaths = [
      '/forge-1.20.1-47.1.99/net/minecraftforge/common',
      '/forge-1.20.1-47.1.99/net/minecraftforge/client',
      '/forge-1.20.1-47.1.99/net/minecraftforge/server',
      '/forge-1.20.1-47.1.99/net/minecraftforge/event',
      '/forge-1.20.1-47.1.99/net/minecraftforge/fml',
      '/forge-1.20.1-47.1.99/net/minecraftforge/network',
      '/forge-1.20.1-47.1.99/net/minecraftforge/registries',
      '/forge-1.20.1-47.1.99/net/minecraftforge/fluids',
      '/forge-1.20.1-47.1.99/net/minecraftforge/energy',
      '/forge-1.20.1-47.1.99/net/minecraftforge/items'
    ];

    expandedPaths.push(...mojangPaths, ...minecraftPaths, ...forgePaths);

    return await this.scanJavaFiles(expandedPaths);
  }

  /**
   * 获取扫描统计信息
   */
  getStats(): { totalFiles: number; scannedPaths: number } {
    return {
      totalFiles: this.foundFiles.length,
      scannedPaths: this.scannedPaths.size
    };
  }
} 