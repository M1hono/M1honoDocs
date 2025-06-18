import { FileNode, ProjectDocIndex, JavaClassDoc } from "../types";
import { JavaParser, createProjectDocIndex } from "./javaParser";

/**
 * 文档扫描器
 * 扫描项目并解析 Java 文件生成文档索引
 */
export class DocScanner {
    private parser = new JavaParser();

    /**
     * 扫描项目并生成文档索引
     */
    async scanProject(fileNodes: FileNode[]): Promise<ProjectDocIndex> {
        const allClasses: JavaClassDoc[] = [];

        // 递归扫描所有 Java 文件
        await this.scanDirectory(fileNodes, allClasses);

        // 创建索引
        return createProjectDocIndex(allClasses);
    }

    /**
     * 递归扫描目录
     */
    private async scanDirectory(
        nodes: FileNode[],
        allClasses: JavaClassDoc[]
    ): Promise<void> {
        for (const node of nodes) {
            if (node.type === "directory" && node.children) {
                await this.scanDirectory(node.children, allClasses);
            } else if (node.type === "file" && node.name.endsWith(".java")) {
                try {
                    const classes = await this.parseJavaFile(node.path);
                    allClasses.push(...classes);
                } catch (error) {
                    console.error(`解析 Java 文件失败: ${node.path}`, error);
                }
            }
        }
    }

    /**
     * 解析单个 Java 文件
     */
    private async parseJavaFile(filePath: string): Promise<JavaClassDoc[]> {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Failed to fetch file: ${response.statusText}`);
            }

            const sourceCode = await response.text();
            return this.parser.parseFile(sourceCode, filePath);
        } catch (error) {
            console.error(`Error parsing Java file ${filePath}:`, error);
            return [];
        }
    }

    /**
     * 扫描指定的文件并生成文档
     */
    async scanFiles(filePaths: string[]): Promise<ProjectDocIndex> {
        const allClasses: JavaClassDoc[] = [];

        for (const filePath of filePaths) {
            if (filePath.endsWith(".java")) {
                try {
                    const classes = await this.parseJavaFile(filePath);
                    allClasses.push(...classes);
                } catch (error) {
                    console.error(`解析 Java 文件失败: ${filePath}`, error);
                }
            }
        }

        return createProjectDocIndex(allClasses);
    }

    /**
     * 获取项目统计信息
     */
    getProjectStats(docIndex: ProjectDocIndex): {
        totalClasses: number;
        totalPackages: number;
        totalMethods: number;
        totalFields: number;
        packageStats: { packageName: string; classCount: number }[];
    } {
        const totalClasses = docIndex.classes.size;
        const totalPackages = docIndex.packages.size;

        let totalMethods = 0;
        let totalFields = 0;

        for (const classDoc of docIndex.classes.values()) {
            totalMethods += classDoc.methods.length;
            totalFields += classDoc.fields.length;
        }

        const packageStats: { packageName: string; classCount: number }[] = [];
        for (const [packageName, classes] of docIndex.packages.entries()) {
            packageStats.push({
                packageName,
                classCount: classes.length,
            });
        }

        // 按类数量排序
        packageStats.sort((a, b) => b.classCount - a.classCount);

        return {
            totalClasses,
            totalPackages,
            totalMethods,
            totalFields,
            packageStats,
        };
    }

    /**
     * 搜索类、方法、字段
     */
    search(
        docIndex: ProjectDocIndex,
        query: string
    ): {
        classes: JavaClassDoc[];
        methods: { classDoc: JavaClassDoc; method: any }[];
        fields: { classDoc: JavaClassDoc; field: any }[];
    } {
        const lowerQuery = query.toLowerCase();
        const results = {
            classes: [] as JavaClassDoc[],
            methods: [] as { classDoc: JavaClassDoc; method: any }[],
            fields: [] as { classDoc: JavaClassDoc; field: any }[],
        };

        for (const classDoc of docIndex.classes.values()) {
            // 搜索类名
            if (
                classDoc.className.toLowerCase().includes(lowerQuery) ||
                classDoc.fullName.toLowerCase().includes(lowerQuery) ||
                classDoc.packageName.toLowerCase().includes(lowerQuery) ||
                (classDoc.classComment &&
                    classDoc.classComment.toLowerCase().includes(lowerQuery))
            ) {
                results.classes.push(classDoc);
            }

            // 搜索方法
            for (const method of classDoc.methods) {
                if (
                    method.name.toLowerCase().includes(lowerQuery) ||
                    method.returnType.toLowerCase().includes(lowerQuery) ||
                    (method.comment &&
                        method.comment.toLowerCase().includes(lowerQuery)) ||
                    method.parameters.some(
                        (p) =>
                            p.name.toLowerCase().includes(lowerQuery) ||
                            p.type.toLowerCase().includes(lowerQuery)
                    )
                ) {
                    results.methods.push({ classDoc, method });
                }
            }

            // 搜索字段
            for (const field of classDoc.fields) {
                if (
                    field.name.toLowerCase().includes(lowerQuery) ||
                    field.type.toLowerCase().includes(lowerQuery) ||
                    (field.comment &&
                        field.comment.toLowerCase().includes(lowerQuery))
                ) {
                    results.fields.push({ classDoc, field });
                }
            }
        }

        return results;
    }

    /**
     * 获取包结构树
     */
    getPackageTree(docIndex: ProjectDocIndex): PackageTreeNode[] {
        const packageMap = new Map<string, PackageTreeNode>();

        // 创建包节点
        for (const [packageName, classes] of docIndex.packages.entries()) {
            const parts = packageName.split(".");
            let currentPath = "";

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const parentPath = currentPath;
                currentPath = currentPath ? `${currentPath}.${part}` : part;

                if (!packageMap.has(currentPath)) {
                    const node: PackageTreeNode = {
                        name: part,
                        fullName: currentPath,
                        type: "package",
                        children: [],
                        classes: i === parts.length - 1 ? classes : [],
                    };

                    packageMap.set(currentPath, node);

                    // 添加到父节点
                    if (parentPath) {
                        const parent = packageMap.get(parentPath);
                        if (parent) {
                            parent.children.push(node);
                        }
                    }
                }
            }
        }

        // 获取根节点（没有父节点的节点）
        const rootNodes: PackageTreeNode[] = [];
        for (const node of packageMap.values()) {
            const isRoot = !Array.from(packageMap.values()).some((other) =>
                other.children.includes(node)
            );
            if (isRoot) {
                rootNodes.push(node);
            }
        }

        return rootNodes;
    }
}

/**
 * 包树节点
 */
export interface PackageTreeNode {
    name: string;
    fullName: string;
    type: "package";
    children: PackageTreeNode[];
    classes: string[]; // 类的完整名称列表
}
