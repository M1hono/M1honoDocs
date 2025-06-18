import { JavaClassDoc, JavaMethodDoc, ProjectDocIndex } from "../types";

/**
 * 交叉引用信息
 */
export interface CrossReference {
    /** 引用者的类 */
    referencedBy: string;
    /** 引用者的文件路径 */
    filePath: string;
    /** 引用的类型 (import, extends, implements, field, method_call, parameter, return_type) */
    referenceType:
        | "import"
        | "extends"
        | "implements"
        | "field"
        | "method_call"
        | "parameter"
        | "return_type"
        | "annotation";
    /** 引用的具体位置 */
    location: {
        line: number;
        context: string; // 引用的上下文代码
    };
    /** 如果是方法调用，记录方法名 */
    methodName?: string;
    /** 如果是字段引用，记录字段名 */
    fieldName?: string;
}

/**
 * 类的使用统计
 */
export interface ClassUsage {
    /** 被引用的总次数 */
    totalReferences: number;
    /** 被多少个不同的类引用 */
    referencedByCount: number;
    /** 详细的引用信息 */
    references: CrossReference[];
    /** 按引用类型分组的统计 */
    referencesByType: Map<string, CrossReference[]>;
}

/**
 * 方法的使用统计
 */
export interface MethodUsage {
    /** 方法的完整签名 */
    methodSignature: string;
    /** 被调用的总次数 */
    totalCalls: number;
    /** 被多少个不同的类调用 */
    calledByCount: number;
    /** 调用详情 */
    calls: CrossReference[];
}

/**
 * 交叉引用分析器
 * 分析代码中的引用关系，找出谁使用了哪个类或方法
 */
export class CrossReferenceAnalyzer {
    private docIndex: ProjectDocIndex;
    private sourceCodeCache = new Map<string, string>();

    constructor(docIndex: ProjectDocIndex) {
        this.docIndex = docIndex;
    }

    /**
     * 分析指定类的使用情况
     */
    async analyzeClassUsage(className: string): Promise<ClassUsage> {
        const references: CrossReference[] = [];

        // 遍历所有类，查找对指定类的引用
        for (const [, classDoc] of this.docIndex.classes) {
            const classRefs = await this.findClassReferencesInClass(
                className,
                classDoc
            );
            references.push(...classRefs);
        }

        // 按引用类型分组
        const referencesByType = new Map<string, CrossReference[]>();
        references.forEach((ref) => {
            const refs = referencesByType.get(ref.referenceType) || [];
            refs.push(ref);
            referencesByType.set(ref.referenceType, refs);
        });

        // 计算被多少个不同的类引用
        const referencedBySet = new Set(
            references.map((ref) => ref.referencedBy)
        );

        return {
            totalReferences: references.length,
            referencedByCount: referencedBySet.size,
            references,
            referencesByType,
        };
    }

    /**
     * 分析指定方法的使用情况
     */
    async analyzeMethodUsage(
        className: string,
        methodName: string
    ): Promise<MethodUsage> {
        const calls: CrossReference[] = [];

        // 遍历所有类，查找对指定方法的调用
        for (const [, classDoc] of this.docIndex.classes) {
            const methodCalls = await this.findMethodCallsInClass(
                className,
                methodName,
                classDoc
            );
            calls.push(...methodCalls);
        }

        // 计算被多少个不同的类调用
        const calledBySet = new Set(calls.map((call) => call.referencedBy));

        return {
            methodSignature: `${className}.${methodName}`,
            totalCalls: calls.length,
            calledByCount: calledBySet.size,
            calls,
        };
    }

    /**
     * 在指定类中查找对目标类的引用
     */
    private async findClassReferencesInClass(
        targetClass: string,
        classDoc: JavaClassDoc
    ): Promise<CrossReference[]> {
        const references: CrossReference[] = [];
        const sourceCode = await this.getSourceCode(classDoc.filePath);
        const lines = sourceCode.split("\n");

        // 检查继承关系
        if (classDoc.superClass === targetClass) {
            const line = this.findLineContaining(
                lines,
                `extends ${targetClass}`
            );
            if (line.lineNumber !== -1) {
                references.push({
                    referencedBy: classDoc.fullName,
                    filePath: classDoc.filePath,
                    referenceType: "extends",
                    location: {
                        line: line.lineNumber + 1,
                        context: line.content,
                    },
                });
            }
        }

        // 检查接口实现
        if (classDoc.interfaces.includes(targetClass)) {
            const line = this.findLineContaining(
                lines,
                `implements.*${targetClass}`
            );
            if (line.lineNumber !== -1) {
                references.push({
                    referencedBy: classDoc.fullName,
                    filePath: classDoc.filePath,
                    referenceType: "implements",
                    location: {
                        line: line.lineNumber + 1,
                        context: line.content,
                    },
                });
            }
        }

        // 检查字段类型
        for (const field of classDoc.fields) {
            if (field.type.includes(targetClass)) {
                const line = this.findLineContaining(lines, field.name);
                if (line.lineNumber !== -1) {
                    references.push({
                        referencedBy: classDoc.fullName,
                        filePath: classDoc.filePath,
                        referenceType: "field",
                        location: {
                            line: line.lineNumber + 1,
                            context: line.content,
                        },
                        fieldName: field.name,
                    });
                }
            }
        }

        // 检查方法参数和返回类型
        for (const method of classDoc.methods) {
            // 检查返回类型
            if (method.returnType.includes(targetClass)) {
                const line = this.findLineContaining(lines, method.name);
                if (line.lineNumber !== -1) {
                    references.push({
                        referencedBy: classDoc.fullName,
                        filePath: classDoc.filePath,
                        referenceType: "return_type",
                        location: {
                            line: line.lineNumber + 1,
                            context: line.content,
                        },
                        methodName: method.name,
                    });
                }
            }

            // 检查参数类型
            for (const param of method.parameters) {
                if (param.type.includes(targetClass)) {
                    const line = this.findLineContaining(lines, method.name);
                    if (line.lineNumber !== -1) {
                        references.push({
                            referencedBy: classDoc.fullName,
                            filePath: classDoc.filePath,
                            referenceType: "parameter",
                            location: {
                                line: line.lineNumber + 1,
                                context: line.content,
                            },
                            methodName: method.name,
                        });
                    }
                }
            }
        }

        // 检查 import 语句
        const importLine = this.findLineContaining(
            lines,
            `import.*${targetClass}`
        );
        if (importLine.lineNumber !== -1) {
            references.push({
                referencedBy: classDoc.fullName,
                filePath: classDoc.filePath,
                referenceType: "import",
                location: {
                    line: importLine.lineNumber + 1,
                    context: importLine.content,
                },
            });
        }

        // 检查方法体中的使用（简单的文本匹配）
        const methodBodyRefs = this.findMethodBodyReferences(
            lines,
            targetClass,
            classDoc
        );
        references.push(...methodBodyRefs);

        return references;
    }

    /**
     * 在指定类中查找对目标方法的调用
     */
    private async findMethodCallsInClass(
        targetClass: string,
        methodName: string,
        classDoc: JavaClassDoc
    ): Promise<CrossReference[]> {
        const calls: CrossReference[] = [];
        const sourceCode = await this.getSourceCode(classDoc.filePath);
        const lines = sourceCode.split("\n");

        // 查找方法调用模式：obj.methodName( 或 ClassName.methodName(
        const patterns = [
            new RegExp(`\\.${methodName}\\s*\\(`, "g"),
            new RegExp(`${targetClass}\\.${methodName}\\s*\\(`, "g"),
        ];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            for (const pattern of patterns) {
                if (pattern.test(line)) {
                    calls.push({
                        referencedBy: classDoc.fullName,
                        filePath: classDoc.filePath,
                        referenceType: "method_call",
                        location: {
                            line: i + 1,
                            context: line.trim(),
                        },
                        methodName,
                    });
                }
            }
        }

        return calls;
    }

    /**
     * 在方法体中查找类的引用
     */
    private findMethodBodyReferences(
        lines: string[],
        targetClass: string,
        classDoc: JavaClassDoc
    ): CrossReference[] {
        const references: CrossReference[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // 查找 new ClassName( 模式
            const newPattern = new RegExp(`new\\s+${targetClass}\\s*\\(`, "g");
            if (newPattern.test(line)) {
                references.push({
                    referencedBy: classDoc.fullName,
                    filePath: classDoc.filePath,
                    referenceType: "method_call",
                    location: {
                        line: i + 1,
                        context: line.trim(),
                    },
                });
            }

            // 查找静态方法调用 ClassName.method(
            const staticCallPattern = new RegExp(
                `${targetClass}\\.\\w+\\s*\\(`,
                "g"
            );
            if (staticCallPattern.test(line)) {
                references.push({
                    referencedBy: classDoc.fullName,
                    filePath: classDoc.filePath,
                    referenceType: "method_call",
                    location: {
                        line: i + 1,
                        context: line.trim(),
                    },
                });
            }

            // 查找类型转换 (ClassName)
            const castPattern = new RegExp(`\\(\\s*${targetClass}\\s*\\)`, "g");
            if (castPattern.test(line)) {
                references.push({
                    referencedBy: classDoc.fullName,
                    filePath: classDoc.filePath,
                    referenceType: "method_call",
                    location: {
                        line: i + 1,
                        context: line.trim(),
                    },
                });
            }
        }

        return references;
    }

    /**
     * 获取源码内容
     */
    private async getSourceCode(filePath: string): Promise<string> {
        if (this.sourceCodeCache.has(filePath)) {
            return this.sourceCodeCache.get(filePath)!;
        }

        try {
            const response = await fetch(filePath);
            const sourceCode = await response.text();
            this.sourceCodeCache.set(filePath, sourceCode);
            return sourceCode;
        } catch (error) {
            console.error(`Failed to load source code: ${filePath}`, error);
            return "";
        }
    }

    /**
     * 查找包含指定内容的行
     */
    private findLineContaining(
        lines: string[],
        pattern: string
    ): { lineNumber: number; content: string } {
        const regex = new RegExp(pattern, "i");
        for (let i = 0; i < lines.length; i++) {
            if (regex.test(lines[i])) {
                return { lineNumber: i, content: lines[i].trim() };
            }
        }
        return { lineNumber: -1, content: "" };
    }

    /**
     * 获取热门类（被引用最多的类）
     */
    async getPopularClasses(
        limit: number = 10
    ): Promise<{ className: string; usage: ClassUsage }[]> {
        const classUsages: { className: string; usage: ClassUsage }[] = [];

        for (const [className] of this.docIndex.classes) {
            const usage = await this.analyzeClassUsage(className);
            classUsages.push({ className, usage });
        }

        // 按引用次数排序
        classUsages.sort(
            (a, b) => b.usage.totalReferences - a.usage.totalReferences
        );

        return classUsages.slice(0, limit);
    }

    /**
     * 查找孤立的类（没有被其他类引用的类）
     */
    async findOrphanClasses(): Promise<string[]> {
        const orphans: string[] = [];

        for (const [className] of this.docIndex.classes) {
            const usage = await this.analyzeClassUsage(className);
            if (usage.totalReferences === 0) {
                orphans.push(className);
            }
        }

        return orphans;
    }
}
