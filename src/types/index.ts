export interface FileNode {
    name: string;
    path: string;
    type: "file" | "directory";
    extension?: string;
    children?: FileNode[];
    isExpanded?: boolean;
    level?: number;
}

export interface ProjectInfo {
    name: string;
    path: string;
    description: string;
    files: FileNode[];
}

export interface SearchResult {
    file: FileNode;
    matches: string[];
}

export interface CodeReference {
    line: number;
    column: number;
    text: string;
    file: string;
}

export type SupportedLanguage = "java" | "json" | "gradle" | "text";

export interface AppState {
    currentFile: FileNode | null;
    fileContent: string;
    isLoading: boolean;
    searchTerm: string;
    searchResults: SearchResult[];
    projects: ProjectInfo[];
}

/**
 * 行范围
 */
export interface LineRange {
    start: number;
    end: number;
}

/**
 * Java 方法参数
 */
export interface JavaParameterDoc {
    /** 参数名 */
    name: string;
    /** 参数类型 */
    type: string;
    /** 是否是可变参数 */
    isVarArgs: boolean;
    /** 是否是 final 参数 */
    isFinal?: boolean;
}

/**
 * JavaDoc 标签
 */
export interface JavadocTag {
    /** 标签名 (@param, @return 等) */
    tag: string;
    /** 标签值 */
    value: string;
    /** 如果是 @param，对应的参数名 */
    paramName?: string;
}

/**
 * Java 字段文档
 */
export interface JavaFieldDoc {
    /** 字段名 */
    name: string;
    /** 字段类型 */
    type: string;
    /** 修饰符 */
    modifiers: string[];
    /** JavaDoc 注释 */
    comment?: string;
    /** 在文件中的行号范围 */
    lineRange: LineRange;
    /** 初始值 */
    initialValue?: string;
    /** 是否是枚举常量 */
    isEnumConstant?: boolean;
}

/**
 * Java 方法文档
 */
export interface JavaMethodDoc {
    /** 方法名 */
    name: string;
    /** 返回类型 */
    returnType: string;
    /** 修饰符 */
    modifiers: string[];
    /** 方法参数 */
    parameters: JavaParameterDoc[];
    /** 抛出的异常 */
    exceptions: string[];
    /** JavaDoc 注释 */
    comment?: string;
    /** JavaDoc 标签 (@param, @return, @throws 等) */
    javadocTags: JavadocTag[];
    /** 在文件中的行号范围 */
    lineRange: LineRange;
    /** 是否是构造函数 */
    isConstructor: boolean;
}

/**
 * Java 类文档
 */
export interface JavaClassDoc {
    /** 类名 */
    className: string;
    /** 完整的包名.类名 */
    fullName: string;
    /** 包名 */
    packageName: string;
    /** 类类型 (class, interface, enum, record, @interface) */
    classType: "class" | "interface" | "enum";
    /** 类的 JavaDoc 注释 */
    classComment?: string;
    /** 类修饰符 (public, abstract, final 等) */
    modifiers: string[];
    /** 父类 */
    superClass?: string;
    /** 实现的接口 */
    interfaces: string[];
    /** 导入的包 */
    imports: string[];
    /** 类的字段 */
    fields: JavaFieldDoc[];
    /** 类的方法 */
    methods: JavaMethodDoc[];
    /** 内部类 */
    innerClasses?: JavaClassDoc[];
    /** 源文件路径 */
    filePath: string;
    /** 类在文件中的行号范围 */
    lineRange: LineRange;
    /** 源码 */
    sourceCode?: string;
}

/**
 * 项目文档索引
 */
export interface ProjectDocIndex {
    /** 所有类的文档，以完整类名为 key */
    classes: Map<string, JavaClassDoc>;
    /** 包名到类列表的映射 */
    packages: Map<string, string[]>;
    /** 文件路径到类名的映射 */
    fileToClasses: Map<string, string[]>;
    /** 总类数 */
    totalClasses?: number;
    /** 总包数 */
    totalPackages?: number;
    /** 构建时间 */
    buildTime?: string;
    /** 版本 */
    version?: string;
}

/**
 * 交叉引用信息
 */
export interface CrossReference {
    type:
        | "import"
        | "extends"
        | "implements"
        | "field"
        | "method_call"
        | "parameter"
        | "return_type";
    source: string;
    target: string;
    lineNumber?: number;
}

/**
 * 使用分析结果
 */
export interface UsageAnalysis {
    usedBy: string[];
    uses: string[];
    references: CrossReference[];
}
