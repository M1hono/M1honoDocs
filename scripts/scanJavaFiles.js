#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 扫描Java文件的Node.js脚本
 * 生成完整的文件列表和内容索引
 */
class JavaFileScanner {
    constructor() {
        this.javaFiles = [];
        this.baseDir = path.join(__dirname, '..', 'forge-1.20.1-47.1.99');
        this.outputDir = path.join(__dirname, '..', 'public', 'java-files');
    }

    /**
     * 开始扫描
     */
    async scan() {
        console.log('🔍 开始扫描Java文件...');
        
        if (!fs.existsSync(this.baseDir)) {
            console.error(`❌ 目录不存在: ${this.baseDir}`);
            return;
        }

        // 确保输出目录存在
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }

        // 递归扫描目录
        this.scanDirectory(this.baseDir);
        
        console.log(`📁 发现 ${this.javaFiles.length} 个Java文件`);

        // 生成文件索引
        await this.generateIndex();
        
        // 复制文件到public目录
        await this.copyFilesToPublic();

        console.log('✅ 扫描完成!');
    }

    /**
     * 递归扫描目录
     */
    scanDirectory(dirPath) {
        try {
            const items = fs.readdirSync(dirPath, { withFileTypes: true });
            
            for (const item of items) {
                const fullPath = path.join(dirPath, item.name);
                
                if (item.isDirectory()) {
                    // 递归扫描子目录
                    this.scanDirectory(fullPath);
                } else if (item.name.endsWith('.java')) {
                    // 添加Java文件
                    const relativePath = path.relative(path.join(__dirname, '..'), fullPath);
                    this.javaFiles.push(relativePath.replace(/\\/g, '/'));
                }
            }
        } catch (error) {
            console.warn(`⚠️  无法扫描目录: ${dirPath}`, error.message);
        }
    }

    /**
     * 生成文件索引
     */
    async generateIndex() {
        const index = {
            totalFiles: this.javaFiles.length,
            lastUpdated: new Date().toISOString(),
            files: this.javaFiles
        };

        const indexPath = path.join(this.outputDir, 'index.json');
        fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
        
        console.log(`📝 生成索引文件: ${indexPath}`);
    }

    /**
     * 复制文件到public目录以便前端访问
     */
    async copyFilesToPublic() {
        console.log('📂 复制Java文件到public目录...');
        
        let copiedCount = 0;
        
        for (const filePath of this.javaFiles) {
            try {
                const sourcePath = path.join(__dirname, '..', filePath);
                const targetPath = path.join(this.outputDir, filePath.replace('forge-1.20.1-47.1.99/', ''));
                
                // 确保目标目录存在
                const targetDir = path.dirname(targetPath);
                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }

                // 复制文件
                fs.copyFileSync(sourcePath, targetPath);
                copiedCount++;
                
                if (copiedCount % 100 === 0) {
                    console.log(`  已复制 ${copiedCount}/${this.javaFiles.length} 个文件...`);
                }
            } catch (error) {
                console.warn(`⚠️  复制失败: ${filePath}`, error.message);
            }
        }
        
        console.log(`✅ 复制完成: ${copiedCount} 个文件`);
    }

    /**
     * 生成TypeScript文件列表
     */
    async generateTypeScriptFileList() {
        const filePaths = this.javaFiles.map(file => `'${file}'`).join(',\n        ');
        
        const tsContent = `/**
 * 自动生成的Java文件列表
 * 由 scanJavaFiles.js 脚本生成
 */
export const JAVA_FILE_PATHS: string[] = [
        ${filePaths}
];

export const JAVA_FILE_COUNT = ${this.javaFiles.length};
`;

        const tsPath = path.join(__dirname, '..', 'src', 'utils', 'javaFilePaths.ts');
        fs.writeFileSync(tsPath, tsContent);
        
        console.log(`📝 生成TypeScript文件列表: ${tsPath}`);
    }
}

// 运行扫描
const scanner = new JavaFileScanner();
scanner.scan().then(() => {
    scanner.generateTypeScriptFileList();
}).catch(error => {
    console.error('❌ 扫描失败:', error);
    process.exit(1);
});

export default JavaFileScanner; 