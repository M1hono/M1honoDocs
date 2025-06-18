import { JavaClassDoc, ProjectDocIndex } from '../types';

/**
 * 预构建数据加载器
 * 快速加载预构建的JavaDoc数据，无需运行时解析
 */
export class PrebuiltDataLoader {
    private cache = new Map<string, any>();
    
    /**
     * 加载主项目索引
     */
    async loadProjectIndex(): Promise<ProjectDocIndex> {
        console.log('📁 加载预构建的 JavaDoc 数据...');
        
        try {
            // Load the main index to get the list of package files
            const mainIndex = await this.loadJSON('/javadoc-data/index.json');
            console.log(`📊 主索引: ${mainIndex.totalClasses} 个类, ${mainIndex.totalPackages} 个包`);

            const docIndex: ProjectDocIndex = {
                classes: new Map(),
                packages: new Map(),
                fileToClasses: new Map(),
                totalClasses: mainIndex.totalClasses,
                totalPackages: mainIndex.totalPackages,
                buildTime: mainIndex.buildTime
            };

            const packageFiles = mainIndex.packageFiles || [];
            
            // Concurrently load all package data files
            const allPackageData = await Promise.all(
                packageFiles.map((fileName: string) => this.loadJSON(`/javadoc-data/classes/${fileName}`))
            );

            // Process all loaded data
            for (const packageData of allPackageData) {
                for (const [className, classDoc] of Object.entries(packageData)) {
                    const typedClassDoc = classDoc as JavaClassDoc;
                    docIndex.classes.set(className, typedClassDoc);
                    
                    const packageName = typedClassDoc.packageName;
                    if (!docIndex.packages.has(packageName)) {
                        docIndex.packages.set(packageName, []);
                    }
                    docIndex.packages.get(packageName)!.push(className);
                }
            }
            
            console.log(`✅ 预构建数据加载完成: ${docIndex.classes.size} 个类, ${docIndex.packages.size} 个包`);
            return docIndex;
            
        } catch (error) {
            console.error('❌ 加载预构建数据失败:', error);
            throw error;
        }
    }

    /**
     * 按需加载包的类数据
     */
    async loadPackageClasses(packageName: string): Promise<Map<string, JavaClassDoc>> {
        // 过滤无效的包名 - 确保包名包含至少一个点号且不包含特殊类名模式
        if (!packageName || 
            !packageName.includes('.') || 
            packageName.match(/^[A-Z][a-zA-Z]*\.Mu$/) ||  // 过滤 Functor.Mu 这样的类名
            packageName.length < 3) {
            console.warn(`⚠️  跳过无效包名: ${packageName}`);
            return new Map();
        }

        const cacheKey = `package:${packageName}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const packageFileName = packageName.replace(/\./g, '-') + '.json';
            const packageData = await this.loadJSON(`/javadoc-data/classes/${packageFileName}`);
            
            const classMap = new Map<string, JavaClassDoc>();
            for (const [className, classDoc] of Object.entries(packageData)) {
                classMap.set(className, classDoc as JavaClassDoc);
            }

            this.cache.set(cacheKey, classMap);
            console.log(`📦 加载包 ${packageName}: ${classMap.size} 个类`);
            
            return classMap;
        } catch (error) {
            console.warn(`⚠️  加载包 ${packageName} 失败:`, error);
            return new Map();
        }
    }

    /**
     * 加载单个类的详细信息
     */
    async loadClassDoc(className: string): Promise<JavaClassDoc | null> {
        console.log(`🔍 Loading class doc for: ${className}`);
        const parts = className.split('.');
        if (parts.length < 2) {
            console.error(`Invalid class name (not enough parts): ${className}`);
            return null;
        }

        // 逻辑：包名都是小写，类名以大写字母开头。
        // 我们找到第一个大写字母开头的组件，它和它之前的所有组件构成了包名。
        let packageParts: string[] = [];
        let firstClassPartIndex = -1;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (part.length > 0 && part.charAt(0) === part.charAt(0).toUpperCase() && !part.includes('$')) {
                // This is likely the start of the class name
                firstClassPartIndex = i;
                break;
            }
        }

        if (firstClassPartIndex === -1) {
             // Fallback for weird names, take all but last as package
            firstClassPartIndex = parts.length - 1;
        }
        
        const packageName = parts.slice(0, firstClassPartIndex).join('.');
        if (!packageName) {
            console.error(`Could not determine package name for: ${className}`);
            return null;
        }

        console.log(`Determined package [${packageName}] for class [${className}]`);

        const packageClasses = await this.loadPackageClasses(packageName);

        // 尝试直接获取类
        const directMatch = packageClasses.get(className);
        if (directMatch) {
            console.log(`✅ Found direct match for ${className}`);
            return directMatch;
        }

        // 如果直接找不到，它可能是一个内部类，我们需要从它的顶级父类中查找
        const topLevelClassSimpleName = parts[firstClassPartIndex];
        const topLevelClassFullName = `${packageName}.${topLevelClassSimpleName}`;
        
        console.log(`Direct match failed. Trying to find as inner class via parent: ${topLevelClassFullName}`);

        const parentClassDoc = packageClasses.get(topLevelClassFullName);
        if (parentClassDoc) {
            const innerClass = this.searchNestedInnerClasses(parentClassDoc, className);
            if(innerClass) {
                console.log(`✅ Found nested inner class: ${className}`);
                return innerClass;
            }
        }

        console.warn(`❌ Class not found after all attempts: ${className}`);
        return null;
    }

    /**
     * 递归搜索嵌套的内部类
     */
    private searchNestedInnerClasses(classDoc: JavaClassDoc, targetClassName: string): JavaClassDoc | null {
        if (!classDoc.innerClasses || classDoc.innerClasses.length === 0) {
            return null;
        }
        
        for (const innerClass of classDoc.innerClasses) {
            if (innerClass.fullName === targetClassName) {
                return innerClass;
            }
            
            // 递归搜索
            const nestedResult = this.searchNestedInnerClasses(innerClass, targetClassName);
            if (nestedResult) {
                return nestedResult;
            }
        }
        
        return null;
    }

    /**
     * 加载类的源码
     */
    async loadSourceCode(filePath: string): Promise<string | null> {
        if (!filePath) return null;

        // 规范化路径
        const normalizedPath = filePath.replace(/\\/g, '/').replace(/^\//, '');
        const sourceUrl = `/java-sources/${normalizedPath}`;
        
        console.log(`Fetching source code from: ${sourceUrl}`);

        try {
            const response = await fetch(sourceUrl);
            
            if (response.ok) {
                const text = await response.text();
                 // vite dev server returns html for 404
                if (text.startsWith('<!DOCTYPE html>')) {
                    console.error(`Failed to load source for ${filePath}, server returned HTML.`);
                    return `// Source file not found at: ${sourceUrl}`;
                }
                return text;
            } else {
                 console.error(`Failed to load source for ${filePath}, status: ${response.status}`);
                 return `// Failed to load source file. Status: ${response.status}`;
            }
        } catch (error) {
            console.error(`⚠️  加载源码失败: ${filePath}`, error);
            return `// Error loading source file: ${error}`;
        }
    }

    /**
     * 加载继承关系数据
     */
    async loadHierarchy(): Promise<Map<string, { children: string[]; parent: string | null }>> {
        const cacheKey = 'hierarchy';
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const hierarchyData = await this.loadJSON('/javadoc-data/hierarchy.json');
            const hierarchyMap = new Map();
            
            for (const [className, hierarchy] of Object.entries(hierarchyData)) {
                hierarchyMap.set(className, hierarchy);
            }

            this.cache.set(cacheKey, hierarchyMap);
            return hierarchyMap;
        } catch (error) {
            console.warn('⚠️  加载继承关系失败:', error);
            return new Map();
        }
    }

    /**
     * 加载引用关系数据
     */
    async loadReferences(): Promise<Map<string, { usedBy: any[]; uses: any[] }>> {
        const cacheKey = 'references';
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const referencesData = await this.loadJSON('/javadoc-data/references.json');
            const referencesMap = new Map();
            
            for (const [className, refs] of Object.entries(referencesData)) {
                referencesMap.set(className, refs);
            }

            this.cache.set(cacheKey, referencesMap);
            return referencesMap;
        } catch (error) {
            console.warn('⚠️  加载引用关系失败:', error);
            return new Map();
        }
    }

    /**
     * 搜索类和包
     */
    async search(query: string, docIndex: ProjectDocIndex): Promise<Array<{
        type: 'class' | 'package';
        name: string;
        fullName: string;
        packageName?: string;
        url: string;
    }>> {
        const results: Array<{
            type: 'class' | 'package';
            name: string;
            fullName: string;
            packageName?: string;
            url: string;
        }> = [];
        
        const queryLower = query.toLowerCase();

        // 搜索包
        for (const packageName of docIndex.packages.keys()) {
            if (packageName.toLowerCase().includes(queryLower)) {
                results.push({
                    type: 'package',
                    name: packageName.split('.').pop() || packageName,
                    fullName: packageName,
                    url: `/package/${encodeURIComponent(packageName)}`
                });
            }
        }

        // 搜索类（按需加载）
        for (const [packageName, classList] of docIndex.packages) {
            if (packageName.toLowerCase().includes(queryLower)) {
                // 如果包名匹配，加载包中的所有类
                const packageClasses = await this.loadPackageClasses(packageName);
                for (const [className, classDoc] of packageClasses) {
                    if (classDoc.className.toLowerCase().includes(queryLower)) {
                        results.push({
                            type: 'class',
                            name: classDoc.className,
                            fullName: className,
                            packageName: packageName,
                            url: `/class/${encodeURIComponent(className)}`
                        });
                    }
                }
            } else {
                // 检查类名是否匹配（不加载详细数据）
                for (const className of classList) {
                    const simpleClassName = className.split('.').pop() || '';
                    if (simpleClassName.toLowerCase().includes(queryLower)) {
                        results.push({
                            type: 'class',
                            name: simpleClassName,
                            fullName: className,
                            packageName: packageName,
                            url: `/class/${encodeURIComponent(className)}`
                        });
                    }
                }
            }
        }

        return results.slice(0, 20); // 限制结果数量
    }

    /**
     * 获取类的父类信息
     */
    async getParentClass(className: string): Promise<JavaClassDoc | null> {
        const hierarchy = await this.loadHierarchy();
        const classHierarchy = hierarchy.get(className);
        
        if (classHierarchy?.parent) {
            return await this.loadClassDoc(classHierarchy.parent);
        }
        
        return null;
    }

    /**
     * 获取类的子类列表
     */
    async getChildClasses(className: string): Promise<JavaClassDoc[]> {
        const hierarchy = await this.loadHierarchy();
        const classHierarchy = hierarchy.get(className);
        
        if (classHierarchy?.children) {
            const childClasses: JavaClassDoc[] = [];
            for (const childClassName of classHierarchy.children) {
                const childClass = await this.loadClassDoc(childClassName);
                if (childClass) {
                    childClasses.push(childClass);
                }
            }
            return childClasses;
        }
        
        return [];
    }

    /**
     * 获取类的引用信息
     */
    async getClassReferences(className: string): Promise<{
        usedBy: Array<{ type: string; source: string; location: string; line: number }>;
        uses: Array<{ type: string; target: string; location: string; line: number }>;
    }> {
        const references = await this.loadReferences();
        return references.get(className) || { usedBy: [], uses: [] };
    }

    /**
     * 通用JSON加载方法 - 增强错误处理
     */
    private async loadJSON(url: string): Promise<any> {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${url}`);
            }
            
            const text = await response.text();

            // Handle cases where GitHub Pages returns a 200 OK with an HTML error page
            if (text.startsWith('<!DOCTYPE html>')) {
                console.error(`Received HTML page instead of JSON data from: ${url}`);
                throw new Error(`Received HTML page instead of JSON data: ${url}`);
            }
            
            return JSON.parse(text);
        } catch (error) {
            if (error instanceof SyntaxError) {
                console.error(`JSON parse error for ${url}:`, error);
                throw new Error(`Failed to parse JSON from ${url}: ${error.message}`);
            }
            // Re-throw other errors (like the HTTP error)
            throw error;
        }
    }

    /**
     * 清除缓存
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * 获取缓存统计信息
     */
    getCacheStats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
} 