import React, { useState, useEffect } from "react";
import { Tree, Input, Card, Typography, Badge, Space, Tooltip } from "antd";
import {
    SearchOutlined,
    FolderOutlined,
    FileTextOutlined,
    ApiOutlined,
} from "@ant-design/icons";
import { ProjectDocIndex, JavaClassDoc } from "../types";

const { Search } = Input;
const { Text, Title } = Typography;
const { TreeNode } = Tree;

interface JavaDocNavigationProps {
    docIndex: ProjectDocIndex | null;
    onClassSelect: (classDoc: JavaClassDoc) => void;
    selectedClass?: JavaClassDoc | null;
}

interface PackageTreeNode {
    key: string;
    title: React.ReactNode;
    children?: PackageTreeNode[];
    isLeaf?: boolean;
    classDoc?: JavaClassDoc;
    packageName?: string;
    type: "package" | "class";
    classCount?: number;
}

/**
 * JavaDoc 风格的导航组件
 * 提供包/类的层次结构导航，类似传统的 JavaDoc
 */
export const JavaDocNavigation: React.FC<JavaDocNavigationProps> = ({
    docIndex,
    onClassSelect,
    selectedClass,
}) => {
    const [treeData, setTreeData] = useState<PackageTreeNode[]>([]);
    const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
    const [searchValue, setSearchValue] = useState("");
    const [autoExpandParent, setAutoExpandParent] = useState(true);

    useEffect(() => {
        if (docIndex) {
            buildPackageTree();
        }
    }, [docIndex]);

    /**
     * 构建包树结构
     */
    const buildPackageTree = () => {
        if (!docIndex) return;

        const packageNodes = new Map<string, PackageTreeNode>();
        const rootNodes: PackageTreeNode[] = [];

        // 首先创建所有包节点
        for (const [packageName, classes] of docIndex.packages.entries()) {
            if (!packageName) continue;

            const parts = packageName.split(".");
            let currentPath = "";

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const parentPath = currentPath;
                currentPath = currentPath ? `${currentPath}.${part}` : part;

                if (!packageNodes.has(currentPath)) {
                    const isLeaf = i === parts.length - 1;
                    const classCount = isLeaf ? classes.length : 0;

                    const node: PackageTreeNode = {
                        key: `package_${currentPath}`,
                        title: (
                            <Space>
                                <FolderOutlined style={{ color: "#1890ff" }} />
                                <Text>{part}</Text>
                                {isLeaf && (
                                    <Badge
                                        count={classCount}
                                        size="small"
                                        style={{ backgroundColor: "#52c41a" }}
                                    />
                                )}
                            </Space>
                        ),
                        children: [],
                        type: "package",
                        packageName: currentPath,
                        classCount: isLeaf ? classCount : undefined,
                    };

                    packageNodes.set(currentPath, node);

                    // 添加到父节点或根节点
                    if (parentPath) {
                        const parent = packageNodes.get(parentPath);
                        if (parent && parent.children) {
                            parent.children.push(node);
                        }
                    } else {
                        rootNodes.push(node);
                    }
                }
            }
        }

        // 为每个包添加类节点（包括内部类）
        for (const [packageName, classes] of docIndex.packages.entries()) {
            const packageNode = packageNodes.get(packageName);
            if (packageNode && packageNode.children) {
                for (let i = 0; i < classes.length; i++) {
                    const className = classes[i];
                    const classDoc = docIndex.classes.get(className);
                    if (classDoc) {
                        // 只添加顶级类（不包含 $ 或 . 表示内部类的类名）
                        if (!classDoc.fullName.includes('.', packageName.length + 1)) {
                            const classNode = createClassNode(classDoc, packageName, i);
                            packageNode.children.push(classNode);
                        }
                    }
                }

                // 对类进行排序
                packageNode.children.sort((a, b) => {
                    if (a.type === "package" && b.type === "class") return -1;
                    if (a.type === "class" && b.type === "package") return 1;
                    return (
                        a.classDoc?.className ||
                        a.packageName ||
                        ""
                    ).localeCompare(
                        b.classDoc?.className || b.packageName || ""
                    );
                });
            }
        }

        // 对根节点进行排序
        rootNodes.sort((a, b) =>
            (a.packageName || "").localeCompare(b.packageName || "")
        );

        setTreeData(rootNodes);
    };

    /**
     * 创建类节点（包括其内部类）
     */
    const createClassNode = (classDoc: JavaClassDoc, packageName: string, index: number): PackageTreeNode => {
        const hasInnerClasses = classDoc.innerClasses && classDoc.innerClasses.length > 0;
        
        const classNode: PackageTreeNode = {
            key: `class_${packageName}_${classDoc.fullName}_${index}`,
            title: (
                <Space>
                    <ApiOutlined style={{ 
                        color: classDoc.classType === 'enum' ? '#fa8c16' : 
                               classDoc.classType === 'interface' ? '#1890ff' : '#52c41a' 
                    }} />
                    <Text>{classDoc.className}</Text>
                    {classDoc.classType && classDoc.classType !== 'class' && (
                        <Text type="secondary" style={{ fontSize: "10px" }}>
                            ({classDoc.classType})
                        </Text>
                    )}
                    <Text
                        type="secondary"
                        style={{ fontSize: "12px" }}
                    >
                        ({classDoc.methods?.length || 0}m, {classDoc.fields?.length || 0}f
                        {hasInnerClasses ? `, ${classDoc.innerClasses?.length || 0}i` : ''})
                    </Text>
                </Space>
            ),
            isLeaf: !hasInnerClasses,
            type: "class",
            classDoc,
            children: hasInnerClasses ? [] : undefined,
        };

        // 添加内部类节点
        if (hasInnerClasses && classNode.children && classDoc.innerClasses) {
            classDoc.innerClasses.forEach((innerClass, innerIndex) => {
                const innerClassNode = createInnerClassNode(innerClass, classDoc.fullName, innerIndex);
                classNode.children!.push(innerClassNode);
            });

            // 对内部类进行排序
            classNode.children.sort((a, b) => 
                (a.classDoc?.className || "").localeCompare(b.classDoc?.className || "")
            );
        }

        return classNode;
    };

    /**
     * 创建内部类节点（递归支持嵌套内部类）
     */
    const createInnerClassNode = (innerClass: JavaClassDoc, parentFullName: string, index: number): PackageTreeNode => {
        const hasInnerClasses = innerClass.innerClasses && innerClass.innerClasses.length > 0;
        
        const innerClassNode: PackageTreeNode = {
            key: `inner_class_${parentFullName}_${innerClass.fullName}_${index}`,
            title: (
                <Space>
                    <ApiOutlined style={{ 
                        color: innerClass.classType === 'enum' ? '#fa8c16' : 
                               innerClass.classType === 'interface' ? '#1890ff' : '#52c41a',
                        fontSize: '12px'
                    }} />
                    <Text style={{ fontSize: '13px' }}>{innerClass.className}</Text>
                    {innerClass.classType && innerClass.classType !== 'class' && (
                        <Text type="secondary" style={{ fontSize: "10px" }}>
                            ({innerClass.classType})
                        </Text>
                    )}
                    <Text
                        type="secondary"
                        style={{ fontSize: "11px" }}
                    >
                        ({innerClass.methods?.length || 0}m, {innerClass.fields?.length || 0}f
                        {hasInnerClasses ? `, ${innerClass.innerClasses?.length || 0}i` : ''})
                    </Text>
                </Space>
            ),
            isLeaf: !hasInnerClasses,
            type: "class",
            classDoc: innerClass,
            children: hasInnerClasses ? [] : undefined,
        };

        // 递归添加嵌套的内部类
        if (hasInnerClasses && innerClassNode.children && innerClass.innerClasses) {
            innerClass.innerClasses.forEach((nestedInnerClass, nestedIndex) => {
                const nestedInnerClassNode = createInnerClassNode(nestedInnerClass, innerClass.fullName, nestedIndex);
                innerClassNode.children!.push(nestedInnerClassNode);
            });

            // 对嵌套内部类进行排序
            innerClassNode.children.sort((a, b) => 
                (a.classDoc?.className || "").localeCompare(b.classDoc?.className || "")
            );
        }

        return innerClassNode;
    };

    /**
     * 处理树节点选择
     */
    const handleSelect = (selectedKeys: React.Key[], info: any) => {
        const key = selectedKeys[0] as string;
        if (key && key.startsWith("class_")) {
            const node = info.node as PackageTreeNode;
            if (node.classDoc) {
                onClassSelect(node.classDoc);
            }
        }
    };

    /**
     * 处理搜索
     */
    const handleSearch = (value: string) => {
        setSearchValue(value);
        if (!value) {
            setExpandedKeys([]);
            setAutoExpandParent(false);
            return;
        }

        // 查找匹配的节点
        const expandedKeys: string[] = [];
        const findMatchingNodes = (
            nodes: PackageTreeNode[],
            path: string[] = []
        ): void => {
            nodes.forEach((node) => {
                const currentPath = [...path, node.key];

                if (node.type === "class" && node.classDoc) {
                    const className = node.classDoc.className.toLowerCase();
                    const fullName = node.classDoc.fullName.toLowerCase();
                    const searchLower = value.toLowerCase();

                    if (
                        className.includes(searchLower) ||
                        fullName.includes(searchLower)
                    ) {
                        // 展开所有父节点
                        currentPath.slice(0, -1).forEach((key) => {
                            if (!expandedKeys.includes(key)) {
                                expandedKeys.push(key);
                            }
                        });
                    }
                } else if (node.type === "package") {
                    const packageName = (node.packageName || "").toLowerCase();
                    if (packageName.includes(value.toLowerCase())) {
                        expandedKeys.push(node.key);
                    }
                }

                // 递归搜索子节点（包括内部类）
                if (node.children) {
                    findMatchingNodes(node.children, currentPath);
                }
            });
        };

        findMatchingNodes(treeData);
        setExpandedKeys(expandedKeys);
        setAutoExpandParent(true);
    };

    /**
     * 渲染树标题（高亮搜索词）
     */
    const renderTreeTitle = (
        title: React.ReactNode,
        node: PackageTreeNode
    ): React.ReactNode => {
        if (!searchValue) return title;

        if (node.type === "class" && node.classDoc) {
            const className = node.classDoc.className;
            const index = className
                .toLowerCase()
                .indexOf(searchValue.toLowerCase());

            if (index > -1) {
                const beforeStr = className.substring(0, index);
                const matchStr = className.substring(
                    index,
                    index + searchValue.length
                );
                const afterStr = className.substring(
                    index + searchValue.length
                );

                return (
                    <Space>
                        <ApiOutlined style={{ color: "#fa8c16" }} />
                        <Text>
                            {beforeStr}
                            <span
                                style={{
                                    backgroundColor: "#ffeb3b",
                                    color: "#000",
                                }}
                            >
                                {matchStr}
                            </span>
                            {afterStr}
                        </Text>
                        <Text type="secondary" style={{ fontSize: "12px" }}>
                            ({node.classDoc.methods.length}m,{" "}
                            {node.classDoc.fields.length}f)
                        </Text>
                    </Space>
                );
            }
        }

        return title;
    };

    /**
     * 渲染树节点
     */
    const renderTreeNodes = (nodes: PackageTreeNode[]): React.ReactNode => {
        return nodes.map((node) => (
            <TreeNode
                key={node.key}
                title={renderTreeTitle(node.title, node)}
                isLeaf={node.isLeaf}
                style={{
                    backgroundColor:
                        selectedClass?.fullName === node.classDoc?.fullName
                            ? "#e6f4ff"
                            : "transparent",
                }}
            >
                {node.children && renderTreeNodes(node.children)}
            </TreeNode>
        ));
    };

    /**
     * 获取项目统计信息
     */
    const getProjectStats = () => {
        if (!docIndex)
            return { packages: 0, classes: 0, methods: 0, fields: 0 };

        let totalMethods = 0;
        let totalFields = 0;

        for (const classDoc of docIndex.classes.values()) {
            totalMethods += classDoc.methods.length;
            totalFields += classDoc.fields.length;
        }

        return {
            packages: docIndex.packages.size,
            classes: docIndex.classes.size,
            methods: totalMethods,
            fields: totalFields,
        };
    };

    const stats = getProjectStats();

    return (
        <div
            style={{ height: "100%", display: "flex", flexDirection: "column" }}
        >
            {/* 头部统计信息 */}
            <Card size="small" style={{ marginBottom: "8px" }}>
                <Title level={5} style={{ margin: 0, marginBottom: "8px" }}>
                    📚 项目文档
                </Title>
                <Space wrap>
                    <Tooltip title="包数量">
                        <Badge
                            count={stats.packages}
                            style={{ backgroundColor: "#1890ff" }}
                        >
                            <FolderOutlined style={{ fontSize: "16px" }} />
                        </Badge>
                    </Tooltip>
                    <Tooltip title="类数量">
                        <Badge
                            count={stats.classes}
                            style={{ backgroundColor: "#fa8c16" }}
                        >
                            <ApiOutlined style={{ fontSize: "16px" }} />
                        </Badge>
                    </Tooltip>
                    <Tooltip title="方法数量">
                        <Badge
                            count={stats.methods}
                            style={{ backgroundColor: "#52c41a" }}
                        >
                            <FileTextOutlined style={{ fontSize: "16px" }} />
                        </Badge>
                    </Tooltip>
                </Space>
            </Card>

            {/* 搜索框 */}
            <Search
                placeholder="搜索类名或包名..."
                prefix={<SearchOutlined />}
                value={searchValue}
                onChange={(e) => handleSearch(e.target.value)}
                style={{ marginBottom: "8px" }}
                allowClear
            />

            {/* 包/类树 */}
            <div style={{ flex: 1, overflow: "auto" }}>
                <Tree
                    onSelect={handleSelect}
                    expandedKeys={expandedKeys}
                    autoExpandParent={autoExpandParent}
                    onExpand={(keys) => {
                        setExpandedKeys(keys as string[]);
                        setAutoExpandParent(false);
                    }}
                    showIcon={false}
                    blockNode
                >
                    {renderTreeNodes(treeData)}
                </Tree>
            </div>
        </div>
    );
};
