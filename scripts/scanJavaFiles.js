#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class JavaFileScanner {
    constructor(version) {
        this.version = version;
        this.javaFiles = [];
        this.baseDir = path.join(__dirname, "..", "source", this.version);
        this.outputDir = path.join(
            __dirname,
            "..",
            "public",
            "java-files",
            this.version
        );
    }

    async scan() {
        console.log(`🔍 开始扫描Java文件 (版本: ${this.version})...`);

        if (!fs.existsSync(this.baseDir)) {
            console.error(`❌ 目录不存在: ${this.baseDir}`);
            console.error(
                `   请确保 source/${this.version} 目录存在并且包含Java源代码。`
            );
            return;
        }

        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }

        this.scanDirectory(this.baseDir);

        console.log(`📁 [${this.version}] 发现 ${this.javaFiles.length} 个Java文件`);

        await this.generateIndex();

        await this.copyFilesToPublic();

        console.log(`✅ [${this.version}] 扫描完成!`);
    }

    scanDirectory(dirPath) {
        try {
            const items = fs.readdirSync(dirPath, { withFileTypes: true });

            for (const item of items) {
                const fullPath = path.join(dirPath, item.name);

                if (item.isDirectory()) {
                    this.scanDirectory(fullPath);
                } else if (item.name.endsWith(".java")) {
                    const relativePath = path.relative(this.baseDir, fullPath);
                    this.javaFiles.push(relativePath.replace(/\\/g, "/"));
                }
            }
        } catch (error) {
            console.warn(`⚠️  无法扫描目录: ${dirPath}`, error.message);
        }
    }

    async generateIndex() {
        const index = {
            version: this.version,
            totalFiles: this.javaFiles.length,
            lastUpdated: new Date().toISOString(),
            files: this.javaFiles,
        };

        const indexPath = path.join(this.outputDir, "index.json");
        fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

        console.log(`📝 [${this.version}] 生成索引文件: ${indexPath}`);
    }

    async copyFilesToPublic() {
        console.log(`📂 [${this.version}] 复制Java文件到public目录...`);

        let copiedCount = 0;

        for (const filePath of this.javaFiles) {
            try {
                const sourcePath = path.join(this.baseDir, filePath);
                const targetPath = path.join(this.outputDir, filePath);

                const targetDir = path.dirname(targetPath);
                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }

                fs.copyFileSync(sourcePath, targetPath);
                copiedCount++;

                if (copiedCount % 500 === 0) {
                    console.log(
                        `  [${this.version}] 已复制 ${copiedCount}/${this.javaFiles.length} 个文件...`
                    );
                }
            } catch (error) {
                console.warn(`⚠️  [${this.version}] 复制失败: ${filePath}`, error.message);
            }
        }

        console.log(`✅ [${this.version}] 复制完成: ${copiedCount} 个文件`);
    }
}

async function main() {
    const versionsPath = path.join(__dirname, "../public/versions.json");
    if (!fs.existsSync(versionsPath)) {
        console.error(`❌ versions.json not found at ${versionsPath}`);
        process.exit(1);
    }
    const versions = JSON.parse(fs.readFileSync(versionsPath, "utf-8"));

    for (const version of versions) {
        console.log(`\n\n🚀 开始为版本 [${version}] 扫描...`);
        try {
            const scanner = new JavaFileScanner(version);
            await scanner.scan();
            console.log(`🎉 成功完成版本 [${version}] 的扫描`);
        } catch (error) {
            console.error(`❌ 扫描失败 for version ${version}:`, error);
        }
    }
    console.log("\n\n✅ 所有版本扫描完成!");
}

main().catch((error) => {
    console.error("❌ 扫描过程发生严重错误:", error);
    process.exit(1);
});

export default JavaFileScanner;

