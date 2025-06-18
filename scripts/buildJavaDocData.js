#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🚀 开始构建JavaDoc数据...");

/**
 * JavaDoc数据构建器 - 使用内置的改进解析器
 * 扫描Java源码，解析类、方法、字段信息，生成结构化数据
 */
class JavaDocDataBuilder {
    constructor() {
        this.sourceDir = path.join(__dirname, "../forge-1.20.1-47.1.99");
        this.outputDir = path.join(__dirname, "../public/javadoc-data");
        this.sourceOutputDir = path.join(__dirname, "../public/java-sources");

        // 数据存储
        this.classes = new Map(); // className -> classDoc
        this.packages = new Map(); // packageName -> [classNames]
        this.classHierarchy = new Map(); // className -> {parent, children}
        this.references = new Map(); // className -> {uses: [], usedBy: []}

        // 创建输出目录
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
        if (!fs.existsSync(this.sourceOutputDir)) {
            fs.mkdirSync(this.sourceOutputDir, { recursive: true });
        }
    }

    /**
     * 开始构建
     */
    async build() {
        console.log("🔨 开始预构建 JavaDoc 数据...");

        // 确保输出目录存在
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
        if (!fs.existsSync(this.sourceOutputDir)) {
            fs.mkdirSync(this.sourceOutputDir, { recursive: true });
        }

        // 扫描所有Java文件
        const javaFiles = this.scanJavaFiles();
        console.log(`📁 发现 ${javaFiles.length} 个Java文件`);

        // 解析所有文件
        let processedFiles = 0;
        let totalClasses = 0;
        
        for (const filePath of javaFiles) {
            try {
                const classCount = await this.parseJavaFile(filePath);
                totalClasses += classCount;
                processedFiles++;

                if (processedFiles % 100 === 0) {
                    console.log(
                        `  已解析 ${processedFiles}/${javaFiles.length} 个文件，发现 ${totalClasses} 个类...`
                    );
                }
            } catch (error) {
                console.warn(`⚠️  解析失败: ${filePath}`, error.message);
            }
        }

        console.log(
            `✅ 解析完成: ${this.classes.size} 个类（包括内部类）, ${this.packages.size} 个包`
        );

        // 建立继承关系和引用关系
        this.buildRelationships();

        // 生成优化的数据文件
        await this.generateDataFiles();

        console.log("🎉 预构建完成!");
    }

    /**
     * 扫描Java文件
     */
    scanJavaFiles() {
        const javaFiles = [];

        const scanDir = (dirPath) => {
            try {
                const items = fs.readdirSync(dirPath, { withFileTypes: true });

                for (const item of items) {
                    const fullPath = path.join(dirPath, item.name);

                    if (item.isDirectory()) {
                        scanDir(fullPath);
                    } else if (item.name.endsWith(".java")) {
                        javaFiles.push(fullPath);
                    }
                }
            } catch (error) {
                console.warn(`无法扫描目录: ${dirPath}`);
            }
        };

        if (fs.existsSync(this.sourceDir)) {
            scanDir(this.sourceDir);
        }

        return javaFiles;
    }

    /**
     * 解析单个Java文件
     */
    async parseJavaFile(filePath) {
        try {
            const sourceCode = fs.readFileSync(filePath, "utf8");
            const relativePath = path.relative(this.sourceDir, filePath);
            
            const classCount = this.parseJavaSource(relativePath, sourceCode);
            return classCount;
        } catch (error) {
            console.error(`❌ 读取文件失败 ${filePath}:`, error.message);
            return 0;
        }
    }

    /**
     * 解析Java源码 - 使用改进的解析逻辑
     */
    parseJavaSource(filePath, sourceCode) {
        try {
            // 使用改进的解析逻辑解析所有类（包括内部类）
            const allClasses = this.parseFileWithInnerClasses(sourceCode, filePath);
            
            for (const classDoc of allClasses) {
                const { fullName, packageName } = classDoc;
                
                console.log(`📋 解析类: ${fullName}`);

                // 存储类信息
                this.classes.set(fullName, {
                    ...classDoc,
                    sourceCode, // 保存源码用于跳转
                });

                // 更新包信息
                if (!this.packages.has(packageName)) {
                    this.packages.set(packageName, []);
                }
                this.packages.get(packageName).push(fullName);

                // 保存源码文件（为所有类共享同一个源码文件）
                this.saveSourceFile(fullName, sourceCode);
            }
            
            return allClasses.length;
        } catch (error) {
            console.error(`❌ 解析失败 ${filePath}:`, error.message);
            return 0;
        }
    }

    /**
     * 解析Java文件，包括内部类 - 改进版
     */
    parseFileWithInnerClasses(sourceCode, filePath) {
        const lines = sourceCode.split('\n');
        const packageName = this.extractPackageName(sourceCode);
        const imports = this.extractImports(sourceCode);
        
        const allClasses = [];
        this.findAllClasses(lines, packageName, '', 0, lines.length - 1, allClasses, imports, filePath);
        
        return allClasses;
    }

    /**
     * 递归查找所有类（包括内部类）
     */
    findAllClasses(lines, packageName, parentClassName, startLine, endLine, allClasses, imports, filePath) {
        let i = startLine;
        
        while (i <= endLine) {
            const line = lines[i].trim();
            
            // 查找类声明 - 改进的正则表达式
            const classMatch = line.match(/^\s*(public|private|protected)?\s*(static)?\s*(final|abstract)?\s*(class|interface|enum)\s+(\w+)(?:\s+extends\s+([\w<>\.]+))?(?:\s+implements\s+([\w\s,<>\.]+))?\s*\{?/);
            
            if (classMatch) {
                const modifiers = [];
                if (classMatch[1]) modifiers.push(classMatch[1]);
                if (classMatch[2]) modifiers.push(classMatch[2]);
                if (classMatch[3]) modifiers.push(classMatch[3]);
                
                const classType = classMatch[4];
                const className = classMatch[5];
                const superClass = classMatch[6] || '';
                const interfaces = classMatch[7] ? classMatch[7].split(',').map(i => i.trim()) : [];
                
                // 构造完整类名
                const fullClassName = parentClassName 
                    ? `${parentClassName}.${className}`
                    : className;
                
                const fullName = `${packageName}.${fullClassName}`;
                
                // 查找类的结束位置
                const classEndLine = this.findClassEndStrict(lines, i);
                
                // 解析字段和方法 - 只解析当前类级别的成员
                const fields = this.extractFieldsStrict(lines, i, classEndLine);
                const methods = this.extractMethodsStrict(lines, i, classEndLine);
                
                // 解析类注释
                const classComment = this.extractClassComment(lines, i);
                
                const classDoc = {
                    className,
                    fullName,
                    packageName,
                    filePath: `/${filePath}`,
                    classType,
                    modifiers,
                    superClass,
                    interfaces,
                    imports,
                    classComment,
                    methods,
                    fields,
                    innerClasses: [],
                    lineRange: { start: i + 1, end: classEndLine + 1 },
                    sourceFilePath: `/java-sources/${fullName.replace(/\./g, '/')}.java`,
                };
                
                // 递归查找内部类
                this.findAllClasses(lines, packageName, fullClassName, i + 1, classEndLine - 1, classDoc.innerClasses, imports, filePath);
                
                allClasses.push(classDoc);
                
                i = classEndLine + 1;
            } else {
                i++;
            }
        }
    }

    /**
     * 严格查找类结束位置
     */
    findClassEndStrict(lines, startLine) {
        let braceCount = 0;
        let foundFirstBrace = false;
        
        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i];
            
            for (const char of line) {
                if (char === '{') {
                    braceCount++;
                    foundFirstBrace = true;
                } else if (char === '}') {
                    braceCount--;
                    if (foundFirstBrace && braceCount === 0) {
                        return i;
                    }
                }
            }
        }
        
        return lines.length - 1;
    }

    /**
     * 严格提取字段 - 只提取指定类范围内的字段
     */
    extractFieldsStrict(lines, classStart, classEnd) {
        const fields = [];
        const classIndent = this.getLineIndent(lines[classStart]);
        const memberIndent = classIndent + 1;

        for (let i = classStart + 1; i < classEnd; i++) {
            const line = lines[i];
            const lineIndent = this.getLineIndent(line);
            const trimmed = line.trim();

            // 只处理正确缩进级别的行（类的直接成员）
            if (lineIndent !== memberIndent) {
                continue;
            }

            // 跳过注释、方法和内部类
            if (trimmed.startsWith('//') || trimmed.startsWith('/*') || 
                trimmed.startsWith('*') || trimmed.includes('(') || 
                trimmed.startsWith('@') || 
                trimmed.includes('class ') || trimmed.includes('interface ') ||
                trimmed.includes('enum ')) {
                continue;
            }

            // 字段声明模式
            const fieldMatch = trimmed.match(/^\s*(public|private|protected)?\s*(static)?\s*(final)?\s*([\w<>\[\],\s\.]+)\s+(\w+)(?:\s*=.*)?(?:\s*;)?$/);
            
            if (fieldMatch) {
                const modifiers = [];
                if (fieldMatch[1]) modifiers.push(fieldMatch[1]);
                if (fieldMatch[2]) modifiers.push(fieldMatch[2]);
                if (fieldMatch[3]) modifiers.push(fieldMatch[3]);

                const type = fieldMatch[4].trim();
                const name = fieldMatch[5];
                
                // 提取初始值
                const equalIndex = trimmed.indexOf('=');
                const initialValue = equalIndex !== -1 ? 
                    trimmed.substring(equalIndex + 1).replace(/;$/, '').trim() : '';

                const comment = this.extractFieldComment(lines, i);

                fields.push({
                    name,
                    type,
                    modifiers,
                    comment,
                    initialValue,
                    lineRange: { start: i + 1, end: i + 1 },
                });
            }
        }

        return fields;
    }

    /**
     * 严格提取方法 - 只提取指定类范围内的方法
     */
    extractMethodsStrict(lines, classStart, classEnd) {
        const methods = [];
        const classIndent = this.getLineIndent(lines[classStart]);
        const memberIndent = classIndent + 1;

        for (let i = classStart + 1; i < classEnd; i++) {
            const line = lines[i];
            const lineIndent = this.getLineIndent(line);
            const trimmed = line.trim();

            // 只处理正确缩进级别的行（类的直接成员）
            if (lineIndent !== memberIndent) {
                continue;
            }

            // 方法声明模式
            const methodMatch = trimmed.match(/^\s*(public|private|protected)?\s*(static|final|abstract|synchronized)?\s*(static|final|abstract|synchronized)?\s*(?:(\w+(?:<[\w\s,<>\.]+>)?(?:\[\])*)\s+)?(\w+)\s*\(([^)]*)\)(?:\s*throws\s+([\w\s,\.]+))?\s*[{;]?/);

            if (methodMatch && !trimmed.includes('class ') && !trimmed.includes('interface ')) {
                const modifiers = [];
                if (methodMatch[1]) modifiers.push(methodMatch[1]);
                if (methodMatch[2]) modifiers.push(methodMatch[2]);
                if (methodMatch[3] && methodMatch[3] !== methodMatch[2]) modifiers.push(methodMatch[3]);

                const returnType = methodMatch[4] || '';
                const methodName = methodMatch[5];
                const paramString = methodMatch[6];
                const throwsString = methodMatch[7];

                const parameters = this.parseParameters(paramString);
                const exceptions = throwsString ? throwsString.split(',').map(e => e.trim()) : [];
                const { comment, javadocTags } = this.extractMethodComment(lines, i);
                
                // 判断是否是构造函数
                const isConstructor = returnType === '' && 
                    methodName.charAt(0) === methodName.charAt(0).toUpperCase();
                
                const methodEnd = this.findMethodEnd(lines, i);

                methods.push({
                    name: methodName,
                    returnType: isConstructor ? '' : returnType,
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
     * 获取行的缩进级别
     */
    getLineIndent(line) {
        let indent = 0;
        for (const char of line) {
            if (char === ' ') {
                indent++;
            } else if (char === '\t') {
                indent += 4; // tab = 4 spaces
            } else {
                break;
            }
        }
        return Math.floor(indent / 3); // 假设缩进为3个空格
    }

    /**
     * 保存源码文件
     */
    saveSourceFile(fullName, sourceCode) {
        const sourcePath = path.join(
            this.sourceOutputDir,
            fullName.replace(/\./g, "/") + ".java"
        );
        const sourceDir = path.dirname(sourcePath);

        if (!fs.existsSync(sourceDir)) {
            fs.mkdirSync(sourceDir, { recursive: true });
        }

        fs.writeFileSync(sourcePath, sourceCode, "utf-8");
    }

    /**
     * 提取包名
     */
    extractPackageName(sourceCode) {
        const packageMatch = sourceCode.match(/package\s+([\w\.]+)\s*;/);
        return packageMatch ? packageMatch[1] : "";
    }

    /**
     * 提取导入语句
     */
    extractImports(sourceCode) {
        const importRegex = /import\s+(static\s+)?([\w\.\*]+)\s*;/g;
        const imports = [];
        let match;

        while ((match = importRegex.exec(sourceCode)) !== null) {
            imports.push(match[2]);
        }

        return imports;
    }

    parseParameters(paramString) {
        if (!paramString.trim()) return [];

        const params = paramString.split(",");
        return params.map((param) => {
            const trimmed = param.trim();
            const parts = trimmed.split(/\s+/);

            const isFinal = parts.includes("final");
            const isVarArgs = trimmed.includes("...");

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

    extractFieldComment(lines, fieldLineIndex) {
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

    extractMethodComment(lines, methodLineIndex) {
        let comment = "";
        const javadocTags = [];

        for (let i = methodLineIndex - 1; i >= 0; i--) {
            const line = lines[i].trim();

            if (line.startsWith("/**")) {
                let j = i + 1;
                while (j < methodLineIndex) {
                    const commentLine = lines[j].trim();

                    if (commentLine.startsWith("*/")) break;

                    if (commentLine.startsWith("* @")) {
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

    extractClassComment(lines, classLineStart) {
        let comment = "";

        for (let i = classLineStart - 1; i >= 0; i--) {
            const line = lines[i].trim();

            if (line.startsWith("/**")) {
                let j = i;
                while (j < classLineStart) {
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

    findMethodEnd(lines, startLine) {
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
                return i + 1;
            }
        }

        return startLine + 1;
    }

    /**
     * 建立继承关系和引用关系
     */
    buildRelationships() {
        console.log("🔗 建立继承关系和引用关系...");

        for (const [className, classDoc] of this.classes) {
            // 建立继承关系
            if (classDoc.superClass && classDoc.superClass !== "Object") {
                const superClassName = this.resolveClassName(
                    classDoc.superClass,
                    classDoc.imports,
                    classDoc.packageName
                );
                if (superClassName) {
                    if (!this.classHierarchy.has(superClassName)) {
                        this.classHierarchy.set(superClassName, {
                            children: [],
                            parent: null,
                        });
                    }
                    if (!this.classHierarchy.has(className)) {
                        this.classHierarchy.set(className, {
                            children: [],
                            parent: null,
                        });
                    }

                    this.classHierarchy
                        .get(superClassName)
                        .children.push(className);
                    this.classHierarchy.get(className).parent = superClassName;
                }
            }

            // 建立引用关系
            this.buildReferences(classDoc);
        }
    }

    /**
     * 解析类名
     */
    resolveClassName(className, imports, packageName) {
        // 如果是完全限定名
        if (className.includes(".")) {
            return className;
        }

        // 查找导入
        for (const imp of imports) {
            if (imp.endsWith("." + className)) {
                return imp;
            }
        }

        // 同包类
        const samePackageClass = `${packageName}.${className}`;
        if (this.classes.has(samePackageClass)) {
            return samePackageClass;
        }

        // java.lang包
        const javaLangClass = `java.lang.${className}`;
        if (this.classes.has(javaLangClass)) {
            return javaLangClass;
        }

        return null;
    }

    /**
     * 建立引用关系
     */
    buildReferences(classDoc) {
        if (!this.references.has(classDoc.fullName)) {
            this.references.set(classDoc.fullName, {
                usedBy: [],
                uses: [],
            });
        }

        const refs = this.references.get(classDoc.fullName);

        // 分析字段类型引用
        for (const field of classDoc.fields) {
            const referencedClass = this.resolveClassName(
                field.type,
                classDoc.imports,
                classDoc.packageName
            );
            if (referencedClass && referencedClass !== classDoc.fullName) {
                refs.uses.push({
                    type: "field",
                    target: referencedClass,
                    location: field.name,
                    line: field.lineRange.start,
                });

                // 添加反向引用
                if (!this.references.has(referencedClass)) {
                    this.references.set(referencedClass, {
                        usedBy: [],
                        uses: [],
                    });
                }
                this.references.get(referencedClass).usedBy.push({
                    type: "field",
                    source: classDoc.fullName,
                    location: field.name,
                    line: field.lineRange.start,
                });
            }
        }

        // 分析方法参数和返回类型引用
        for (const method of classDoc.methods) {
            // 返回类型
            if (method.returnType) {
                const referencedClass = this.resolveClassName(
                    method.returnType,
                    classDoc.imports,
                    classDoc.packageName
                );
                if (referencedClass && referencedClass !== classDoc.fullName) {
                    refs.uses.push({
                        type: "method-return",
                        target: referencedClass,
                        location: method.name,
                        line: method.lineRange.start,
                    });
                }
            }

            // 参数类型
            for (const param of method.parameters) {
                const referencedClass = this.resolveClassName(
                    param.type,
                    classDoc.imports,
                    classDoc.packageName
                );
                if (referencedClass && referencedClass !== classDoc.fullName) {
                    refs.uses.push({
                        type: "method-parameter",
                        target: referencedClass,
                        location: `${method.name}(${param.name})`,
                        line: method.lineRange.start,
                    });
                }
            }
        }
    }

    /**
     * 生成数据文件
     */
    async generateDataFiles() {
        console.log("📄 生成数据文件...");

        // 主索引文件
        const mainIndex = {
            totalClasses: this.classes.size,
            totalPackages: this.packages.size,
            buildTime: new Date().toISOString(),
            packages: Array.from(this.packages.keys()).sort(),
        };

        fs.writeFileSync(
            path.join(this.outputDir, "index.json"),
            JSON.stringify(mainIndex, null, 2)
        );

        // 包索引
        const packageIndex = {};
        for (const [packageName, classes] of this.packages) {
            packageIndex[packageName] = {
                classes: classes.sort(),
                classCount: classes.length,
            };
        }

        fs.writeFileSync(
            path.join(this.outputDir, "packages.json"),
            JSON.stringify(packageIndex, null, 2)
        );

        // 类层次结构
        const hierarchyData = {};
        for (const [className, hierarchy] of this.classHierarchy) {
            hierarchyData[className] = hierarchy;
        }

        fs.writeFileSync(
            path.join(this.outputDir, "hierarchy.json"),
            JSON.stringify(hierarchyData, null, 2)
        );

        // 引用关系
        const referencesData = {};
        for (const [className, refs] of this.references) {
            referencesData[className] = refs;
        }

        fs.writeFileSync(
            path.join(this.outputDir, "references.json"),
            JSON.stringify(referencesData, null, 2)
        );

        // 分包保存类数据（避免单文件过大）
        const classesDir = path.join(this.outputDir, "classes");
        if (!fs.existsSync(classesDir)) {
            fs.mkdirSync(classesDir, { recursive: true });
        }

        for (const [packageName, classes] of this.packages) {
            const packageData = {};
            for (const className of classes) {
                const classDoc = this.classes.get(className);
                // 移除sourceCode以减小文件大小
                const { sourceCode, ...classDocWithoutSource } = classDoc;
                packageData[className] = classDocWithoutSource;
            }

            const packageFileName = packageName.replace(/\./g, "-") + ".json";
            fs.writeFileSync(
                path.join(classesDir, packageFileName),
                JSON.stringify(packageData, null, 2)
            );
        }

        console.log(`✅ 数据文件生成完成:`);
        console.log(`  - 主索引: index.json`);
        console.log(`  - 包索引: packages.json`);
        console.log(`  - 继承关系: hierarchy.json`);
        console.log(`  - 引用关系: references.json`);
        console.log(`  - 类数据: classes/ 目录下 ${this.packages.size} 个文件`);
    }
}

// 运行构建
const builder = new JavaDocDataBuilder();
builder.build().catch((error) => {
    console.error("❌ 构建失败:", error);
    process.exit(1);
});

export default JavaDocDataBuilder;
