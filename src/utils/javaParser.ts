import {
    JavaClassDoc,
    JavaMethodDoc,
    JavaFieldDoc,
    JavaParameterDoc,
    JavadocTag,
    ProjectDocIndex,
} from "../types";

/**
 * Java 代码解析器
 * 专注于严格按照缩进解析类的字段和方法
 */
export class JavaParser {
    private sourceCode: string = "";
    private lines: string[] = [];
    private currentLine: number = 0;

    /**
     * 解析 Java 源码文件
     */
    parseFile(sourceCode: string, filePath: string): JavaClassDoc[] {
        this.sourceCode = sourceCode;
        this.lines = sourceCode.split("\n");
        this.currentLine = 0;

        const classes: JavaClassDoc[] = [];
        const packageName = this.extractPackageName();

        // 查找所有类定义
        while (this.currentLine < this.lines.length) {
            const classInfo = this.parseClass(packageName, filePath);
            if (classInfo) {
                classes.push(classInfo);
            }
            this.currentLine++;
        }

        return classes;
    }

    /**
     * 提取包名
     */
    private extractPackageName(): string {
        for (let i = 0; i < this.lines.length; i++) {
            const line = this.lines[i].trim();
            if (line.startsWith("package ") && line.endsWith(";")) {
                return line.substring(8, line.length - 1).trim();
            }
        }
        return "";
    }

    /**
     * 解析类定义
     */
    private parseClass(
        packageName: string,
        filePath: string,
        outerClassName?: string
    ): JavaClassDoc | null {
        const startLine = this.currentLine;

        // 查找类声明
        let classDeclarationLine = -1;
        let classComment = "";

        // 向前查找 JavaDoc 注释
        for (let i = this.currentLine; i >= 0; i--) {
            const line = this.lines[i].trim();
            if (
                line.includes("class ") ||
                line.includes("interface ") ||
                line.includes("enum ")
            ) {
                classDeclarationLine = i;
                break;
            }
        }

        if (classDeclarationLine === -1) return null;

        // 提取 JavaDoc 注释
        classComment = this.extractJavadocComment(classDeclarationLine);

        const classDeclaration = this.lines[classDeclarationLine];
        const classInfo = this.parseClassDeclaration(classDeclaration);

        if (!classInfo) return null;

        // 查找类的结束位置
        const endLine = this.findClassEndLine(classDeclarationLine);

        // 提取imports
        const imports = this.extractImports();

        // 解析类体 - 使用新的严格缩进解析
        const fields: JavaFieldDoc[] = [];
        const methods: JavaMethodDoc[] = [];
        const innerClasses: JavaClassDoc[] = [];

        // 为内部类传递正确的外部类名
        const currentClassName = outerClassName 
            ? `${outerClassName}.${classInfo.className}`
            : classInfo.className;

        this.parseClassBodyByIndentation(
            classDeclarationLine,
            endLine,
            fields,
            methods,
            innerClasses,
            packageName,
            filePath,
            classInfo.classType === 'enum',
            classInfo.className,
            currentClassName
        );

        return {
            className: classInfo.className,
            fullName: packageName
                ? `${packageName}.${currentClassName}`
                : currentClassName,
            packageName,
            classComment,
            modifiers: classInfo.modifiers,
            superClass: classInfo.superClass,
            interfaces: classInfo.interfaces,
            imports,
            fields,
            methods,
            innerClasses,
            filePath,
            lineRange: { start: startLine + 1, end: endLine + 1 },
            classType: classInfo.classType,
        };
    }

    /**
     * 解析类声明行
     */
    private parseClassDeclaration(line: string): {
        className: string;
        modifiers: string[];
        superClass?: string;
        interfaces: string[];
        classType: 'class' | 'interface' | 'enum';
    } | null {
        const trimmed = line.trim();

        // 提取修饰符
        const modifiers: string[] = [];
        const modifierPattern =
            /\b(public|private|protected|static|final|abstract)\b/g;
        let match;
        while ((match = modifierPattern.exec(trimmed)) !== null) {
            modifiers.push(match[1]);
        }

        // 提取类名
        const classMatch = trimmed.match(/\b(?:class|interface|enum)\s+(\w+)/);
        if (!classMatch) return null;

        const className = classMatch[1];

        // 提取父类
        const extendsMatch = trimmed.match(/\bextends\s+([^\s{,<]+)/);
        const superClass = extendsMatch ? extendsMatch[1] : undefined;

        // 提取接口
        const interfaces: string[] = [];
        const implementsMatch = trimmed.match(/\bimplements\s+([^{]+)/);
        if (implementsMatch) {
            const interfaceList = implementsMatch[1].split(",");
            interfaces.push(...interfaceList.map((i) => i.trim()));
        }

        const classTypeMatch = trimmed.match(/\b(class|interface|enum)\b/);
        const classType = classTypeMatch ? (classTypeMatch[1] as 'class' | 'interface' | 'enum') : 'class';

        return {
            className,
            modifiers,
            superClass,
            interfaces,
            classType,
        };
    }

    /**
     * 查找类的结束行
     */
    private findClassEndLine(startLine: number): number {
        let braceCount = 0;
        let inString = false;
        let inComment = false;

        for (let i = startLine; i < this.lines.length; i++) {
            const line = this.lines[i];

            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                const nextChar = line[j + 1];

                if (!inString && !inComment) {
                    if (char === "/" && nextChar === "*") {
                        inComment = true;
                        j++; // skip next char
                        continue;
                    }
                    if (char === "/" && nextChar === "/") {
                        break; // rest of line is comment
                    }
                    if (char === '"') {
                        inString = true;
                        continue;
                    }
                    if (char === "{") {
                        braceCount++;
                    } else if (char === "}") {
                        braceCount--;
                        if (braceCount === 0) {
                            return i;
                        }
                    }
                } else if (inString && char === '"' && line[j - 1] !== "\\") {
                    inString = false;
                } else if (inComment && char === "*" && nextChar === "/") {
                    inComment = false;
                    j++; // skip next char
                }
            }
        }

        return this.lines.length - 1;
    }

    /**
     * 基于缩进严格解析类体
     * 这是核心改进：严格按照缩进层次来判断成员归属
     */
    private parseClassBodyByIndentation(
        classStartLine: number,
        classEndLine: number,
        fields: JavaFieldDoc[],
        methods: JavaMethodDoc[],
        innerClasses: JavaClassDoc[],
        packageName: string,
        filePath: string,
        isEnum: boolean,
        className: string,
        outerClassName?: string
    ): void {
        // 获取类声明的缩进级别
        const classIndent = this.getIndentLevel(this.lines[classStartLine]);
        const memberIndent = classIndent + 1; // 类成员应该比类声明多一级缩进

        let i = classStartLine + 1;

        while (i <= classEndLine) {
            const line = this.lines[i];
            const trimmedLine = line.trim();
            const currentIndent = this.getIndentLevel(line);

            // 跳过空行、注释行
            if (!trimmedLine || trimmedLine.startsWith("//") || 
                trimmedLine.startsWith("/*") || trimmedLine.startsWith("*")) {
                i++;
                continue;
            }

            // 只处理正确缩进级别的行（类的直接成员）
            if (currentIndent === memberIndent) {
                // 检查是否是内部类
                if (this.isClassDeclaration(trimmedLine)) {
                    const innerClassEnd = this.findClassEndLine(i);
                    this.currentLine = i;
                    const innerClass = this.parseClass(packageName, filePath, outerClassName);
                    if (innerClass) {
                        innerClasses.push(innerClass);
                    }
                    i = innerClassEnd + 1;
                    continue;
                }

                // 检查是否是方法
                if (this.isMethodDeclarationStrict(line, i)) {
                    const method = this.parseMethodStrict(i);
                    if (method) {
                        methods.push(method);
                        i = method.lineRange.end;
                        continue;
                    }
                }

                // 检查是否是字段或枚举常量
                if (this.isFieldDeclarationStrict(line, isEnum)) {
                    const members = this.parseFieldOrEnumConstant(i, isEnum, className);
                    if (members.length > 0) {
                        fields.push(...members);
                        // 字段/枚举可能跨多行，找到结束位置
                        i = this.findFieldEndLineStrict(i) + 1;
                        continue;
                    }
                }
            }

            i++;
        }
    }

    /**
     * 获取行的缩进级别（空格数除以3，假设缩进为3个空格）
     */
    private getIndentLevel(line: string): number {
        let spaces = 0;
        for (const char of line) {
            if (char === ' ') {
                spaces++;
            } else if (char === '\t') {
                spaces += 3; // 制表符当作3个空格
            } else {
                break;
            }
        }
        return Math.floor(spaces / 3);
    }

    /**
     * 严格检查是否是类声明
     */
    private isClassDeclaration(line: string): boolean {
        return /^\s*(public|private|protected|static|final|abstract)?\s*(class|interface|enum)\s+\w+/.test(line);
    }

    /**
     * 严格检查是否是方法声明
     */
    private isMethodDeclarationStrict(line: string, lineIndex: number): boolean {
        const trimmed = line.trim();

        // 必须包含括号，但排除字段声明中的方法调用和泛型
        if (!trimmed.includes("(") || !trimmed.includes(")")) {
            return false;
        }

        // 排除字段声明中的初始化（如 = new ArrayList<>() 或 = Lists.newArrayList()）
        if (trimmed.includes("=") && this.isFieldInitialization(trimmed)) {
            return false;
        }

        // 检查是否是方法声明模式
        const methodPatterns = [
            // 标准方法声明：修饰符 + 返回类型 + 方法名 + 参数
            /^\s*(public|private|protected)\s+(static\s+)?(final|abstract|synchronized\s+)?[\w<>\[\],\s\.]+\s+\w+\s*\([^)]*\)\s*[{;]/,
            // 构造函数：修饰符 + 类名 + 参数
            /^\s*(public|private|protected)\s+\w+\s*\([^)]*\)\s*[{;]/,
            // 抽象方法或接口方法
            /^\s*(public|private|protected)\s+abstract\s+[\w<>\[\],\s\.]+\s+\w+\s*\([^)]*\)\s*;/,
        ];

        // 如果匹配方法模式，进一步验证
        const matchesMethodPattern = methodPatterns.some(pattern => pattern.test(trimmed));
        
        if (matchesMethodPattern) {
            // 确保不是字段声明的一部分
            return !this.looksLikeFieldDeclaration(trimmed);
        }

        // 检查跨行方法声明
        if (lineIndex + 1 < this.lines.length) {
            const nextLine = this.lines[lineIndex + 1].trim();
            if (nextLine.startsWith("{") || nextLine.startsWith("throws")) {
                return methodPatterns.some(pattern => pattern.test(trimmed + " " + nextLine));
            }
        }

        return false;
    }

    /**
     * 检查是否是字段初始化
     */
    private isFieldInitialization(line: string): boolean {
        // 字段初始化模式：修饰符 类型 名称 = 初始化表达式
        const patterns = [
            /^\s*(public|private|protected)\s+(static\s+)?(final\s+)?[\w<>\[\],\s\.]+\s+\w+\s*=/,
            /^\s*static\s+final\s+[\w<>\[\],\s\.]+\s+\w+\s*=/,
            /^\s*final\s+[\w<>\[\],\s\.]+\s+\w+\s*=/,
        ];
        
        return patterns.some(pattern => pattern.test(line));
    }

    /**
     * 检查是否看起来像字段声明
     */
    private looksLikeFieldDeclaration(line: string): boolean {
        // 如果包含字段初始化特征，认为是字段
        return line.includes("=") && !line.includes("==") && !line.includes("!=");
    }

    /**
     * 严格检查是否是字段声明
     */
    private isFieldDeclarationStrict(line: string, isEnum: boolean): boolean {
        const trimmed = line.trim();

        // 如果是枚举，简单的标识符就是枚举常量
        if (isEnum) {
            // 匹配单个标识符或带参数的构造函数，以逗号或分号结尾
            if (/^(\w+)(\s*\([^)]*\))?\s*(,|;)?$/.test(trimmed)) {
                return true;
            }
        }

        // 排除注解行
        if (trimmed.startsWith("@")) {
            return false;
        }

        // 字段声明模式 - 移除结尾$匹配以支持复杂初始化
        const fieldPatterns = [
            // 带访问修饰符的字段：public/private/protected [static] [final] Type name [= initializer]
            /^\s*(public|private|protected)\s+(static\s+)?(final\s+)?[\w<>\[\],\s\.]+\s+\w+(\s*=.*)?/,
            // 只有static final的字段
            /^\s*static\s+final\s+[\w<>\[\],\s\.]+\s+\w+(\s*=.*)?/,
            // 只有final的字段
            /^\s*final\s+[\w<>\[\],\s\.]+\s+\w+(\s*=.*)?/,
            // protected/没有访问修饰符的字段
            /^\s*protected\s+[\w<>\[\],\s\.]+\s+\w+(\s*=.*)?/,
        ];

        // 检查是否匹配字段模式
        const matchesFieldPattern = fieldPatterns.some(pattern => pattern.test(trimmed));
        
        if (!matchesFieldPattern) {
            return false;
        }

        // 确保不是方法声明
        if (trimmed.includes("(") && trimmed.includes(")")) {
            // 如果包含括号，检查是否是字段初始化中的方法调用
            if (!trimmed.includes("=")) {
                // 没有等号且有括号，很可能是方法
                return false;
            }
            // 有等号的情况，检查等号前是否符合字段声明格式
            const beforeEquals = trimmed.substring(0, trimmed.indexOf("=")).trim();
            return fieldPatterns.some(pattern => pattern.test(beforeEquals));
        }

        return true;
    }

    /**
     * 查找字段声明的结束行
     */
    private findFieldEndLineStrict(startLine: number): number {
        const line = this.lines[startLine].trim();

        // 如果以分号结尾，就是单行字段
        if (line.endsWith(';')) {
            return startLine;
        }

        // 否则查找分号结束位置（处理复杂初始化）
        for (let i = startLine; i < this.lines.length; i++) {
            const currentLine = this.lines[i].trim();
            if (currentLine.endsWith(';')) {
                return i;
            }
        }

        return startLine;
    }

    /**
     * 严格解析方法
     */
    private parseMethodStrict(lineIndex: number): JavaMethodDoc | null {
        const javadocComment = this.extractJavadocComment(lineIndex);
        const methodDeclaration = this.getMethodDeclarationStrict(lineIndex);

        if (!methodDeclaration) return null;

        const methodInfo = this.parseMethodDeclaration(methodDeclaration);
        if (!methodInfo) return null;

        const endLine = this.findMethodEndLineStrict(lineIndex);
        const javadocTags = this.parseJavadocTags(javadocComment);

        return {
            name: methodInfo.name,
            returnType: methodInfo.returnType,
            modifiers: methodInfo.modifiers,
            parameters: methodInfo.parameters,
            exceptions: methodInfo.exceptions,
            comment: javadocComment,
            javadocTags,
            lineRange: { start: lineIndex + 1, end: endLine + 1 },
            isConstructor: methodInfo.isConstructor,
        };
    }

    /**
     * 获取完整的方法声明（可能跨多行）
     */
    private getMethodDeclarationStrict(startLine: number): string {
        let declaration = "";
        let parenCount = 0;
        let foundOpenParen = false;

        for (let i = startLine; i < this.lines.length; i++) {
            const line = this.lines[i].trim();
            declaration += line + " ";

            for (const char of line) {
                if (char === "(") {
                    parenCount++;
                    foundOpenParen = true;
                } else if (char === ")") {
                    parenCount--;
                }
            }

            if (foundOpenParen && parenCount === 0) {
                break;
            }
        }

        return declaration.trim();
    }

    /**
     * 查找方法结束行
     */
    private findMethodEndLineStrict(startLine: number): number {
        let braceCount = 0;
        let foundFirstBrace = false;

        for (let i = startLine; i < this.lines.length; i++) {
            const line = this.lines[i];

            for (const char of line) {
                if (char === "{") {
                    braceCount++;
                    foundFirstBrace = true;
                } else if (char === "}") {
                    braceCount--;
                    if (foundFirstBrace && braceCount === 0) {
                        return i;
                    }
                }
            }

            // 如果是抽象方法或接口方法，以分号结尾
            if (line.trim().endsWith(";") && !foundFirstBrace) {
                return i;
            }
        }

        return this.lines.length - 1;
    }

    /**
     * 严格解析字段
     */
    private parseFieldStrict(lineIndex: number): JavaFieldDoc | null {
        const javadocComment = this.extractJavadocComment(lineIndex);
        const fieldDeclaration = this.lines[lineIndex].trim();

        const fieldInfo = this.parseFieldDeclaration(fieldDeclaration);
        if (!fieldInfo) return null;

        return {
            name: fieldInfo.name,
            type: fieldInfo.type,
            modifiers: fieldInfo.modifiers,
            comment: javadocComment,
            lineRange: { start: lineIndex + 1, end: lineIndex + 1 },
            initialValue: fieldInfo.initialValue,
            isEnumConstant: false,
        };
    }

    /**
     * 解析方法声明
     */
    private parseMethodDeclaration(declaration: string): {
        name: string;
        returnType: string;
        modifiers: string[];
        parameters: JavaParameterDoc[];
        exceptions: string[];
        isConstructor: boolean;
    } | null {
        // 提取修饰符
        const modifiers: string[] = [];
        const modifierPattern =
            /\b(public|private|protected|static|final|abstract|synchronized)\b/g;
        let match;
        while ((match = modifierPattern.exec(declaration)) !== null) {
            modifiers.push(match[1]);
        }

        // 提取方法名和参数
        const methodMatch = declaration.match(/(\w+)\s*\(([^)]*)\)/);
        if (!methodMatch) return null;

        const methodName = methodMatch[1];
        const paramString = methodMatch[2];

        // 检查是否是构造函数
        // 构造函数的特征：方法名之前只有访问修饰符，没有返回类型
        const beforeMethod = declaration.substring(0, declaration.indexOf(methodName));
        const parts = beforeMethod.trim().split(/\s+/).filter(part => part.length > 0);
        
        // 过滤掉修饰符，剩下的应该是返回类型
        const modifierKeywords = ["public", "private", "protected", "static", "final", "abstract", "synchronized"];
        const nonModifierParts = parts.filter(part => !modifierKeywords.includes(part));
        
        // 如果没有非修饰符部分，或者只有泛型声明，则是构造函数
        const isConstructor = nonModifierParts.length === 0 || 
            (nonModifierParts.length === 1 && nonModifierParts[0].startsWith("<"));

        // 提取返回类型
        let returnType = "void";
        if (!isConstructor) {
            if (nonModifierParts.length > 0) {
                returnType = nonModifierParts[nonModifierParts.length - 1];
            }
        }

        // 解析参数
        const parameters = this.parseParameters(paramString);

        // 提取异常
        const exceptions: string[] = [];
        const throwsMatch = declaration.match(/throws\s+([^{]+)/);
        if (throwsMatch) {
            const exceptionList = throwsMatch[1].split(",");
            exceptions.push(...exceptionList.map((e) => e.trim()));
        }

        return {
            name: methodName,
            returnType,
            modifiers,
            parameters,
            exceptions,
            isConstructor,
        };
    }

    /**
     * 解析方法参数
     */
    private parseParameters(paramString: string): JavaParameterDoc[] {
        const parameters: JavaParameterDoc[] = [];

        if (!paramString.trim()) return parameters;

        const params = paramString.split(",");
        for (const param of params) {
            const trimmed = param.trim();
            if (trimmed) {
                const parts = trimmed.split(/\s+/);
                if (parts.length >= 2) {
                    const type = parts[parts.length - 2];
                    const name = parts[parts.length - 1];
                    const isVarArgs = type.endsWith("...");

                    parameters.push({
                        name,
                        type: isVarArgs ? type.slice(0, -3) + "[]" : type,
                        isVarArgs,
                    });
                }
            }
        }

        return parameters;
    }

    /**
     * 解析字段声明
     */
    private parseFieldDeclaration(declaration: string): {
        name: string;
        type: string;
        modifiers: string[];
        initialValue?: string;
    } | null {
        // 移除分号
        const cleaned = declaration.replace(/;$/, "").trim();

        // 提取修饰符
        const modifiers: string[] = [];
        const modifierPattern =
            /\b(public|private|protected|static|final|volatile|transient)\b/g;
        let match;
        while ((match = modifierPattern.exec(cleaned)) !== null) {
            modifiers.push(match[1]);
        }

        // 移除修饰符后的声明
        let withoutModifiers = cleaned;
        modifiers.forEach((mod) => {
            withoutModifiers = withoutModifiers
                .replace(new RegExp(`\\b${mod}\\b`, 'g'), " ")
                .replace(/\s+/g, " ")
                .trim();
        });

        // 检查是否有初始值
        const equalIndex = withoutModifiers.indexOf("=");
        let declarationPart: string;
        let initialValue: string | undefined;

        if (equalIndex !== -1) {
            declarationPart = withoutModifiers.substring(0, equalIndex).trim();
            initialValue = withoutModifiers.substring(equalIndex + 1).trim();
        } else {
            declarationPart = withoutModifiers;
        }

        // 解析类型和名称，支持复杂泛型
        const { type, name } = this.parseTypeAndName(declarationPart);
        
        if (!type || !name) {
            return null;
        }

        return {
            name,
            type,
            modifiers,
            initialValue,
        };
    }

    /**
     * 解析类型和名称，支持复杂泛型
     */
    private parseTypeAndName(declarationPart: string): { type: string; name: string } {
        // 处理泛型：找到最后一个 > 或 ] 或最后一个简单类型单词
        let nameStartIndex = -1;
        let braceCount = 0;
        let angleCount = 0;
        
        for (let i = declarationPart.length - 1; i >= 0; i--) {
            const char = declarationPart[i];
            
            if (char === ']') braceCount++;
            else if (char === '[') braceCount--;
            else if (char === '>') angleCount++;
            else if (char === '<') angleCount--;
            else if (char === ' ' && braceCount === 0 && angleCount === 0) {
                nameStartIndex = i + 1;
                break;
            }
        }
        
        if (nameStartIndex === -1) {
            // 没有找到空格，尝试简单解析
            const parts = declarationPart.trim().split(/\s+/);
            if (parts.length >= 2) {
                const name = parts[parts.length - 1];
                const type = parts.slice(0, -1).join(' ');
                return { type, name };
            }
            return { type: '', name: '' };
        }
        
        const type = declarationPart.substring(0, nameStartIndex).trim();
        const name = declarationPart.substring(nameStartIndex).trim();
        
        return { type, name };
    }

    /**
     * 提取 JavaDoc 注释
     */
    private extractJavadocComment(lineIndex: number): string {
        let comment = "";

        // 向上查找 JavaDoc 注释
        for (let i = lineIndex - 1; i >= 0; i--) {
            const line = this.lines[i].trim();

            if (line.endsWith("*/")) {
                // 找到注释结尾，向上收集注释内容
                for (let j = i; j >= 0; j--) {
                    const commentLine = this.lines[j].trim();
                    comment = commentLine + "\n" + comment;

                    if (commentLine.startsWith("/**")) {
                        break;
                    }
                }
                break;
            }

            // 如果遇到非空行且不是注释，停止查找
            if (line && !line.startsWith("*") && !line.startsWith("//")) {
                break;
            }
        }

        return this.cleanJavadocComment(comment);
    }

    /**
     * 清理 JavaDoc 注释
     */
    private cleanJavadocComment(comment: string): string {
        return comment
            .replace(/\/\*\*|\*\/|\* ?/g, "") // 移除 /** */ 和 *
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line)
            .join("\n")
            .trim();
    }

    /**
     * 解析 JavaDoc 标签
     */
    private parseJavadocTags(comment: string): JavadocTag[] {
        const tags: JavadocTag[] = [];
        const lines = comment.split("\n");

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("@")) {
                const spaceIndex = trimmed.indexOf(" ");
                if (spaceIndex !== -1) {
                    const tag = trimmed.substring(0, spaceIndex);
                    const value = trimmed.substring(spaceIndex + 1).trim();

                    const javadocTag: JavadocTag = { tag, value };

                    // 如果是 @param 标签，提取参数名
                    if (tag === "@param") {
                        const paramMatch = value.match(/^(\w+)\s+(.+)/);
                        if (paramMatch) {
                            javadocTag.paramName = paramMatch[1];
                            javadocTag.value = paramMatch[2];
                        }
                    }

                    tags.push(javadocTag);
                }
            }
        }

        return tags;
    }

    /**
     * 提取 imports
     */
    private extractImports(): string[] {
        const imports: string[] = [];

        for (let i = 0; i < this.lines.length; i++) {
            const line = this.lines[i].trim();
            if (line.startsWith("import ")) {
                // Correctly remove 'import ' prefix and trailing ';'
                const importLine = line.substring(7, line.length - 1).trim();
                imports.push(importLine);
            }
        }

        return imports;
    }

    /**
     * 解析字段或枚举常量
     */
    private parseFieldOrEnumConstant(lineIndex: number, isEnum: boolean, enumName: string): JavaFieldDoc[] {
        const javadocComment = this.extractJavadocComment(lineIndex);
        const declarationLine = this.lines[lineIndex].trim();
        const results: JavaFieldDoc[] = [];

        if (isEnum && /^[A-Z_0-9]+/.test(declarationLine)) {
             // 这是枚举常量列表
            const constants = declarationLine.split(/[,;]/);
            for (const constant of constants) {
                const name = constant.trim().split('(')[0];
                if (name) {
                    results.push({
                        name: name,
                        type: enumName,
                        modifiers: ['public', 'static', 'final'],
                        comment: '', // Enum constants rarely have preceding Javadoc
                        lineRange: { start: lineIndex + 1, end: lineIndex + 1 },
                        isEnumConstant: true,
                    });
                }
            }
            return results;
        }

        // 否则，作为常规字段解析
        const field = this.parseFieldStrict(lineIndex);
        if(field) {
            results.push(field);
        }
        return results;
    }
}

/**
 * 创建项目文档索引
 */
export function createProjectDocIndex(
    classes: JavaClassDoc[]
): ProjectDocIndex {
    const classMap = new Map<string, JavaClassDoc>();
    const packageMap = new Map<string, string[]>();
    const fileMap = new Map<string, string[]>();

    for (const classDoc of classes) {
        // 添加到类映射
        classMap.set(classDoc.fullName, classDoc);

        // 添加到包映射
        const packageClasses = packageMap.get(classDoc.packageName) || [];
        packageClasses.push(classDoc.fullName);
        packageMap.set(classDoc.packageName, packageClasses);

        // 添加到文件映射
        const fileClasses = fileMap.get(classDoc.filePath) || [];
        fileClasses.push(classDoc.fullName);
        fileMap.set(classDoc.filePath, fileClasses);
    }

    return {
        classes: classMap,
        packages: packageMap,
        fileToClasses: fileMap,
    };
}
