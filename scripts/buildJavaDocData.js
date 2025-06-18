#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🚀 开始构建JavaDoc数据...");

class JavaDocDataBuilder {
    constructor(version) {
        this.version = version;
        this.sourceDir = path.join(__dirname, `../source/${version}`);
        this.outputDir = path.join(
            __dirname,
            `../public/javadoc-data/${version}`
        );
        this.sourceOutputDir = path.join(
            __dirname,
            `../public/java-sources/${version}`
        );

        this.classes = new Map();
        this.packages = new Map();
        this.classHierarchy = new Map();
        this.references = new Map();

        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
        if (!fs.existsSync(this.sourceOutputDir)) {
            fs.mkdirSync(this.sourceOutputDir, { recursive: true });
        }
    }

    async build() {
        console.log(`🔨 开始为版本 [${this.version}] 构建 JavaDoc 数据...`);

        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
        if (!fs.existsSync(this.sourceOutputDir)) {
            fs.mkdirSync(this.sourceOutputDir, { recursive: true });
        }

        const javaFiles = this.scanJavaFiles();
        console.log(`📁 [${this.version}] 发现 ${javaFiles.length} 个Java文件`);

        let processedFiles = 0;
        let totalClasses = 0;

        for (const filePath of javaFiles) {
            try {
                const classCount = await this.parseJavaFile(filePath);
                totalClasses += classCount;
                processedFiles++;

                if (processedFiles % 100 === 0) {
                    console.log(
                        `  [${this.version}] 已解析 ${processedFiles}/${javaFiles.length} 个文件，发现 ${totalClasses} 个类...`
                    );
                }
            } catch (error) {
                console.warn(`⚠️  [${this.version}] 解析失败: ${filePath}`, error.message);
            }
        }

        console.log(
            `✅ [${this.version}] 解析完成: ${this.classes.size} 个类（包括内部类）, ${this.packages.size} 个包`
        );

        this.buildRelationships();
        await this.generateDataFiles();

        console.log("🎉 预构建完成!");
    }

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

    parseJavaSource(filePath, sourceCode) {
        try {
            const allClasses = this.parseFileWithInnerClasses(
                sourceCode,
                filePath
            );

            for (const classDoc of allClasses) {
                const { fullName, packageName } = classDoc;

                console.log(`📋 [${this.version}] 解析类: ${fullName}`);

                this.classes.set(fullName, {
                    ...classDoc,
                    sourceCode,
                });

                if (!this.packages.has(packageName)) {
                    this.packages.set(packageName, []);
                }
                this.packages.get(packageName).push(fullName);

                this.saveSourceFile(fullName, sourceCode);
            }

            return allClasses.length;
        } catch (error) {
            console.error(`❌ 解析失败 ${filePath}:`, error.message);
            return 0;
        }
    }

    parseFileWithInnerClasses(sourceCode, filePath) {
        const lines = sourceCode.split("\n");
        const packageName = this.extractPackageName(sourceCode);
        const imports = this.extractImports(sourceCode);

        const allClasses = [];
        this.findAllClasses(
            lines,
            packageName,
            "",
            0,
            lines.length - 1,
            allClasses,
            imports,
            filePath
        );

        return allClasses;
    }

    findAllClasses(
        lines,
        packageName,
        parentClassName,
        startLine,
        endLine,
        allClasses,
        imports,
        filePath
    ) {
        let i = startLine;

        while (i <= endLine) {
            const line = lines[i].trim();

            const classMatch = line.match(
                /^\s*(public|private|protected)?\s*(static)?\s*(final|abstract)?\s*(class|interface|enum)\s+(\w+)(?:\s+extends\s+([\w<>\.]+))?(?:\s+implements\s+([\w\s,<>\.]+))?\s*\{?/
            );

            if (classMatch) {
                const modifiers = [];
                if (classMatch[1]) modifiers.push(classMatch[1]);
                if (classMatch[2]) modifiers.push(classMatch[2]);
                if (classMatch[3]) modifiers.push(classMatch[3]);

                const classType = classMatch[4];
                const className = classMatch[5];
                const superClass = classMatch[6] || "";
                const interfaces = classMatch[7]
                    ? classMatch[7].split(",").map((i) => i.trim())
                    : [];

                const fullClassName = parentClassName
                    ? `${parentClassName}.${className}`
                    : className;

                const fullName = `${packageName}.${fullClassName}`;
                const classEndLine = this.findClassEndStrict(lines, i);

                const fields = this.extractFieldsStrict(lines, i, classEndLine);
                const methods = this.extractMethodsStrict(
                    lines,
                    i,
                    classEndLine
                );

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
                    sourceFilePath: `/java-sources/${
                        this.version
                    }/${fullName.replace(/\./g, "/")}.java`,
                };

                this.findAllClasses(
                    lines,
                    packageName,
                    fullClassName,
                    i + 1,
                    classEndLine - 1,
                    classDoc.innerClasses,
                    imports,
                    filePath
                );

                allClasses.push(classDoc);

                i = classEndLine + 1;
            } else {
                i++;
            }
        }
    }

    findClassEndStrict(lines, startLine) {
        let braceCount = 0;
        let foundFirstBrace = false;

        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i];

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
        }

        return lines.length - 1;
    }

    extractFieldsStrict(lines, classStart, classEnd) {
        const fields = [];
        const classIndent = this.getLineIndent(lines[classStart]);
        const memberIndent = classIndent + 1;

        for (let i = classStart + 1; i < classEnd; i++) {
            const line = lines[i];
            const lineIndent = this.getLineIndent(line);
            const trimmed = line.trim();

            if (lineIndent !== memberIndent) {
                continue;
            }
            if (
                trimmed.startsWith("//") ||
                trimmed.startsWith("/*") ||
                trimmed.startsWith("*") ||
                trimmed.includes("(") ||
                trimmed.startsWith("@") ||
                trimmed.includes("class ") ||
                trimmed.includes("interface ") ||
                trimmed.includes("enum ")
            ) {
                continue;
            }

            const fieldMatch = trimmed.match(
                /^\s*(public|private|protected)?\s*(static)?\s*(final)?\s*([\w<>\[\],\s\.]+)\s+(\w+)(?:\s*=.*)?(?:\s*;)?$/
            );

            if (fieldMatch) {
                const modifiers = [];
                if (fieldMatch[1]) modifiers.push(fieldMatch[1]);
                if (fieldMatch[2]) modifiers.push(fieldMatch[2]);
                if (fieldMatch[3]) modifiers.push(fieldMatch[3]);

                const type = fieldMatch[4].trim();
                const name = fieldMatch[5];

                const equalIndex = trimmed.indexOf("=");
                const initialValue =
                    equalIndex !== -1
                        ? trimmed
                              .substring(equalIndex + 1)
                              .replace(/;$/, "")
                              .trim()
                        : "";

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

    extractMethodsStrict(lines, classStart, classEnd) {
        const methods = [];
        const classIndent = this.getLineIndent(lines[classStart]);
        const memberIndent = classIndent + 1;

        for (let i = classStart + 1; i < classEnd; i++) {
            const line = lines[i];
            const lineIndent = this.getLineIndent(line);
            const trimmed = line.trim();
            if (lineIndent !== memberIndent) {
                continue;
            }

            const methodMatch = trimmed.match(
                /^\s*(public|private|protected)?\s*(static|final|abstract|synchronized)?\s*(static|final|abstract|synchronized)?\s*(?:(\w+(?:<[\w\s,<>\.]+>)?(?:\[\])*)\s+)?(\w+)\s*\(([^)]*)\)(?:\s*throws\s+([\w\s,\.]+))?\s*[{;]?/
            );

            if (
                methodMatch &&
                !trimmed.includes("class ") &&
                !trimmed.includes("interface ")
            ) {
                const modifiers = [];
                if (methodMatch[1]) modifiers.push(methodMatch[1]);
                if (methodMatch[2]) modifiers.push(methodMatch[2]);
                if (methodMatch[3] && methodMatch[3] !== methodMatch[2])
                    modifiers.push(methodMatch[3]);

                const returnType = methodMatch[4] || "";
                const methodName = methodMatch[5];
                const paramString = methodMatch[6];
                const throwsString = methodMatch[7];

                const parameters = this.parseParameters(paramString);
                const exceptions = throwsString
                    ? throwsString.split(",").map((e) => e.trim())
                    : [];
                const { comment, javadocTags } = this.extractMethodComment(
                    lines,
                    i
                );

                const isConstructor =
                    returnType === "" &&
                    methodName.charAt(0) === methodName.charAt(0).toUpperCase();

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

    getLineIndent(line) {
        let indent = 0;
        for (const char of line) {
            if (char === " ") {
                indent++;
            } else if (char === "\t") {
                indent += 4;
            } else {
                break;
            }
        }
        return Math.floor(indent / 3);
    }

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

    extractPackageName(sourceCode) {
        const packageMatch = sourceCode.match(/package\s+([\w\.]+)\s*;/);
        return packageMatch ? packageMatch[1] : "";
    }

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

    buildRelationships() {
        console.log(`🔗 [${this.version}] 建立继承关系和引用关系...`);

        for (const [className, classDoc] of this.classes) {
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

            this.buildReferences(classDoc);
        }
    }

    resolveClassName(className, imports, packageName) {
        if (className.includes(".")) {
            return className;
        }

        for (const imp of imports) {
            if (imp.endsWith("." + className)) {
                return imp;
            }
        }

        const samePackageClass = `${packageName}.${className}`;
        if (this.classes.has(samePackageClass)) {
            return samePackageClass;
        }

        const javaLangClass = `java.lang.${className}`;
        if (this.classes.has(javaLangClass)) {
            return javaLangClass;
        }

        return null;
    }

    buildReferences(classDoc) {
        if (!this.references.has(classDoc.fullName)) {
            this.references.set(classDoc.fullName, {
                usedBy: [],
                uses: [],
            });
        }

        const refs = this.references.get(classDoc.fullName);

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

        for (const method of classDoc.methods) {
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

    async generateDataFiles() {
        console.log(`📄 [${this.version}] 生成数据文件...`);

        const packageFileNames = [];
        for (const packageName of this.packages.keys()) {
            packageFileNames.push(`${packageName.replace(/\./g, "-")}.json`);
        }

        const mainIndex = {
            totalClasses: this.classes.size,
            totalPackages: this.packages.size,
            buildTime: new Date().toISOString(),
            packageFiles: packageFileNames,
        };

        fs.writeFileSync(
            path.join(this.outputDir, "index.json"),
            JSON.stringify(mainIndex, null, 2)
        );

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

        const hierarchyData = {};
        for (const [className, hierarchy] of this.classHierarchy) {
            hierarchyData[className] = hierarchy;
        }

        fs.writeFileSync(
            path.join(this.outputDir, "hierarchy.json"),
            JSON.stringify(hierarchyData, null, 2)
        );

        const referencesData = {};
        for (const [className, refs] of this.references) {
            referencesData[className] = refs;
        }

        fs.writeFileSync(
            path.join(this.outputDir, "references.json"),
            JSON.stringify(referencesData, null, 2)
        );

        const classesDir = path.join(this.outputDir, "classes");
        if (!fs.existsSync(classesDir)) {
            fs.mkdirSync(classesDir, { recursive: true });
        }

        for (const [packageName, classes] of this.packages) {
            const packageData = {};
            for (const className of classes) {
                const classDoc = this.classes.get(className);
                const { sourceCode, ...classDocWithoutSource } = classDoc;
                packageData[className] = classDocWithoutSource;
            }

            const packageFileName = packageName.replace(/\./g, "-") + ".json";
            fs.writeFileSync(
                path.join(classesDir, packageFileName),
                JSON.stringify(packageData, null, 2)
            );
        }

        console.log(`✅ [${this.version}] 数据文件生成完成:`);
        console.log(`  - 主索引: index.json`);
        console.log(`  - 包索引: packages.json`);
        console.log(`  - 继承关系: hierarchy.json`);
        console.log(`  - 引用关系: references.json`);
        console.log(`  - 类数据: classes/ 目录下 ${this.packages.size} 个文件`);
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
        console.log(`\n\n🚀 开始为版本 [${version}] 构建...`);
        try {
            const builder = new JavaDocDataBuilder(version);
            await builder.build();
            console.log(`🎉 成功完成版本 [${version}] 的构建`);
        } catch (error) {
            console.error(`❌ 构建失败 for version ${version}:`, error);
        }
    }
    console.log("\n\n✅ 所有版本构建完成!");
}

main().catch((error) => {
    console.error("❌ 构建过程发生严重错误:", error);
    process.exit(1);
});

export default JavaDocDataBuilder;