#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class JavaFileScanner {
    constructor() {
        this.javaFiles = [];
        this.baseDir = path.join(__dirname, "..", "forge-1.20.1-47.1.99");
        this.outputDir = path.join(__dirname, "..", "public", "java-files");
    }

    async scan() {
        console.log("🔍 开始扫描Java文件...");

        if (!fs.existsSync(this.baseDir)) {
            console.error(`❌ 目录不存在: ${this.baseDir}`);
            return;
        }

        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }

        this.scanDirectory(this.baseDir);

        console.log(`📁 发现 ${this.javaFiles.length} 个Java文件`);

        await this.generateIndex();

        await this.copyFilesToPublic();

        console.log("✅ 扫描完成!");
    }

    scanDirectory(dirPath) {
        try {
            const items = fs.readdirSync(dirPath, { withFileTypes: true });

            for (const item of items) {
                const fullPath = path.join(dirPath, item.name);

                if (item.isDirectory()) {
                    this.scanDirectory(fullPath);
                } else if (item.name.endsWith(".java")) {
                    const relativePath = path.relative(
                        path.join(__dirname, ".."),
                        fullPath
                    );
                    this.javaFiles.push(relativePath.replace(/\\/g, "/"));
                }
            }
        } catch (error) {
            console.warn(`⚠️  无法扫描目录: ${dirPath}`, error.message);
        }
    }

    async generateIndex() {
        const index = {
            totalFiles: this.javaFiles.length,
            lastUpdated: new Date().toISOString(),
            files: this.javaFiles,
        };

        const indexPath = path.join(this.outputDir, "index.json");
        fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

        console.log(`📝 生成索引文件: ${indexPath}`);
    }

    async copyFilesToPublic() {
        console.log("📂 复制Java文件到public目录...");

        let copiedCount = 0;

        for (const filePath of this.javaFiles) {
            try {
                const sourcePath = path.join(__dirname, "..", filePath);
                const targetPath = path.join(
                    this.outputDir,
                    filePath.replace("forge-1.20.1-47.1.99/", "")
                );

                const targetDir = path.dirname(targetPath);
                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }

                fs.copyFileSync(sourcePath, targetPath);
                copiedCount++;

                if (copiedCount % 100 === 0) {
                    console.log(
                        `  已复制 ${copiedCount}/${this.javaFiles.length} 个文件...`
                    );
                }
            } catch (error) {
                console.warn(`⚠️  复制失败: ${filePath}`, error.message);
            }
        }

        console.log(`✅ 复制完成: ${copiedCount} 个文件`);
    }

    async generateTypeScriptFileList() {
        const filePaths = this.javaFiles
            .map((file) => `'${file}'`)
            .join(",\n        ");

        const tsContent = `/**
 * 自动生成的Java文件列表
 * 由 scanJavaFiles.js 脚本生成
 */
export const JAVA_FILE_PATHS: string[] = [
        ${filePaths}
];

export const JAVA_FILE_COUNT = ${this.javaFiles.length};
`;

        const tsPath = path.join(
            __dirname,
            "..",
            "src",
            "utils",
            "javaFilePaths.ts"
        );
        fs.writeFileSync(tsPath, tsContent);

        console.log(`📝 生成TypeScript文件列表: ${tsPath}`);
    }
}

const scanner = new JavaFileScanner();
scanner
    .scan()
    .then(() => {
        scanner.generateTypeScriptFileList();
    })
    .catch((error) => {
        console.error("❌ 扫描失败:", error);
        process.exit(1);
    });

export default JavaFileScanner;
