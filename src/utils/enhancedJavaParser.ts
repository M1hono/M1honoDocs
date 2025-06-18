import {
    JavaClassDoc,
    JavaMethodDoc,
    JavaFieldDoc,
    JavaParameterDoc,
    JavadocTag,
} from "../types";

/**
 * 增强的 Java 解析器
 * 能够处理复杂的 Java 代码结构，包括泛型、注解、内部类等
 */
export class EnhancedJavaParser {
    private static readonly KEYWORD_PATTERN =
        /\b(class|interface|enum|record|@interface)\s+([A-Za-z_$][\w$]*)/;
    private static readonly PACKAGE_PATTERN = /^\s*package\s+([\w.]+)\s*;/m;
    private static readonly IMPORT_PATTERN =
        /^\s*import\s+(?:static\s+)?([\w.*]+)\s*;/gm;
    private static readonly MODIFIER_PATTERN =
        /\b(public|private|protected|static|final|abstract|synchronized|volatile|transient|native|strictfp|default)\b/g;

    /**
     * 解析 Java 源码文件
     */
    static parseJavaFile(sourceCode: string, filePath: string): JavaClassDoc[] {
        if (!sourceCode || sourceCode.trim().length === 0) {
            return [];
        }

        try {
            const classes: JavaClassDoc[] = [];

            // 清理源码
            const cleanedCode = this.preprocessCode(sourceCode);

            // 提取包名
            const packageName = this.extractPackageName(cleanedCode);

            // 提取导入
            const imports = this.extractImports(cleanedCode);

            // 查找所有类声明
            const classDeclarations = this.findClassDeclarations(cleanedCode);

            for (const declaration of classDeclarations) {
                const classDoc = this.parseClassDeclaration(
                    declaration,
                    packageName,
                    imports,
                    filePath
                );
                if (classDoc) {
                    classes.push(classDoc);
                }
            }

            return classes;
        } catch (error) {
            console.warn(`解析 Java 文件失败: ${filePath}`, error);
            return [];
        }
    }

    /**
     * 预处理代码，移除注释和字符串字面量
     */
    private static preprocessCode(code: string): string {
        // 移除单行注释，但保留 JavaDoc
        let cleaned = code.replace(/\/\/.*$/gm, "");

        // 移除多行注释，但保留 JavaDoc
        cleaned = cleaned.replace(/\/\*(?!\*)(.*?)\*\//gs, "");

        // 移除字符串字面量
        cleaned = cleaned.replace(/"(?:[^"\\]|\\.)*"/g, '""');
        cleaned = cleaned.replace(/'(?:[^'\\]|\\.)*'/g, "''");

        return cleaned;
    }

    /**
     * 提取包名
     */
    private static extractPackageName(code: string): string {
        const match = code.match(this.PACKAGE_PATTERN);
        return match ? match[1] : "";
    }

    /**
     * 提取导入语句
     */
    private static extractImports(code: string): string[] {
        const imports: string[] = [];
        let match;

        this.IMPORT_PATTERN.lastIndex = 0;
        while ((match = this.IMPORT_PATTERN.exec(code)) !== null) {
            imports.push(match[1]);
        }

        return imports;
    }

    /**
     * 查找所有类声明
     */
    private static findClassDeclarations(code: string): string[] {
        const declarations: string[] = [];
        const lines = code.split("\n");
        let currentDeclaration = "";
        let braceCount = 0;
        let inClass = false;
        let classStartLine = -1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // 跳过空行和单纯的注释行
            if (!trimmedLine || trimmedLine.startsWith("//")) {
                if (inClass) currentDeclaration += line + "\n";
                continue;
            }

            // 检查是否是类声明的开始
            if (!inClass && this.KEYWORD_PATTERN.test(trimmedLine)) {
                inClass = true;
                classStartLine = i;
                currentDeclaration = "";
                braceCount = 0;
            }

            if (inClass) {
                currentDeclaration += line + "\n";

                // 计算大括号
                const openBraces = (line.match(/\{/g) || []).length;
                const closeBraces = (line.match(/\}/g) || []).length;
                braceCount += openBraces - closeBraces;

                // 如果大括号平衡且遇到了至少一个左大括号，说明类声明结束
                if (braceCount === 0 && openBraces > 0) {
                    declarations.push(currentDeclaration.trim());
                    inClass = false;
                    currentDeclaration = "";
                }
            }
        }

        // 处理没有正确结束的类声明
        if (inClass && currentDeclaration.trim()) {
            declarations.push(currentDeclaration.trim());
        }

        return declarations;
    }

    /**
     * 解析单个类声明
     */
    private static parseClassDeclaration(
        declaration: string,
        packageName: string,
        imports: string[],
        filePath: string
    ): JavaClassDoc | null {
        try {
            // 提取类头部信息
            const headerMatch = declaration.match(this.KEYWORD_PATTERN);
            if (!headerMatch) return null;

            const classType = headerMatch[1]; // class, interface, enum, etc.
            const className = headerMatch[2];
            const fullName = packageName
                ? `${packageName}.${className}`
                : className;

            // 提取修饰符
            const modifiers = this.extractModifiers(declaration);

            // 提取继承和实现
            const { superClass, interfaces } =
                this.extractInheritance(declaration);

            // 提取类注释
            const classComment = this.extractClassComment(declaration);

            // 提取字段
            const fields = this.extractFields(declaration);

            // 提取方法
            const methods = this.extractMethods(declaration);

            // 计算行范围
            const lines = declaration.split("\n");
            const lineRange = {
                start: 1,
                end: lines.length,
            };

            return {
                className,
                fullName,
                packageName,
                filePath,
                classType,
                modifiers,
                superClass,
                interfaces,
                imports,
                classComment,
                fields,
                methods,
                lineRange,
            };
        } catch (error) {
            console.warn(`解析类声明失败: ${filePath}`, error);
            return null;
        }
    }

    /**
     * 提取修饰符
     */
    private static extractModifiers(code: string): string[] {
        const modifiers: string[] = [];
        let match;

        this.MODIFIER_PATTERN.lastIndex = 0;
        while ((match = this.MODIFIER_PATTERN.exec(code)) !== null) {
            if (!modifiers.includes(match[1])) {
                modifiers.push(match[1]);
            }
        }

        return modifiers;
    }

    /**
     * 提取继承和实现信息
     */
    private static extractInheritance(code: string): {
        superClass: string;
        interfaces: string[];
    } {
        let superClass = "";
        const interfaces: string[] = [];

        // 查找 extends
        const extendsMatch = code.match(
            /\bextends\s+([\w.<>[\]?\s,]+?)(?:\s+implements|\s*\{)/
        );
        if (extendsMatch) {
            superClass = extendsMatch[1].trim().split(/\s+/)[0];
        }

        // 查找 implements
        const implementsMatch = code.match(
            /\bimplements\s+([\w.<>[\]?\s,]+?)(?:\s*\{)/
        );
        if (implementsMatch) {
            const interfaceList = implementsMatch[1].split(",");
            for (const intf of interfaceList) {
                const cleanIntf = intf.trim().split(/\s+/)[0];
                if (cleanIntf) {
                    interfaces.push(cleanIntf);
                }
            }
        }

        return { superClass, interfaces };
    }

    /**
     * 提取类注释
     */
    private static extractClassComment(code: string): string {
        const javadocMatch = code.match(/\/\*\*(.*?)\*\//s);
        if (javadocMatch) {
            return javadocMatch[1]
                .split("\n")
                .map((line) => line.replace(/^\s*\*\s?/, ""))
                .join("\n")
                .trim();
        }
        return "";
    }

    /**
     * 提取字段
     */
    private static extractFields(code: string): JavaFieldDoc[] {
        const fields: JavaFieldDoc[] = [];

        // 匹配字段声明
        const fieldPattern =
            /(?:\/\*\*(.*?)\*\/\s*)?((?:(?:public|private|protected|static|final|volatile|transient)\s+)*)([\w<>[\].,?\s]+?)\s+(\w+)(?:\s*=\s*([^;]+?))?\s*;/gs;

        let match;
        while ((match = fieldPattern.exec(code)) !== null) {
            const [, javadocRaw, modifiersRaw, type, name, initialValue] =
                match;

            // 解析 JavaDoc
            const comment = javadocRaw
                ? javadocRaw
                      .split("\n")
                      .map((line) => line.replace(/^\s*\*\s?/, ""))
                      .join("\n")
                      .trim()
                : "";

            // 解析修饰符
            const modifiers = modifiersRaw
                ? modifiersRaw
                      .trim()
                      .split(/\s+/)
                      .filter((m) => m)
                : [];

            // 清理类型
            const cleanType = type.trim();

            // 清理初始值
            const cleanInitialValue = initialValue ? initialValue.trim() : "";

            fields.push({
                name,
                type: cleanType,
                modifiers,
                comment,
                initialValue: cleanInitialValue,
                lineRange: { start: 0, end: 0 }, // TODO: 计算实际行号
            });
        }

        return fields;
    }

    /**
     * 提取方法
     */
    private static extractMethods(code: string): JavaMethodDoc[] {
        const methods: JavaMethodDoc[] = [];

        // 更复杂的方法匹配模式
        const methodPattern =
            /(?:\/\*\*(.*?)\*\/\s*)?((?:(?:public|private|protected|static|final|abstract|synchronized|native)\s+)*)?(?:<[^>]+>\s+)?([\w<>[\].,?\s]+?)\s+(\w+)\s*\(([^)]*)\)(?:\s+throws\s+([\w.,\s]+?))?\s*(?:\{|;)/gs;

        let match;
        while ((match = methodPattern.exec(code)) !== null) {
            const [
                ,
                javadocRaw,
                modifiersRaw,
                returnType,
                methodName,
                parametersRaw,
                exceptionsRaw,
            ] = match;

            // 跳过构造函数的特殊处理
            if (returnType.trim() === "" && methodName) {
                // 这可能是构造函数
            }

            // 解析 JavaDoc
            const comment = javadocRaw
                ? javadocRaw
                      .split("\n")
                      .map((line) => line.replace(/^\s*\*\s?/, ""))
                      .join("\n")
                      .trim()
                : "";
            const javadocTags = this.parseJavadocTags(javadocRaw || "");

            // 解析修饰符
            const modifiers = modifiersRaw
                ? modifiersRaw
                      .trim()
                      .split(/\s+/)
                      .filter((m) => m)
                : [];

            // 解析参数
            const parameters = this.parseParameters(parametersRaw || "");

            // 解析异常
            const exceptions = exceptionsRaw
                ? exceptionsRaw
                      .split(",")
                      .map((e) => e.trim())
                      .filter((e) => e)
                : [];

            // 判断是否是构造函数
            const isConstructor =
                returnType.trim() === "" || returnType.trim() === methodName;

            methods.push({
                name: methodName,
                returnType: returnType.trim(),
                parameters,
                modifiers,
                exceptions,
                comment,
                javadocTags,
                lineRange: { start: 0, end: 0 }, // TODO: 计算实际行号
                isConstructor,
            });
        }

        return methods;
    }

    /**
     * 解析方法参数
     */
    private static parseParameters(parametersRaw: string): JavaParameterDoc[] {
        if (!parametersRaw.trim()) return [];

        const parameters: JavaParameterDoc[] = [];
        const paramParts = parametersRaw.split(",");

        for (const part of paramParts) {
            const trimmed = part.trim();
            if (!trimmed) continue;

            // 匹配参数模式: [final] Type... name
            const paramMatch = trimmed.match(
                /(?:(final)\s+)?([\w<>[\].,?\s]+?)\s*(\.\.\.)?s*(\w+)$/
            );
            if (paramMatch) {
                const [, finalModifier, type, varArgs, name] = paramMatch;

                parameters.push({
                    name,
                    type: type.trim(),
                    isVarArgs: !!varArgs,
                    isFinal: !!finalModifier,
                });
            } else {
                // 如果无法解析，尝试简单分割
                const parts = trimmed.split(/\s+/);
                if (parts.length >= 2) {
                    const name = parts[parts.length - 1];
                    const type = parts.slice(0, -1).join(" ");
                    parameters.push({
                        name,
                        type,
                        isVarArgs: false,
                        isFinal: false,
                    });
                }
            }
        }

        return parameters;
    }

    /**
     * 解析 JavaDoc 标签
     */
    private static parseJavadocTags(javadocRaw: string): JavadocTag[] {
        const tags: JavadocTag[] = [];
        if (!javadocRaw) return tags;

        const lines = javadocRaw.split("\n");
        let currentTag: JavadocTag | null = null;

        for (const line of lines) {
            const cleanLine = line.replace(/^\s*\*\s?/, "");
            const tagMatch = cleanLine.match(/^@(\w+)(?:\s+(\w+))?\s*(.*)/);

            if (tagMatch) {
                // 如果有之前的标签，先保存它
                if (currentTag) {
                    tags.push(currentTag);
                }

                const [, tag, paramName, value] = tagMatch;
                currentTag = {
                    tag: `@${tag}`,
                    paramName: paramName || "",
                    value: value,
                };
            } else if (currentTag && cleanLine.trim()) {
                // 继续当前标签的值
                currentTag.value += " " + cleanLine;
            }
        }

        // 保存最后一个标签
        if (currentTag) {
            tags.push(currentTag);
        }

        return tags;
    }
}
