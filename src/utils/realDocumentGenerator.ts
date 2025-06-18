import { ProjectDocIndex, JavaClassDoc } from '../types';
import { RealFileScanner } from './realFileScanner';
import { EnhancedJavaParser } from './enhancedJavaParser';

/**
 * 真实文档生成器
 * 使用新的文件扫描器和解析器生成文档索引
 */
export class RealDocumentGenerator {
    private fileScanner: RealFileScanner;

    constructor() {
        this.fileScanner = new RealFileScanner();
    }

    /**
     * 生成项目文档索引
     */
    async generateDocumentation(): Promise<ProjectDocIndex> {
        console.log('🚀 开始生成 JavaDoc 文档...');

        // 1. 扫描所有 Java 文件
        const javaFiles = await this.fileScanner.scanAllJavaFiles();
        console.log(`✅ 找到 ${javaFiles.length} 个 Java 文件`);

        if (javaFiles.length === 0) {
            console.warn('⚠️ 没有找到任何 Java 文件');
            return this.createEmptyIndex();
        }

        // 2. 解析每个 Java 文件
        const docIndex: ProjectDocIndex = {
            classes: new Map(),
            packages: new Map(),
            fileToClasses: new Map()
        };

        let processedFiles = 0;
        let totalClasses = 0;

        for (const file of javaFiles) {
            try {
                console.log(`📄 处理文件: ${file.path}`);
                
                // 读取文件内容
                const sourceCode = await this.fileScanner.readFile(file.path);
                if (!sourceCode) {
                    console.warn(`⚠️ 文件内容为空: ${file.path}`);
                    continue;
                }

                // 解析 Java 文件
                const classes = EnhancedJavaParser.parseJavaFile(sourceCode, file.path);
                
                if (classes.length > 0) {
                    processedFiles++;
                    totalClasses += classes.length;

                    // 记录文件到类的映射
                    const classNames = classes.map(cls => cls.fullName);
                    docIndex.fileToClasses.set(file.path, classNames);

                    // 处理每个类
                    for (const classDoc of classes) {
                        // 添加类到索引
                        docIndex.classes.set(classDoc.fullName, classDoc);

                        // 更新包映射
                        const packageName = classDoc.packageName || '';
                        if (!docIndex.packages.has(packageName)) {
                            docIndex.packages.set(packageName, []);
                        }
                        const packageClasses = docIndex.packages.get(packageName)!;
                        if (!packageClasses.includes(classDoc.fullName)) {
                            packageClasses.push(classDoc.fullName);
                        }
                    }

                    console.log(`✅ 解析完成: ${classes.length} 个类 (${file.path})`);
                } else {
                    console.warn(`⚠️ 没有找到类定义: ${file.path}`);
                }
            } catch (error) {
                console.error(`❌ 解析文件失败: ${file.path}`, error);
            }
        }

        // 3. 生成统计信息
        const stats = this.generateStats(docIndex);
        console.log('📊 生成统计信息:');
        console.log(`   - 处理文件: ${processedFiles}/${javaFiles.length}`);
        console.log(`   - 总类数: ${stats.totalClasses}`);
        console.log(`   - 总包数: ${stats.totalPackages}`);
        console.log(`   - 总方法数: ${stats.totalMethods}`);
        console.log(`   - 总字段数: ${stats.totalFields}`);

        // 4. 验证结果
        if (stats.totalClasses === 0) {
            console.warn('⚠️ 警告: 没有解析到任何类');
        } else if (stats.totalClasses < 50) {
            console.warn(`⚠️ 警告: 类数量偏少 (${stats.totalClasses})，可能存在扫描不完整的问题`);
        } else {
            console.log('✅ 文档生成完成！');
        }

        return docIndex;
    }

    /**
     * 创建空索引
     */
    private createEmptyIndex(): ProjectDocIndex {
        return {
            classes: new Map(),
            packages: new Map(),
            fileToClasses: new Map()
        };
    }

    /**
     * 生成统计信息
     */
    private generateStats(docIndex: ProjectDocIndex) {
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
            totalFiles: docIndex.fileToClasses.size
        };
    }

    /**
     * 生成已知测试类（用于测试）
     */
    async generateTestClasses(): Promise<ProjectDocIndex> {
        console.log('🧪 生成测试类数据...');
        
        const docIndex: ProjectDocIndex = {
            classes: new Map(),
            packages: new Map(),
            fileToClasses: new Map()
        };

        // 创建一些测试类
        const testClasses = [
            this.createTestClass('com.mojang.authlib', 'Agent'),
            this.createTestClass('com.mojang.authlib', 'AuthenticationService'),
            this.createTestClass('com.mojang.blaze3d', 'Blaze3D'),
            this.createTestClass('net.minecraft.client', 'Minecraft'),
            this.createTestClass('net.minecraft.server', 'MinecraftServer'),
            this.createTestClass('net.minecraftforge.common', 'ForgeConfig')
        ];

        for (const classDoc of testClasses) {
            // 添加类到索引
            docIndex.classes.set(classDoc.fullName, classDoc);

            // 更新包映射
            const packageName = classDoc.packageName || '';
            if (!docIndex.packages.has(packageName)) {
                docIndex.packages.set(packageName, []);
            }
            const packageClasses = docIndex.packages.get(packageName)!;
            packageClasses.push(classDoc.fullName);
        }

        console.log(`✅ 生成了 ${testClasses.length} 个测试类`);
        return docIndex;
    }

    /**
     * 创建测试类
     */
    private createTestClass(packageName: string, className: string): JavaClassDoc {
        const fullName = `${packageName}.${className}`;
        
        return {
            className,
            fullName,
            packageName,
            filePath: `/test/${packageName.replace(/\./g, '/')}/${className}.java`,
            classType: 'class',
            modifiers: ['public'],
            superClass: 'Object',
            interfaces: [],
            imports: [],
            classComment: `Test class for ${className}.\n\nThis is a generated test class for demonstration purposes.`,
            methods: [
                {
                    name: 'getName',
                    returnType: 'String',
                    parameters: [],
                    modifiers: ['public'],
                    comment: 'Returns the name of this object.',
                    javadocTags: [
                        { tag: '@return', paramName: '', value: 'the name as a String' }
                    ],
                    exceptions: [],
                    lineRange: { start: 10, end: 15 },
                    isConstructor: false
                },
                {
                    name: className,
                    returnType: '',
                    parameters: [],
                    modifiers: ['public'],
                    comment: `Constructor for ${className}.`,
                    javadocTags: [],
                    exceptions: [],
                    lineRange: { start: 5, end: 8 },
                    isConstructor: true
                }
            ],
            fields: [
                {
                    name: 'name',
                    type: 'String',
                    modifiers: ['private'],
                    comment: 'The name field.',
                    initialValue: '',
                    lineRange: { start: 3, end: 3 }
                }
            ],
            lineRange: { start: 1, end: 20 }
        };
    }
} 