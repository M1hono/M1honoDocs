import { ProjectDocIndex, JavaClassDoc } from "../types";
import { EnhancedFileScanner } from "./enhancedFileScanner";
import { EnhancedJavaParser } from "./enhancedJavaParser";

/**
 * 增强版文档扫描器
 * 使用增强的文件扫描器和 Java 解析器，确保扫描到所有类
 */
export class EnhancedDocScanner {
    private fileScanner = new EnhancedFileScanner();

    /**
     * 扫描项目并生成完整的文档索引
     */
    async scanProject(): Promise<ProjectDocIndex> {
        console.log("🚀 开始增强版项目扫描...");

        // 使用批量路径扫描找到所有 Java 文件
        const javaFiles = await this.fileScanner.batchScanPaths();

        console.log(`📁 发现 ${javaFiles.length} 个 Java 文件`);

        const docIndex: ProjectDocIndex = {
            classes: new Map(),
            packages: new Map(),
            fileToClasses: new Map(),
        };

        // 解析每个 Java 文件
        let processedFiles = 0;
        let totalClasses = 0;
        let totalMethods = 0;
        let totalFields = 0;

        for (const file of javaFiles) {
            try {
                // 读取文件内容
                const sourceCode = await this.readFileContent(file.path);
                if (!sourceCode) continue;

                // 解析 Java 文件
                const classes = EnhancedJavaParser.parseJavaFile(
                    sourceCode,
                    file.path
                );

                if (classes.length > 0) {
                    processedFiles++;

                    // 记录文件到类的映射
                    const classNames = classes.map((cls) => cls.fullName);
                    docIndex.fileToClasses.set(file.path, classNames);

                    for (const classDoc of classes) {
                        // 添加类到索引
                        docIndex.classes.set(classDoc.fullName, classDoc);

                        // 更新包映射
                        const packageName = classDoc.packageName || "";
                        if (!docIndex.packages.has(packageName)) {
                            docIndex.packages.set(packageName, []);
                        }
                        const packageClasses =
                            docIndex.packages.get(packageName)!;
                        if (!packageClasses.includes(classDoc.fullName)) {
                            packageClasses.push(classDoc.fullName);
                        }

                        // 统计信息
                        totalClasses++;
                        totalMethods += classDoc.methods.length;
                        totalFields += classDoc.fields.length;
                    }
                }
            } catch (error) {
                console.warn(`解析文件失败: ${file.path}`, error);
            }
        }

        // 优化包结构
        this.optimizePackageStructure(docIndex);

        console.log(`✅ 扫描完成!`);
        console.log(`📊 统计信息:`);
        console.log(`   - 处理文件: ${processedFiles} / ${javaFiles.length}`);
        console.log(`   - 解析类: ${totalClasses}`);
        console.log(`   - 解析方法: ${totalMethods}`);
        console.log(`   - 解析字段: ${totalFields}`);
        console.log(`   - 包数量: ${docIndex.packages.size}`);

        return docIndex;
    }

    /**
     * 读取文件内容
     */
    private async readFileContent(filePath: string): Promise<string> {
        try {
            const response = await fetch(filePath);
            if (response.ok) {
                return await response.text();
            }
        } catch (error) {
            console.warn(`读取文件失败: ${filePath}`, error);
        }
        return "";
    }

    /**
     * 优化包结构，处理空包和重复项
     */
    private optimizePackageStructure(docIndex: ProjectDocIndex): void {
        // 移除空包
        for (const [packageName, classes] of docIndex.packages.entries()) {
            if (classes.length === 0) {
                docIndex.packages.delete(packageName);
            } else {
                // 移除重复的类
                const uniqueClasses = [...new Set(classes)];
                docIndex.packages.set(packageName, uniqueClasses);
            }
        }

        // 对包内的类进行排序
        for (const [packageName, classes] of docIndex.packages.entries()) {
            classes.sort();
            docIndex.packages.set(packageName, classes);
        }
    }

    /**
     * 获取扫描统计信息
     */
    getStats(docIndex: ProjectDocIndex) {
        let totalMethods = 0;
        let totalFields = 0;

        for (const classDoc of docIndex.classes.values()) {
            totalMethods += classDoc.methods.length;
            totalFields += classDoc.fields.length;
        }

        return {
            totalClasses: docIndex.classes.size,
            totalPackages: docIndex.packages.size,
            totalMethods,
            totalFields,
            totalFiles: docIndex.fileToClasses.size,
        };
    }

    /**
     * 验证扫描结果的完整性
     */
    validateScanResults(docIndex: ProjectDocIndex): boolean {
        const issues: string[] = [];

        // 检查类数量是否合理
        if (docIndex.classes.size < 100) {
            issues.push(
                `类数量过少: ${docIndex.classes.size}，预期应该有数千个类`
            );
        }

        // 检查重要的包是否存在
        const expectedPackages = [
            "com.mojang",
            "net.minecraft",
            "net.minecraftforge",
        ];

        for (const expectedPkg of expectedPackages) {
            let found = false;
            for (const [packageName] of docIndex.packages) {
                if (packageName.startsWith(expectedPkg)) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                issues.push(`缺少重要包: ${expectedPkg}`);
            }
        }

        // 检查类的完整性
        let incompleteClasses = 0;
        for (const [, classDoc] of docIndex.classes) {
            if (classDoc.methods.length === 0 && classDoc.fields.length === 0) {
                incompleteClasses++;
            }
        }

        if (incompleteClasses > docIndex.classes.size * 0.5) {
            issues.push(
                `大量类缺少方法和字段: ${incompleteClasses}/${docIndex.classes.size}`
            );
        }

        if (issues.length > 0) {
            console.warn("⚠️ 扫描结果验证发现问题:");
            issues.forEach((issue) => console.warn(`   - ${issue}`));
            return false;
        }

        console.log("✅ 扫描结果验证通过");
        return true;
    }

    /**
     * 获取扫描器统计信息
     */
    getScannerStats() {
        return this.fileScanner.getStats();
    }
}
