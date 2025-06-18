import React, { useState, useEffect } from "react";
import {
    useParams,
    Link,
    useSearchParams,
    useNavigate,
} from "react-router-dom";
import {
    Card,
    Typography,
    Table,
    Tag,
    Space,
    Breadcrumb,
    Alert,
    Tabs,
    Button,
    Collapse,
    message,
    Tooltip,
    Badge,
    Input,
    List,
    Avatar,
} from "antd";
import {
    ApiOutlined,
    HomeOutlined,
    FolderOutlined,
    CodeOutlined,
    FieldTimeOutlined,
    CopyOutlined,
    BranchesOutlined,
    LinkOutlined,
    PlayCircleOutlined,
    BookOutlined,
    SearchOutlined,
    RollbackOutlined,
} from "@ant-design/icons";
import {
    ProjectDocIndex,
    JavaClassDoc,
    JavaMethodDoc,
    JavaFieldDoc,
} from "../../types";
import { CodeViewer } from "../CodeViewer";
import { PrebuiltDataLoader } from "../../utils/prebuiltDataLoader";

const { Title, Text, Paragraph } = Typography;

/**
 * Generates the correct KubeJS name for a class, using '$' for inner classes.
 */
const getKubeJSName = (classDoc: JavaClassDoc): string => {
    if (
        !classDoc.packageName ||
        !classDoc.fullName.startsWith(classDoc.packageName)
    ) {
        // Fallback for missing package or malformed name
        return classDoc.fullName.replace(/\./g, "$");
    }
    const classHierarchyPart = classDoc.fullName.substring(
        classDoc.packageName.length + 1
    );
    const kubeJSClassPart = classHierarchyPart.replace(/\./g, "$");
    return `${classDoc.packageName}.${kubeJSClassPart}`;
};

interface JavaDocClassProps {
    docIndex: ProjectDocIndex | null;
}

export const JavaDocClass: React.FC<JavaDocClassProps> = ({ docIndex }) => {
    const { className: encodedClassName } = useParams<{ className: string }>();
    const [searchParams] = useSearchParams();
    const className = encodedClassName
        ? decodeURIComponent(encodedClassName)
        : "";
    const [activeTab, setActiveTab] = useState("overview");
    const [classDoc, setClassDoc] = useState<JavaClassDoc | null>(null);
    const [sourceCode, setSourceCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [parentClass, setParentClass] = useState<JavaClassDoc | null>(null);
    const [childClasses, setChildClasses] = useState<JavaClassDoc[]>([]);
    const [references, setReferences] = useState<{
        usedBy: Array<{
            type: string;
            source: string;
            location: string;
            line: number;
        }>;
        uses: Array<{
            type: string;
            target: string;
            location: string;
            line: number;
        }>;
    }>({ usedBy: [], uses: [] });
    const [highlightedLines, setHighlightedLines] = useState<number[]>([]);

    // 新增状态：搜索和过滤功能
    const [searchText, setSearchText] = useState("");
    const [memberFilter, setMemberFilter] = useState<
        "all" | "fields" | "methods" | "public" | "private"
    >("all");
    const [highlightedMethod, setHighlightedMethod] = useState<string | null>(
        null
    );

    const navigate = useNavigate();

    // 获取数据加载器
    const dataLoader = (docIndex as any)?.dataLoader as PrebuiltDataLoader;

    // 处理URL参数中的tab和method
    useEffect(() => {
        const tabParam = searchParams.get("tab");
        const methodParam = searchParams.get("method");
        const lineParam = searchParams.get("line");
        const linesParam = searchParams.get("lines");

        if (tabParam) setActiveTab(tabParam);

        let linesToHighlight: number[] = [];
        if (linesParam) {
            const parts = linesParam
                .split("-")
                .map((p) => parseInt(p.trim(), 10));
            if (parts.length === 1 && !isNaN(parts[0])) {
                linesToHighlight = [parts[0]];
            } else if (
                parts.length === 2 &&
                !isNaN(parts[0]) &&
                !isNaN(parts[1])
            ) {
                const [start, end] = parts;
                if (start <= end) {
                    linesToHighlight = Array.from(
                        { length: end - start + 1 },
                        (_, i) => start + i
                    );
                }
            }
        } else if (lineParam) {
            const line = parseInt(lineParam, 10);
            if (!isNaN(line)) {
                linesToHighlight = [line];
            }
        }

        if (linesToHighlight.length > 0) {
            setHighlightedLines(linesToHighlight);
            setActiveTab("source"); // Automatically switch to source tab
        }

        if (methodParam) {
            setHighlightedMethod(methodParam);
            // 如果指定了方法，自动滚动到该方法
            setTimeout(() => {
                const methodElement = document.getElementById(
                    `method-${methodParam}`
                );
                if (methodElement) {
                    methodElement.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                    });
                    methodElement.style.background = "#fff566";
                    setTimeout(() => {
                        methodElement.style.background = "";
                    }, 2000);
                }
            }, 500);
        }
    }, [searchParams]);

    useEffect(() => {
        if (className && dataLoader) {
            loadClassData();
        }
    }, [className, dataLoader]);

    const loadClassData = async () => {
        if (!className || !dataLoader) return;

        setLoading(true);
        setClassDoc(null); // Clear previous class doc
        setSourceCode(null); // Clear previous source
        try {
            // Step 1: Load the class documentation object
            const classDocData = await dataLoader.loadClassDoc(className);
            if (!classDocData) {
                message.error(`Class not found: ${className}`);
                setClassDoc(null);
                return;
            }
            setClassDoc(classDocData);

            // Step 2: Concurrently load all other data using the retrieved classDocData
            const [
                sourceCodeData,
                parentClassData,
                childClassesData,
                referencesData,
            ] = await Promise.all([
                dataLoader.loadSourceCode(classDocData.filePath), // Use correct filePath
                dataLoader.getParentClass(className),
                dataLoader.getChildClasses(className),
                dataLoader.getClassReferences(className),
            ]);

            setSourceCode(sourceCodeData);
            setParentClass(parentClassData);
            setChildClasses(childClassesData);
            setReferences(referencesData);
        } catch (error) {
            console.error("Failed to load class data:", error);
            message.error("Failed to load class data");
            setClassDoc(null);
        } finally {
            setLoading(false);
        }
    };

    /**
     * 跳转到源码的指定行
     */
    const jumpToSourceLine = (line: number) => {
        setActiveTab("source");
        setHighlightedLines([line]);
        setTimeout(() => {
            setHighlightedLines([]);
        }, 3000);
    };

    /**
     * 创建类型链接
     */
    const createTypeLink = (type: string) => {
        if (!type || !docIndex) return <Text code>{type}</Text>;

        // 检查是否是已知的类类型
        const fullClassName = Array.from(docIndex.packages.values())
            .flat()
            .find((cls) => cls.endsWith(`.${type}`) || cls === type);

        if (fullClassName) {
            return (
                <Link to={`/class/${encodeURIComponent(fullClassName)}`}>
                    <Text code className="type-link" title={fullClassName}>
                        {type}
                    </Text>
                </Link>
            );
        }

        return (
            <Text code title={type}>
                {type}
            </Text>
        );
    };

    /**
     * 渲染现代化修饰符
     */
    const renderModifiers = (modifiers: string[]) => {
        const colorMap: Record<string, string> = {
            public: "success",
            private: "error",
            protected: "warning",
            static: "processing",
            final: "purple",
            abstract: "magenta",
            synchronized: "cyan",
            volatile: "orange",
            transient: "geekblue",
            native: "gold",
        };

        return modifiers.map((modifier) => (
            <Tag
                key={modifier}
                color={colorMap[modifier] || "default"}
                className="modern-modifier-tag"
            >
                {modifier}
            </Tag>
        ));
    };

    /**
     * 复制到剪贴板
     */
    const copyToClipboard = (text: string, description?: string) => {
        navigator.clipboard.writeText(text);
        message.success(`Copied ${description || "text"} to clipboard`);
    };

    // 过滤字段和方法
    const getFilteredMembers = () => {
        if (!classDoc) return { fields: [], methods: [] };

        let fields = classDoc.fields;
        let methods = classDoc.methods;

        // 根据搜索文本过滤
        if (searchText) {
            const searchLower = searchText.toLowerCase();
            fields = fields.filter(
                (field) =>
                    field.name.toLowerCase().includes(searchLower) ||
                    field.type.toLowerCase().includes(searchLower) ||
                    (field.comment &&
                        field.comment.toLowerCase().includes(searchLower))
            );
            methods = methods.filter(
                (method) =>
                    method.name.toLowerCase().includes(searchLower) ||
                    method.returnType?.toLowerCase().includes(searchLower) ||
                    (method.comment &&
                        method.comment.toLowerCase().includes(searchLower)) ||
                    method.parameters.some(
                        (p) =>
                            p.type.toLowerCase().includes(searchLower) ||
                            p.name.toLowerCase().includes(searchLower)
                    )
            );
        }

        // 根据类型过滤
        switch (memberFilter) {
            case "fields":
                methods = [];
                break;
            case "methods":
                fields = [];
                break;
            case "public":
                fields = fields.filter((f) => f.modifiers.includes("public"));
                methods = methods.filter((m) => m.modifiers.includes("public"));
                break;
            case "private":
                fields = fields.filter((f) => f.modifiers.includes("private"));
                methods = methods.filter((m) =>
                    m.modifiers.includes("private")
                );
                break;
        }

        return { fields, methods };
    };

    // 复制字段声明
    const copyFieldDeclaration = (field: JavaFieldDoc) => {
        const declaration = `${field.modifiers.join(" ")} ${field.type} ${
            field.name
        };`;
        navigator.clipboard.writeText(declaration);
        message.success("字段声明已复制到剪贴板");
    };

    // 复制方法签名
    const copyMethodSignature = (method: JavaMethodDoc) => {
        const params = method.parameters
            .map((param) => `${createTypeLink(param.type)} ${param.name}`)
            .join(", ");
        const signature = `${method.modifiers.join(" ")} ${
            method.returnType || "void"
        } ${method.name}(${params})`;
        navigator.clipboard.writeText(signature);
        message.success("方法签名已复制到剪贴板");
    };

    /**
     * 智能类跳转 - 在整个项目中搜索类名
     */
    const handleSmartJump = async (simpleName: string) => {
        if (!classDoc || !docIndex) {
            message.error("Documentation index not ready.");
            return;
        }

        console.log(
            `Resolving [${simpleName}] from context [${classDoc.fullName}]...`
        );

        const strategies: (() => Promise<string | null>)[] = [
            // Strategy 1: Imports (direct and wildcard)
            async () => {
                const imports = classDoc.imports || [];
                const directImport = imports.find((imp) =>
                    imp.endsWith(`.${simpleName}`)
                );
                if (directImport) return directImport;

                const wildcardImports = imports.filter((imp) =>
                    imp.endsWith(".*")
                );
                for (const imp of wildcardImports) {
                    const fqcn = `${imp.slice(0, -1)}${simpleName}`;
                    const pkgName = fqcn.substring(0, fqcn.lastIndexOf("."));
                    if (docIndex.packages.get(pkgName)?.includes(fqcn))
                        return fqcn;
                }
                return null;
            },
            // Strategy 2: Parent class
            async () => {
                if (classDoc.fullName.includes(".")) {
                    const parentFqcn = classDoc.fullName.substring(
                        0,
                        classDoc.fullName.lastIndexOf(".")
                    );
                    if (parentFqcn.endsWith(`.${simpleName}`))
                        return parentFqcn;
                }
                return null;
            },
            // Strategy 3: Sibling inner class
            async () => {
                if (classDoc.fullName.includes(".")) {
                    const parentFqcn = classDoc.fullName.substring(
                        0,
                        classDoc.fullName.lastIndexOf(".")
                    );
                    const siblingFqcn = `${parentFqcn}.${simpleName}`;
                    if (
                        docIndex.packages
                            .get(classDoc.packageName)
                            ?.includes(siblingFqcn)
                    )
                        return siblingFqcn;
                }
                return null;
            },
            // Strategy 4: Direct inner class of current
            async () => {
                const innerFqcn = `${classDoc.fullName}.${simpleName}`;
                if (
                    docIndex.packages
                        .get(classDoc.packageName)
                        ?.includes(innerFqcn)
                )
                    return innerFqcn;
                return null;
            },
            // Strategy 5: Same package
            async () => {
                const fqcnInPackage = `${classDoc.packageName}.${simpleName}`;
                if (
                    docIndex.packages
                        .get(classDoc.packageName)
                        ?.includes(fqcnInPackage)
                )
                    return fqcnInPackage;
                return null;
            },
            // Strategy 6: java.lang
            async () => {
                const fqcn = `java.lang.${simpleName}`;
                if (docIndex.packages.get("java.lang")?.includes(fqcn))
                    return fqcn;
                return null;
            },
        ];

        for (const [index, strategy] of strategies.entries()) {
            const result = await strategy();
            if (result) {
                console.log(`Strategy ${index + 1} found: ${result}`);
                navigate(`/class/${encodeURIComponent(result)}`);
                return;
            }
        }

        message.error(`Could not resolve class: ${simpleName}`);
    };

    if (!docIndex || !className) {
        return (
            <Alert
                type="warning"
                message="Unable to load class documentation"
                description="Please check the class name or wait for documentation to load"
            />
        );
    }

    if (loading && !classDoc) {
        return (
            <Card className="loading-card">
                <div className="loading-content">
                    <div className="loading-icon">📖</div>
                    <Title level={4}>Loading class information...</Title>
                </div>
            </Card>
        );
    }

    if (!classDoc) {
        return (
            <Alert
                type="error"
                message="Class not found"
                description={`Class not found: ${className}`}
                action={
                    <Link to="/">
                        <Button>Return to Home</Button>
                    </Link>
                }
            />
        );
    }

    // --- Breadcrumb and Outer Class Logic ---
    const breadcrumbItems = [
        {
            title: (
                <Link to="/">
                    <HomeOutlined /> Home
                </Link>
            ),
        },
    ];
    let outerClassFullName: string | null = null;

    if (classDoc.packageName) {
        breadcrumbItems.push({
            title: (
                <Link
                    to={`/package/${encodeURIComponent(classDoc.packageName)}`}
                >
                    <FolderOutlined /> {classDoc.packageName}
                </Link>
            ),
        });

        const hierarchyPart = classDoc.fullName.substring(
            classDoc.packageName.length + 1
        );
        const classHierarchy = hierarchyPart.split(".");

        if (classHierarchy.length > 1) {
            outerClassFullName = classDoc.fullName.substring(
                0,
                classDoc.fullName.lastIndexOf(".")
            );

            // Add parent classes to breadcrumb
            let currentPath = classDoc.packageName;
            for (let i = 0; i < classHierarchy.length - 1; i++) {
                const part = classHierarchy[i];
                currentPath += `.${part}`;
                breadcrumbItems.push({
                    title: (
                        <Link to={`/class/${encodeURIComponent(currentPath)}`}>
                            <ApiOutlined /> {part}
                        </Link>
                    ),
                });
            }
        }
    }

    // Add current class (not a link)
    breadcrumbItems.push({
        title: (
            <Space>
                <ApiOutlined />
                <Text strong>{classDoc.className}</Text>
            </Space>
        ),
    });

    const tabItems = [
        {
            key: "overview",
            label: (
                <span className="tab-label">
                    <BookOutlined />
                    Overview
                </span>
            ),
            children: (
                <div className="overview-content">
                    {/* 类头部信息 */}
                    <Card className="class-header-card">
                        <div className="class-header">
                            <div className="class-title-section">
                                <div className="class-type-badge">
                                    <Tag
                                        color="blue"
                                        className="class-type-tag"
                                    >
                                        {classDoc.classType || "class"}
                                    </Tag>
                                </div>
                                <div className="class-name-section">
                                    <Title
                                        level={2}
                                        className="class-title"
                                        title={classDoc.fullName}
                                    >
                                        {classDoc.className}
                                    </Title>
                                    <Text
                                        className="full-name"
                                        title={classDoc.fullName}
                                    >
                                        {classDoc.fullName}
                                    </Text>
                                </div>
                            </div>
                            <div className="class-actions">
                                <Space>
                                    <Tooltip title="Copy full class name">
                                        <Button
                                            icon={<CopyOutlined />}
                                            onClick={() =>
                                                copyToClipboard(
                                                    classDoc.fullName,
                                                    "class name"
                                                )
                                            }
                                            className="action-button"
                                        />
                                    </Tooltip>
                                    <Tooltip title="Copy KubeJS LoadClass">
                                        <Button
                                            icon={<PlayCircleOutlined />}
                                            onClick={() => {
                                                const kubeJSCode = `const $${
                                                    classDoc.className
                                                } = Java.loadClass("${getKubeJSName(
                                                    classDoc
                                                )}");`;
                                                copyToClipboard(
                                                    kubeJSCode,
                                                    "KubeJS LoadClass code"
                                                );
                                            }}
                                            className="action-button kubejs-button"
                                            style={{
                                                background: "#fa8c16",
                                                borderColor: "#fa8c16",
                                                color: "white",
                                            }}
                                        >
                                            KubeJS
                                        </Button>
                                    </Tooltip>
                                    <Tooltip title="Jump to source">
                                        <Button
                                            icon={<CodeOutlined />}
                                            onClick={() =>
                                                setActiveTab("source")
                                            }
                                            className="action-button"
                                        />
                                    </Tooltip>
                                </Space>
                            </div>
                        </div>

                        {/* 类描述 */}
                        {classDoc.classComment && (
                            <div className="class-description">
                                <Paragraph className="class-comment">
                                    {classDoc.classComment}
                                </Paragraph>
                            </div>
                        )}

                        {/* Outer Class Link */}
                        {outerClassFullName && (
                            <Card size="small" className="outer-class-card">
                                <Link
                                    to={`/class/${encodeURIComponent(
                                        outerClassFullName
                                    )}`}
                                >
                                    <Space>
                                        <RollbackOutlined />
                                        <Text>
                                            Return to Outer Class:{" "}
                                            <Text strong>
                                                {outerClassFullName
                                                    .split(".")
                                                    .pop()}
                                            </Text>
                                        </Text>
                                    </Space>
                                </Link>
                            </Card>
                        )}

                        {/* Inner Classes */}
                        {classDoc.innerClasses &&
                            classDoc.innerClasses.length > 0 && (
                                <Card
                                    className="inner-classes-card"
                                    title={
                                        <Space>
                                            <BranchesOutlined />
                                            Inner Classes (
                                            {classDoc.innerClasses.length})
                                        </Space>
                                    }
                                >
                                    <List
                                        itemLayout="horizontal"
                                        dataSource={classDoc.innerClasses}
                                        renderItem={(
                                            innerClass: JavaClassDoc
                                        ) => (
                                            <List.Item
                                                actions={[
                                                    <Button
                                                        type="dashed"
                                                        icon={<CodeOutlined />}
                                                        onClick={() => {
                                                            setActiveTab(
                                                                "source"
                                                            );
                                                            setHighlightedLines(
                                                                innerClass.lineRange
                                                                    ? [
                                                                          innerClass
                                                                              .lineRange
                                                                              .start,
                                                                      ]
                                                                    : []
                                                            );
                                                        }}
                                                    >
                                                        View Source
                                                    </Button>,
                                                ]}
                                            >
                                                <List.Item.Meta
                                                    avatar={
                                                        <Avatar
                                                            icon={
                                                                <ApiOutlined />
                                                            }
                                                        />
                                                    }
                                                    title={
                                                        <Link
                                                            to={`/class/${encodeURIComponent(
                                                                innerClass.fullName
                                                            )}`}
                                                        >
                                                            {
                                                                innerClass.className
                                                            }
                                                        </Link>
                                                    }
                                                    description={
                                                        <Space>
                                                            <Tag color="blue">
                                                                {
                                                                    innerClass.classType
                                                                }
                                                            </Tag>
                                                            {renderModifiers(
                                                                innerClass.modifiers
                                                            )}
                                                        </Space>
                                                    }
                                                />
                                            </List.Item>
                                        )}
                                    />
                                </Card>
                            )}

                        {/* 类信息网格 */}
                        <div className="class-info-grid">
                            <div className="info-item">
                                <Text strong>Modifiers:</Text>
                                <div className="info-value">
                                    <Space wrap>
                                        {renderModifiers(classDoc.modifiers)}
                                    </Space>
                                </div>
                            </div>
                            {outerClassFullName && (
                                <div className="info-item">
                                    <Text strong>Outer Class:</Text>
                                    <div className="info-value">
                                        <Link
                                            to={`/class/${encodeURIComponent(
                                                outerClassFullName
                                            )}`}
                                        >
                                            <Text code className="type-link">
                                                {outerClassFullName
                                                    .split(".")
                                                    .pop()}
                                            </Text>
                                        </Link>
                                    </div>
                                </div>
                            )}
                            {classDoc.superClass &&
                                classDoc.superClass !== "Object" && (
                                    <div className="info-item">
                                        <Text strong>Extends:</Text>
                                        <div className="info-value">
                                            {createTypeLink(
                                                classDoc.superClass
                                            )}
                                        </div>
                                    </div>
                                )}

                            {classDoc.interfaces.length > 0 && (
                                <div className="info-item">
                                    <Text strong>Implements:</Text>
                                    <div className="info-value">
                                        <Space wrap>
                                            {classDoc.interfaces.map(
                                                (intf, index) => (
                                                    <span key={index}>
                                                        {createTypeLink(intf)}
                                                        {index <
                                                            classDoc.interfaces
                                                                .length -
                                                                1 && ", "}
                                                    </span>
                                                )
                                            )}
                                        </Space>
                                    </div>
                                </div>
                            )}

                            <div className="info-item">
                                <Text strong>Statistics:</Text>
                                <div className="info-value">
                                    <Space>
                                        <Badge
                                            count={classDoc.fields.length}
                                            color="#fa8c16"
                                            title="Fields"
                                        />
                                        <Text>Fields</Text>
                                        <Badge
                                            count={classDoc.methods.length}
                                            color="#52c41a"
                                            title="Methods"
                                        />
                                        <Text>Methods</Text>
                                    </Space>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* 成员搜索和过滤工具栏 */}
                    <Card className="search-filter-card">
                        <div className="search-filter-toolbar">
                            <div className="search-section">
                                <Input
                                    placeholder="搜索字段和方法..."
                                    value={searchText}
                                    onChange={(e) =>
                                        setSearchText(e.target.value)
                                    }
                                    prefix={<SearchOutlined />}
                                    allowClear
                                    style={{ width: 300 }}
                                />
                            </div>
                            <div className="filter-section">
                                <Space>
                                    <Text>过滤:</Text>
                                    <Button
                                        type={
                                            memberFilter === "all"
                                                ? "primary"
                                                : "default"
                                        }
                                        size="small"
                                        onClick={() => setMemberFilter("all")}
                                    >
                                        全部
                                    </Button>
                                    <Button
                                        type={
                                            memberFilter === "fields"
                                                ? "primary"
                                                : "default"
                                        }
                                        size="small"
                                        onClick={() =>
                                            setMemberFilter("fields")
                                        }
                                    >
                                        字段
                                    </Button>
                                    <Button
                                        type={
                                            memberFilter === "methods"
                                                ? "primary"
                                                : "default"
                                        }
                                        size="small"
                                        onClick={() =>
                                            setMemberFilter("methods")
                                        }
                                    >
                                        方法
                                    </Button>
                                    <Button
                                        type={
                                            memberFilter === "public"
                                                ? "primary"
                                                : "default"
                                        }
                                        size="small"
                                        onClick={() =>
                                            setMemberFilter("public")
                                        }
                                    >
                                        Public
                                    </Button>
                                    <Button
                                        type={
                                            memberFilter === "private"
                                                ? "primary"
                                                : "default"
                                        }
                                        size="small"
                                        onClick={() =>
                                            setMemberFilter("private")
                                        }
                                    >
                                        Private
                                    </Button>
                                </Space>
                            </div>
                        </div>
                    </Card>

                    {(() => {
                        const { fields, methods } = getFilteredMembers();

                        return (
                            <>
                                {/* 字段概览 */}
                                {fields.length > 0 && (
                                    <Card
                                        title={
                                            <Space>
                                                <FieldTimeOutlined />
                                                Fields ({fields.length})
                                                {searchText && (
                                                    <Tag color="orange">
                                                        筛选结果
                                                    </Tag>
                                                )}
                                            </Space>
                                        }
                                        className="overview-section"
                                    >
                                        <div className="enhanced-members-grid">
                                            {fields.map((field, index) => (
                                                <div
                                                    key={index}
                                                    className="enhanced-member-item clickable"
                                                    onClick={() =>
                                                        jumpToSourceLine(
                                                            field.lineRange
                                                                .start
                                                        )
                                                    }
                                                >
                                                    <div className="member-header">
                                                        <div className="member-signature">
                                                            <Space wrap>
                                                                {renderModifiers(
                                                                    field.modifiers
                                                                )}
                                                                {createTypeLink(
                                                                    field.type
                                                                )}
                                                                <Text
                                                                    strong
                                                                    className="member-name"
                                                                    title={
                                                                        field.name
                                                                    }
                                                                >
                                                                    {field.name}
                                                                </Text>
                                                            </Space>
                                                        </div>
                                                        <div className="member-actions">
                                                            <Tooltip title="复制字段声明">
                                                                <Button
                                                                    icon={
                                                                        <CopyOutlined />
                                                                    }
                                                                    size="small"
                                                                    onClick={(
                                                                        e
                                                                    ) => {
                                                                        e.stopPropagation();
                                                                        copyFieldDeclaration(
                                                                            field
                                                                        );
                                                                    }}
                                                                />
                                                            </Tooltip>
                                                            <Tooltip title="跳转到源码">
                                                                <Button
                                                                    icon={
                                                                        <CodeOutlined />
                                                                    }
                                                                    size="small"
                                                                    onClick={(
                                                                        e
                                                                    ) => {
                                                                        e.stopPropagation();
                                                                        jumpToSourceLine(
                                                                            field
                                                                                .lineRange
                                                                                .start
                                                                        );
                                                                    }}
                                                                />
                                                            </Tooltip>
                                                        </div>
                                                    </div>
                                                    {field.comment && (
                                                        <div className="member-comment">
                                                            <Text className="comment-text">
                                                                {field.comment}
                                                            </Text>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                )}

                                {/* 方法概览 */}
                                {methods.length > 0 && (
                                    <Card
                                        title={
                                            <Space>
                                                <PlayCircleOutlined />
                                                Methods ({methods.length})
                                                {searchText && (
                                                    <Tag color="orange">
                                                        筛选结果
                                                    </Tag>
                                                )}
                                            </Space>
                                        }
                                        className="overview-section"
                                    >
                                        <div className="enhanced-members-grid">
                                            {methods.map((method, index) => (
                                                <div
                                                    key={index}
                                                    id={`method-${method.name}`}
                                                    className={`enhanced-member-item clickable ${
                                                        highlightedMethod ===
                                                        method.name
                                                            ? "highlighted-method"
                                                            : ""
                                                    }`}
                                                    onClick={() =>
                                                        jumpToSourceLine(
                                                            method.lineRange
                                                                .start
                                                        )
                                                    }
                                                >
                                                    <div className="member-header">
                                                        <div className="member-signature">
                                                            <Space wrap>
                                                                {renderModifiers(
                                                                    method.modifiers
                                                                )}
                                                                {createTypeLink(
                                                                    method.returnType ||
                                                                        "void"
                                                                )}
                                                                <Text
                                                                    strong
                                                                    className="member-name"
                                                                    title={
                                                                        method.name
                                                                    }
                                                                >
                                                                    {
                                                                        method.name
                                                                    }
                                                                </Text>
                                                                <Text className="method-params">
                                                                    (
                                                                    {method
                                                                        .parameters
                                                                        .length >
                                                                    0
                                                                        ? method.parameters
                                                                              .map(
                                                                                  (
                                                                                      param,
                                                                                      i
                                                                                  ) =>
                                                                                      `${param.type} ${param.name}`
                                                                              )
                                                                              .join(
                                                                                  ", "
                                                                              )
                                                                        : ""}
                                                                    )
                                                                </Text>
                                                            </Space>
                                                        </div>
                                                        <div className="member-actions">
                                                            <Tooltip title="复制方法签名">
                                                                <Button
                                                                    icon={
                                                                        <CopyOutlined />
                                                                    }
                                                                    size="small"
                                                                    onClick={(
                                                                        e
                                                                    ) => {
                                                                        e.stopPropagation();
                                                                        copyMethodSignature(
                                                                            method
                                                                        );
                                                                    }}
                                                                />
                                                            </Tooltip>
                                                            <Tooltip title="跳转到源码">
                                                                <Button
                                                                    icon={
                                                                        <CodeOutlined />
                                                                    }
                                                                    size="small"
                                                                    onClick={(
                                                                        e
                                                                    ) => {
                                                                        e.stopPropagation();
                                                                        jumpToSourceLine(
                                                                            method
                                                                                .lineRange
                                                                                .start
                                                                        );
                                                                    }}
                                                                />
                                                            </Tooltip>
                                                        </div>
                                                    </div>
                                                    {method.comment && (
                                                        <div className="member-comment">
                                                            <Text className="comment-text">
                                                                {method.comment}
                                                            </Text>
                                                        </div>
                                                    )}
                                                    {method.parameters.length >
                                                        0 && (
                                                        <div className="method-parameters">
                                                            <Text
                                                                strong
                                                                style={{
                                                                    fontSize:
                                                                        "12px",
                                                                    color: "#666",
                                                                }}
                                                            >
                                                                参数:
                                                            </Text>
                                                            <div
                                                                style={{
                                                                    marginTop:
                                                                        "4px",
                                                                }}
                                                            >
                                                                {method.parameters.map(
                                                                    (
                                                                        param,
                                                                        i
                                                                    ) => (
                                                                        <div
                                                                            key={
                                                                                i
                                                                            }
                                                                            style={{
                                                                                marginLeft:
                                                                                    "12px",
                                                                                fontSize:
                                                                                    "12px",
                                                                            }}
                                                                        >
                                                                            <Text
                                                                                code
                                                                            >
                                                                                {
                                                                                    param.name
                                                                                }
                                                                            </Text>
                                                                            <Text type="secondary">
                                                                                {" "}
                                                                                :{" "}
                                                                            </Text>
                                                                            {createTypeLink(
                                                                                param.type
                                                                            )}
                                                                        </div>
                                                                    )
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                )}

                                {/* 无结果提示 */}
                                {fields.length === 0 &&
                                    methods.length === 0 && (
                                        <Card className="no-results-card">
                                            <div className="no-results">
                                                <SearchOutlined
                                                    style={{
                                                        fontSize: "48px",
                                                        color: "#d9d9d9",
                                                    }}
                                                />
                                                <Title
                                                    level={4}
                                                    style={{
                                                        color: "#999",
                                                        marginTop: "16px",
                                                    }}
                                                >
                                                    {searchText
                                                        ? `没有找到匹配 "${searchText}" 的成员`
                                                        : "没有符合条件的成员"}
                                                </Title>
                                                <Paragraph
                                                    style={{ color: "#666" }}
                                                >
                                                    请尝试调整搜索条件或过滤器
                                                </Paragraph>
                                            </div>
                                        </Card>
                                    )}
                            </>
                        );
                    })()}
                </div>
            ),
        },
        {
            key: "source",
            label: (
                <span className="tab-label">
                    <CodeOutlined />
                    源码
                </span>
            ),
            children: (
                <div style={{ height: "calc(100vh - 120px)" }}>
                    <CodeViewer
                        sourceCode={sourceCode}
                        className={classDoc.fullName}
                        loading={loading}
                        highlightedLines={highlightedLines}
                        classDoc={classDoc}
                        onSmartJump={handleSmartJump}
                    />
                </div>
            ),
        },
        {
            key: "hierarchy",
            label: (
                <span className="tab-label">
                    <BranchesOutlined />
                    继承关系
                </span>
            ),
            children: (
                <div className="hierarchy-content">
                    {parentClass && (
                        <Card title="父类" style={{ marginBottom: "16px" }}>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                }}
                            >
                                <ApiOutlined
                                    style={{
                                        fontSize: "20px",
                                        color: "#1890ff",
                                    }}
                                />
                                <div>
                                    <Link
                                        to={`/class/${encodeURIComponent(
                                            parentClass.fullName
                                        )}`}
                                    >
                                        <Text strong>
                                            {parentClass.className}
                                        </Text>
                                    </Link>
                                    <div>
                                        <Text type="secondary">
                                            {parentClass.packageName}
                                        </Text>
                                    </div>
                                    {parentClass.classComment && (
                                        <div style={{ marginTop: "8px" }}>
                                            <Text>
                                                {parentClass.classComment.substring(
                                                    0,
                                                    100
                                                )}
                                                ...
                                            </Text>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    )}

                    {childClasses.length > 0 && (
                        <Card title={`子类 (${childClasses.length})`}>
                            <div style={{ display: "grid", gap: "12px" }}>
                                {childClasses.map((childClass) => (
                                    <div
                                        key={childClass.fullName}
                                        style={{
                                            padding: "12px",
                                            border: "1px solid #e8e8e8",
                                            borderRadius: "6px",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "12px",
                                        }}
                                    >
                                        <ApiOutlined
                                            style={{
                                                fontSize: "16px",
                                                color: "#52c41a",
                                            }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <Link
                                                to={`/class/${encodeURIComponent(
                                                    childClass.fullName
                                                )}`}
                                            >
                                                <Text strong>
                                                    {childClass.className}
                                                </Text>
                                            </Link>
                                            <div>
                                                <Text type="secondary">
                                                    {childClass.packageName}
                                                </Text>
                                            </div>
                                            {childClass.classComment && (
                                                <div
                                                    style={{ marginTop: "4px" }}
                                                >
                                                    <Text
                                                        style={{
                                                            fontSize: "12px",
                                                        }}
                                                    >
                                                        {childClass.classComment.substring(
                                                            0,
                                                            80
                                                        )}
                                                        ...
                                                    </Text>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {!parentClass && childClasses.length === 0 && (
                        <Alert
                            type="info"
                            message="无继承关系"
                            description="此类没有父类或子类关系"
                        />
                    )}
                </div>
            ),
        },
        {
            key: "references",
            label: (
                <span className="tab-label">
                    <LinkOutlined />
                    引用关系
                </span>
            ),
            children: (
                <div className="references-content">
                    {references.usedBy.length > 0 && (
                        <Card
                            title={`被引用 (${references.usedBy.length})`}
                            style={{ marginBottom: "16px" }}
                        >
                            <Table
                                dataSource={references.usedBy}
                                pagination={{ pageSize: 10 }}
                                size="small"
                                columns={[
                                    {
                                        title: "类型",
                                        dataIndex: "type",
                                        width: 100,
                                        render: (type: string) => (
                                            <Tag
                                                color={
                                                    type === "field"
                                                        ? "blue"
                                                        : type ===
                                                          "method-parameter"
                                                        ? "green"
                                                        : "orange"
                                                }
                                            >
                                                {type}
                                            </Tag>
                                        ),
                                    },
                                    {
                                        title: "来源类",
                                        dataIndex: "source",
                                        render: (source: string) => (
                                            <Link
                                                to={`/class/${encodeURIComponent(
                                                    source
                                                )}`}
                                            >
                                                <Text>
                                                    {source.split(".").pop()}
                                                </Text>
                                                <div
                                                    style={{
                                                        fontSize: "11px",
                                                        color: "#666",
                                                    }}
                                                >
                                                    {source.substring(
                                                        0,
                                                        source.lastIndexOf(".")
                                                    )}
                                                </div>
                                            </Link>
                                        ),
                                    },
                                    {
                                        title: "位置",
                                        dataIndex: "location",
                                    },
                                    {
                                        title: "行号",
                                        dataIndex: "line",
                                        width: 80,
                                    },
                                ]}
                            />
                        </Card>
                    )}

                    {references.uses.length > 0 && (
                        <Card title={`引用其他类 (${references.uses.length})`}>
                            <Table
                                dataSource={references.uses}
                                pagination={{ pageSize: 10 }}
                                size="small"
                                columns={[
                                    {
                                        title: "类型",
                                        dataIndex: "type",
                                        width: 100,
                                        render: (type: string) => (
                                            <Tag
                                                color={
                                                    type === "field"
                                                        ? "blue"
                                                        : type ===
                                                          "method-parameter"
                                                        ? "green"
                                                        : "orange"
                                                }
                                            >
                                                {type}
                                            </Tag>
                                        ),
                                    },
                                    {
                                        title: "目标类",
                                        dataIndex: "target",
                                        render: (target: string) => (
                                            <Link
                                                to={`/class/${encodeURIComponent(
                                                    target
                                                )}`}
                                            >
                                                <Text>
                                                    {target.split(".").pop()}
                                                </Text>
                                                <div
                                                    style={{
                                                        fontSize: "11px",
                                                        color: "#666",
                                                    }}
                                                >
                                                    {target.substring(
                                                        0,
                                                        target.lastIndexOf(".")
                                                    )}
                                                </div>
                                            </Link>
                                        ),
                                    },
                                    {
                                        title: "位置",
                                        dataIndex: "location",
                                    },
                                    {
                                        title: "行号",
                                        dataIndex: "line",
                                        width: 80,
                                    },
                                ]}
                            />
                        </Card>
                    )}

                    {references.usedBy.length === 0 &&
                        references.uses.length === 0 && (
                            <Alert
                                type="info"
                                message="无引用关系"
                                description="此类没有引用关系数据"
                            />
                        )}
                </div>
            ),
        },
    ];

    return (
        <div className="modern-class-page">
            {/* 面包屑导航 */}
            <Breadcrumb items={breadcrumbItems} className="class-breadcrumb" />

            {/* 主内容 */}
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                className="class-tabs"
                items={tabItems}
            />

            {/* 现代化样式 */}
            <style
                dangerouslySetInnerHTML={{
                    __html: `
                .modern-class-page {
                    max-width: 95%;
                    width: 100%;
                    margin: 0 auto;
                    padding: 0 24px;
                    min-height: 100vh;
                }

                .class-breadcrumb {
                    margin-bottom: 16px;
                    padding: 12px 0;
                    border-bottom: 1px solid #f0f0f0;
                }

                .current-class-name {
                    font-size: 14px;
                    max-width: 300px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    display: inline-block;
                    vertical-align: bottom;
                }

                .class-tabs {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
                }

                .tab-label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-weight: 500;
                }

                .loading-card {
                    margin: 20px 0;
                    border-radius: 12px;
                }

                .loading-content {
                    text-align: center;
                    padding: 40px 20px;
                }

                .loading-icon {
                    font-size: 48px;
                    margin-bottom: 16px;
                }

                .overview-content {
                    padding: 24px;
                }

                .class-header-card {
                    margin-bottom: 24px;
                    border-radius: 12px;
                    border: 2px solid #f0f8ff;
                    background: linear-gradient(135deg, #f0f8ff 0%, #ffffff 100%);
                }

                .class-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 16px;
                }

                .class-title-section {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    flex: 1;
                    min-width: 0;
                }

                .class-type-badge {
                    flex-shrink: 0;
                    margin-top: 4px;
                }

                .class-type-tag {
                    font-weight: bold;
                    border-radius: 6px;
                }

                .class-name-section {
                    flex: 1;
                    min-width: 0;
                }

                .class-title {
                    margin: 0 !important;
                    font-size: 28px;
                    font-weight: 700;
                    color: #1677ff;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    line-height: 1.2;
                }

                .full-name {
                    font-size: 14px;
                    color: #8c8c8c;
                    font-family: 'JetBrains Mono', Monaco, 'Courier New', monospace;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    display: block;
                    margin-top: 4px;
                }

                .class-actions {
                    flex-shrink: 0;
                }

                .action-button {
                    border-radius: 6px;
                    transition: all 0.3s;
                }

                .action-button:hover {
                    background-color: #e6f7ff;
                    border-color: #1677ff;
                    color: #1677ff;
                }

                .class-description {
                    margin: 16px 0;
                    padding: 16px;
                    background: rgba(22, 119, 255, 0.05);
                    border-radius: 8px;
                    border-left: 4px solid #1677ff;
                }

                .class-comment {
                    margin: 0;
                    white-space: pre-wrap;
                    line-height: 1.6;
                }

                .class-info-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 16px;
                    margin-top: 16px;
                }

                .info-item {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    padding: 12px;
                    background: #fafafa;
                    border-radius: 8px;
                    border: 1px solid #f0f0f0;
                }

                .info-value {
                    flex: 1;
                    min-width: 0;
                }

                .overview-section {
                    margin-bottom: 24px;
                    border-radius: 12px;
                    border: 1px solid #f0f0f0;
                }

                .members-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                    gap: 12px;
                }

                .member-item {
                    padding: 16px;
                    border: 1px solid #f0f0f0;
                    border-radius: 8px;
                    background: #fafafa;
                    transition: all 0.3s;
                }

                .member-item.clickable {
                    cursor: pointer;
                }

                .member-item.clickable:hover {
                    border-color: #1677ff;
                    background: #f0f8ff;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(22, 119, 255, 0.1);
                }

                .member-signature {
                    margin-bottom: 8px;
                }

                .member-name {
                    font-family: 'JetBrains Mono', Monaco, 'Courier New', monospace;
                    font-size: 14px;
                    max-width: 200px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    display: inline-block;
                    vertical-align: bottom;
                }

                .method-params {
                    font-size: 12px;
                    color: #8c8c8c;
                }

                .member-comment {
                    font-size: 12px;
                    color: #666;
                    line-height: 1.4;
                    display: block;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .modern-modifier-tag {
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 500;
                }

                .type-link {
                    color: #1677ff !important;
                    font-weight: 500;
                    transition: all 0.3s;
                }

                .type-link:hover {
                    background-color: #e6f7ff;
                    border-radius: 4px;
                    padding: 2px 4px;
                    margin: -2px -4px;
                }

                .search-filter-card {
                    margin-bottom: 24px;
                    border-radius: 12px;
                    border: 1px solid #f0f0f0;
                }

                .search-filter-toolbar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px;
                }

                .search-section {
                    flex: 1;
                }

                .filter-section {
                    flex-shrink: 0;
                }

                .no-results-card {
                    margin: 20px 0;
                    border-radius: 12px;
                    text-align: center;
                }

                .no-results {
                    padding: 40px 20px;
                }

                .enhanced-members-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                    gap: 12px;
                }

                .enhanced-member-item {
                    padding: 16px;
                    border: 1px solid #f0f0f0;
                    border-radius: 8px;
                    background: #fafafa;
                    transition: all 0.3s;
                }

                .enhanced-member-item.clickable {
                    cursor: pointer;
                }

                .enhanced-member-item.clickable:hover {
                    border-color: #1677ff;
                    background: #f0f8ff;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(22, 119, 255, 0.1);
                }

                .member-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .member-actions {
                    flex-shrink: 0;
                }

                .comment-text {
                    font-size: 12px;
                    color: #666;
                    line-height: 1.4;
                    display: block;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .method-parameters {
                    margin-top: 8px;
                }

                .highlighted-method {
                    border-color: #1677ff !important;
                    background: #f0f8ff !important;
                    box-shadow: 0 4px 12px rgba(22, 119, 255, 0.2) !important;
                }

                .hierarchy-content {
                    padding: 24px;
                }

                .references-content {
                    padding: 24px;
                }

                .outer-class-card {
                    margin-top: 16px;
                    margin-bottom: 16px;
                    background-color: #f6f8fa;
                    border-radius: 8px;
                }

                .inner-classes-card {
                    margin-top: 16px;
                    margin-bottom: 24px;
                    border-radius: 12px;
                    border: 1px solid #f0f0f0;
                }

                @media (max-width: 768px) {
                    .overview-content {
                        padding: 16px;
                    }
                    
                    .class-header {
                        flex-direction: column;
                        gap: 16px;
                    }
                    
                    .class-title {
                        font-size: 24px;
                    }
                    
                    .members-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .class-info-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `,
                }}
            />
        </div>
    );
};
