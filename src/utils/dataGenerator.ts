import {
    JavaClassDoc,
    JavaMethodDoc,
    JavaFieldDoc,
    ProjectDocIndex,
} from "../types";

/**
 * 真实的 Java 文件解析器
 * 扫描和解析项目中的真实 Java 源码文件
 */
export class JavaFileParser {
    private allClasses: JavaClassDoc[] = [];
    private packages: Set<string> = new Set();

    /**
     * 解析整个项目的 Java 文件
     */
    async parseProject(): Promise<ProjectDocIndex> {
        console.log("🔍 开始解析真实 Java 项目...");

        this.allClasses = [];
        this.packages.clear();

        // 扫描项目中的所有 Java 文件
        const javaFiles = await this.scanJavaFiles();
        console.log(`📁 发现 ${javaFiles.length} 个 Java 文件`);

        // 解析每个 Java 文件
        for (const filePath of javaFiles) {
            try {
                const classDoc = await this.parseJavaFile(filePath);
                if (classDoc) {
                    this.allClasses.push(classDoc);
                    this.packages.add(classDoc.packageName);
                }
            } catch (error) {
                console.warn(`⚠️  解析文件失败: ${filePath}`, error);
            }
        }

        // 构建项目索引
        const docIndex = this.buildProjectIndex();

        console.log(
            `✅ 解析完成: ${this.allClasses.length} 个类, ${this.packages.size} 个包`
        );
        return docIndex;
    }

    /**
     * 扫描项目中的所有 Java 文件
     */
    private async scanJavaFiles(): Promise<string[]> {
        try {
            // 尝试从预生成的索引文件获取文件列表
            const response = await fetch("/java-files/index.json");
            if (response.ok) {
                const index = await response.json();
                console.log(`📁 从索引加载 ${index.totalFiles} 个Java文件`);
                return index.files || [];
            }
        } catch (error) {
            console.warn("无法加载文件索引，使用硬编码列表", error);
        }

        // 回退到硬编码的文件列表
        return this.getKnownJavaFiles();
    }

    /**
     * 获取已知的Java文件列表（回退方案）
     */
    private getKnownJavaFiles(): string[] {
        return [
            "forge-1.20.1-47.1.99/com/mojang/authlib/Agent.java",
            "forge-1.20.1-47.1.99/com/mojang/authlib/AuthenticationService.java",
            "forge-1.20.1-47.1.99/com/mojang/authlib/BaseAuthenticationService.java",
            "forge-1.20.1-47.1.99/net/minecraft/client/Minecraft.java",
            "forge-1.20.1-47.1.99/net/minecraft/ChatFormatting.java",
            "forge-1.20.1-47.1.99/net/minecraft/BlockUtil.java",
            "forge-1.20.1-47.1.99/net/minecraft/server/MinecraftServer.java",
            // 可以扩展更多文件...
        ];
    }

    /**
     * 解析单个 Java 文件
     */
    private async parseJavaFile(
        filePath: string
    ): Promise<JavaClassDoc | null> {
        try {
            // 首先尝试从复制的文件中读取
            const cleanPath = filePath.replace("forge-1.20.1-47.1.99/", "");
            let response = await fetch(`/java-files/${cleanPath}`);

            // 如果失败，尝试从原始路径读取
            if (!response.ok) {
                response = await fetch(`/${filePath}`);
            }

            if (response.ok) {
                const sourceCode = await response.text();
                return this.parseJavaSource(filePath, sourceCode);
            } else {
                console.warn(
                    `无法读取文件: ${filePath} (状态: ${response.status})`
                );
                return null;
            }
        } catch (error) {
            console.warn(`读取文件失败: ${filePath}`, error);
            return null;
        }
    }

    /**
     * 解析 Java 源码
     */
    private parseJavaSource(
        filePath: string,
        sourceCode: string
    ): JavaClassDoc | null {
        const lines = sourceCode.split("\n");

        // 解析包名
        const packageName = this.extractPackageName(sourceCode);
        if (!packageName) return null;

        // 解析导入语句
        const imports = this.extractImports(sourceCode);

        // 解析类信息
        const classInfo = this.extractClassInfo(sourceCode, lines);
        if (!classInfo) return null;

        // 解析字段
        const fields = this.extractFields(lines);

        // 解析方法
        const methods = this.extractMethods(lines);

        // 解析类注释
        const classComment = this.extractClassComment(
            sourceCode,
            classInfo.lineStart
        );

        const fullName = `${packageName}.${classInfo.className}`;

        return {
            className: classInfo.className,
            fullName,
            packageName,
            filePath: `/${filePath}`,
            classType: classInfo.classType as "class" | "interface" | "enum",
            modifiers: classInfo.modifiers,
            superClass: classInfo.superClass,
            interfaces: classInfo.interfaces,
            imports,
            classComment,
            methods,
            fields,
            lineRange: { start: classInfo.lineStart, end: classInfo.lineEnd },
            sourceCode,
        };
    }

    /**
     * 提取包名
     */
    private extractPackageName(sourceCode: string): string {
        const packageMatch = sourceCode.match(/package\s+([\w\.]+)\s*;/);
        return packageMatch ? packageMatch[1] : "";
    }

    /**
     * 提取导入语句
     */
    private extractImports(sourceCode: string): string[] {
        const importRegex = /import\s+(static\s+)?([\w\.\*]+)\s*;/g;
        const imports: string[] = [];
        let match;

        while ((match = importRegex.exec(sourceCode)) !== null) {
            imports.push(match[2]);
        }

        return imports;
    }

    /**
     * 提取类信息
     */
    private extractClassInfo(
        sourceCode: string,
        lines: string[]
    ): {
        className: string;
        classType: string;
        modifiers: string[];
        superClass: string;
        interfaces: string[];
        lineStart: number;
        lineEnd: number;
    } | null {
        // 匹配类声明
        const classRegex =
            /(public|private|protected)?\s*(static|final|abstract)?\s*(class|interface|enum|@interface)\s+(\w+)(?:\s+extends\s+([\w<>\.]+))?(?:\s+implements\s+([\w\s,<>\.]+))?\s*\{/;

        let classLineIndex = -1;
        let classMatch = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            classMatch = line.match(classRegex);
            if (classMatch) {
                classLineIndex = i;
                break;
            }
        }

        if (!classMatch || classLineIndex === -1) return null;

        const modifiers: string[] = [];
        if (classMatch[1]) modifiers.push(classMatch[1]); // public/private/protected
        if (classMatch[2]) modifiers.push(classMatch[2]); // static/final/abstract

        const classType = classMatch[3]; // class/interface/enum/@interface
        const className = classMatch[4];
        const superClass = classMatch[5] || "";
        const interfaces = classMatch[6]
            ? classMatch[6].split(",").map((i) => i.trim())
            : [];

        // 找到类的结束位置
        let braceCount = 0;
        let lineEnd = lines.length;

        for (let i = classLineIndex; i < lines.length; i++) {
            const line = lines[i];
            braceCount += (line.match(/\{/g) || []).length;
            braceCount -= (line.match(/\}/g) || []).length;

            if (braceCount === 0 && i > classLineIndex) {
                lineEnd = i + 1;
                break;
            }
        }

        return {
            className,
            classType,
            modifiers,
            superClass,
            interfaces,
            lineStart: classLineIndex + 1,
            lineEnd,
        };
    }

    /**
     * 提取字段
     */
    private extractFields(lines: string[]): JavaFieldDoc[] {
        const fields: JavaFieldDoc[] = [];
        const fieldRegex =
            /^\s*(public|private|protected)?\s*(static|final|volatile)?\s*(static|final|volatile)?\s*(\w+(?:<[\w\s,<>\.]+>)?(?:\[\])*)\s+(\w+)(?:\s*=\s*([^;]+))?\s*;/;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // 跳过注释和方法
            if (
                line.startsWith("//") ||
                line.startsWith("/*") ||
                line.startsWith("*") ||
                line.includes("(") ||
                line.startsWith("@")
            ) {
                continue;
            }

            const match = line.match(fieldRegex);
            if (match) {
                const modifiers: string[] = [];
                if (match[1]) modifiers.push(match[1]);
                if (match[2]) modifiers.push(match[2]);
                if (match[3] && match[3] !== match[2]) modifiers.push(match[3]);

                // 提取字段注释
                const comment = this.extractFieldComment(lines, i);

                fields.push({
                    name: match[5],
                    type: match[4],
                    modifiers,
                    comment,
                    initialValue: match[6] || "",
                    lineRange: { start: i + 1, end: i + 1 },
                });
            }
        }

        return fields;
    }

    /**
     * 提取方法
     */
    private extractMethods(lines: string[]): JavaMethodDoc[] {
        const methods: JavaMethodDoc[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // 匹配方法声明
            const methodMatch = line.match(
                /^\s*(public|private|protected)?\s*(static|final|abstract|synchronized)?\s*(static|final|abstract|synchronized)?\s*(?:(\w+(?:<[\w\s,<>\.]+>)?(?:\[\])*)\s+)?(\w+)\s*\(([^)]*)\)(?:\s*throws\s+([\w\s,\.]+))?\s*\{?/
            );

            if (
                methodMatch &&
                !line.includes("class ") &&
                !line.includes("interface ")
            ) {
                const modifiers: string[] = [];
                if (methodMatch[1]) modifiers.push(methodMatch[1]);
                if (methodMatch[2]) modifiers.push(methodMatch[2]);
                if (methodMatch[3] && methodMatch[3] !== methodMatch[2])
                    modifiers.push(methodMatch[3]);

                const returnType = methodMatch[4] || "";
                const methodName = methodMatch[5];
                const paramString = methodMatch[6];
                const throwsString = methodMatch[7];

                // 解析参数
                const parameters = this.parseParameters(paramString);

                // 解析异常
                const exceptions = throwsString
                    ? throwsString.split(",").map((e) => e.trim())
                    : [];

                // 提取方法注释和JavaDoc
                const { comment, javadocTags } = this.extractMethodComment(
                    lines,
                    i
                );

                // 判断是否为构造函数
                const isConstructor =
                    returnType === "" &&
                    methodName.charAt(0) === methodName.charAt(0).toUpperCase();

                // 找到方法结束行
                const methodEnd = this.findMethodEnd(lines, i);

                methods.push({
                    name: methodName,
                    returnType: isConstructor ? "" : returnType,
                    parameters,
                    modifiers,
                    comment,
                    javadocTags,
                    exceptions,
                    lineRange: { start: i + 1, end: methodEnd },
                    isConstructor,
                });
            }
        }

        return methods;
    }

    /**
     * 解析方法参数
     */
    private parseParameters(paramString: string): Array<{
        name: string;
        type: string;
        isVarArgs: boolean;
        isFinal: boolean;
    }> {
        if (!paramString.trim()) return [];

        const params = paramString.split(",");
        return params.map((param) => {
            const trimmed = param.trim();
            const parts = trimmed.split(/\s+/);

            const isFinal = parts.includes("final");
            const isVarArgs = trimmed.includes("...");

            // 移除修饰符
            const filtered = parts.filter(
                (p) => p !== "final" && p !== "@Nullable" && !p.startsWith("@")
            );

            if (filtered.length >= 2) {
                let type = filtered[0];
                let name = filtered[1];

                if (isVarArgs) {
                    type = type.replace("...", "[]");
                    name = name.replace("...", "");
                }

                return { name, type, isVarArgs, isFinal };
            }

            return {
                name: "param",
                type: "Object",
                isVarArgs: false,
                isFinal: false,
            };
        });
    }

    /**
     * 提取类注释
     */
    private extractClassComment(
        sourceCode: string,
        classLineStart: number
    ): string {
        const lines = sourceCode.split("\n");
        let comment = "";

        // 从类声明行往上查找注释
        for (let i = classLineStart - 2; i >= 0; i--) {
            const line = lines[i].trim();

            if (line.startsWith("/**")) {
                // 找到JavaDoc注释开始
                let j = i;
                while (j < classLineStart - 1) {
                    const commentLine = lines[j].trim();
                    if (
                        commentLine.startsWith("*") &&
                        !commentLine.startsWith("*/")
                    ) {
                        comment =
                            commentLine.replace(/^\*\s*/, "") + "\n" + comment;
                    }
                    if (commentLine.endsWith("*/")) break;
                    j++;
                }
                break;
            } else if (line.startsWith("//")) {
                comment = line.replace(/^\/\/\s*/, "") + "\n" + comment;
            } else if (line === "") {
                continue;
            } else {
                break;
            }
        }

        return comment.trim();
    }

    /**
     * 提取字段注释
     */
    private extractFieldComment(
        lines: string[],
        fieldLineIndex: number
    ): string {
        // 查找字段上方的注释
        for (let i = fieldLineIndex - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (line.startsWith("//")) {
                return line.replace(/^\/\/\s*/, "");
            } else if (line.startsWith("/**") || line.startsWith("*")) {
                return line.replace(/^\/?\*+\s*/, "").replace(/\*\/$/, "");
            } else if (line !== "") {
                break;
            }
        }
        return "";
    }

    /**
     * 提取方法注释和JavaDoc标签
     */
    private extractMethodComment(
        lines: string[],
        methodLineIndex: number
    ): {
        comment: string;
        javadocTags: Array<{ tag: string; paramName: string; value: string }>;
    } {
        let comment = "";
        const javadocTags: Array<{
            tag: string;
            paramName: string;
            value: string;
        }> = [];

        // 从方法声明行往上查找注释
        for (let i = methodLineIndex - 1; i >= 0; i--) {
            const line = lines[i].trim();

            if (line.startsWith("/**")) {
                // 解析JavaDoc注释
                let j = i + 1;
                while (j < methodLineIndex) {
                    const commentLine = lines[j].trim();

                    if (commentLine.startsWith("*/")) break;

                    if (commentLine.startsWith("* @")) {
                        // JavaDoc标签
                        const tagMatch = commentLine.match(
                            /\*\s*@(\w+)(?:\s+(\w+))?\s*(.*)/
                        );
                        if (tagMatch) {
                            javadocTags.push({
                                tag: "@" + tagMatch[1],
                                paramName: tagMatch[2] || "",
                                value: tagMatch[3] || "",
                            });
                        }
                    } else if (commentLine.startsWith("*")) {
                        // 普通注释内容
                        const content = commentLine.replace(/^\*\s*/, "");
                        if (content) {
                            comment += content + " ";
                        }
                    }
                    j++;
                }
                break;
            } else if (line.startsWith("//")) {
                comment = line.replace(/^\/\/\s*/, "") + " " + comment;
            } else if (line === "") {
                continue;
            } else {
                break;
            }
        }

        return { comment: comment.trim(), javadocTags };
    }

    /**
     * 找到方法结束行
     */
    private findMethodEnd(lines: string[], startLine: number): number {
        let braceCount = 0;
        let inMethod = false;

        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i];

            if (line.includes("{")) {
                inMethod = true;
                braceCount += (line.match(/\{/g) || []).length;
            }

            if (inMethod) {
                braceCount -= (line.match(/\}/g) || []).length;

                if (braceCount === 0) {
                    return i + 1;
                }
            } else if (line.includes(";")) {
                // 抽象方法或接口方法
                return i + 1;
            }
        }

        return startLine + 1;
    }

    /**
     * 构建项目索引
     */
    private buildProjectIndex(): ProjectDocIndex {
        const docIndex: ProjectDocIndex = {
            classes: new Map(),
            packages: new Map(),
            fileToClasses: new Map(),
        };

        // 添加所有类
        for (const classDoc of this.allClasses) {
            docIndex.classes.set(classDoc.fullName, classDoc);

            // 更新包映射
            const packageName = classDoc.packageName || "";
            if (!docIndex.packages.has(packageName)) {
                docIndex.packages.set(packageName, []);
            }
            const packageClasses = docIndex.packages.get(packageName)!;
            packageClasses.push(classDoc.fullName);

            // 文件映射
            docIndex.fileToClasses.set(classDoc.filePath, [classDoc.fullName]);
        }

        return docIndex;
    }
}

// 为了向后兼容，保留 DataGenerator 类名
export class DataGenerator extends JavaFileParser {
    async generateProject(): Promise<ProjectDocIndex> {
        return this.parseProject();
    }
}
