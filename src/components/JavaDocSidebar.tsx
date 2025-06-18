import React, { useState, useEffect, useRef } from "react";
import { Tree, Typography, Badge, Space } from "antd";
import {
    FolderOutlined,
    ApiOutlined,
    FolderOpenOutlined,
    FileTextOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { ProjectDocIndex } from "../types";

const { Text } = Typography;

interface JavaDocSidebarProps {
    docIndex: ProjectDocIndex | null;
}

interface TreeNode {
    key: string;
    title: React.ReactNode;
    icon?: React.ReactNode;
    children?: TreeNode[];
    isLeaf?: boolean;
    className?: string;
    packageName?: string;
    type: "package" | "class";
}

/**
 * 简洁的 JavaDoc 侧边栏
 * 仅显示包/类树结构导航
 */
export const JavaDocSidebar: React.FC<JavaDocSidebarProps> = ({ docIndex }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [treeData, setTreeData] = useState<TreeNode[]>([]);
    const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const treeRef = useRef<any>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);

    // 构建树结构
    useEffect(() => {
        if (docIndex) {
            buildTreeData();
        }
    }, [docIndex]);

    // 根据当前路由设置选中项
    useEffect(() => {
        updateSelectedKeys();
    }, [location.pathname, treeData]);

    // 自动滚动到选中的项
    useEffect(() => {
        if (selectedKeys.length > 0 && sidebarRef.current) {
            // 延迟执行以确保DOM已更新
            setTimeout(() => {
                scrollToSelectedNode(selectedKeys[0]);
            }, 100);
        }
    }, [selectedKeys]);

    /**
     * 滚动到选中的节点
     */
    const scrollToSelectedNode = (selectedKey: string) => {
        if (!sidebarRef.current) return;

        // 查找选中的DOM节点
        const selectedNode = sidebarRef.current.querySelector(
            `[data-node-key="${selectedKey}"]`
        ) as HTMLElement;

        if (selectedNode) {
            const container = sidebarRef.current.querySelector('.sidebar-tree') as HTMLElement;
            if (container) {
                // 计算节点相对于容器的位置
                const containerRect = container.getBoundingClientRect();
                const nodeRect = selectedNode.getBoundingClientRect();
                
                // 计算滚动位置，使节点在容器中央
                const nodeTop = nodeRect.top - containerRect.top + container.scrollTop;
                const containerHeight = container.clientHeight;
                const nodeHeight = selectedNode.clientHeight;
                
                const scrollTop = nodeTop - containerHeight / 2 + nodeHeight / 2;
                
                // 平滑滚动到目标位置
                container.scrollTo({
                    top: Math.max(0, scrollTop),
                    behavior: 'smooth'
                });
            }
        }
    };

    /**
     * 构建包和类树结构
     */
    const buildTreeData = () => {
        if (!docIndex) return;

        const packageMap = new Map<string, TreeNode>();
        const rootNodes: TreeNode[] = [];
        const keySet = new Set<string>(); // 用于检查重复key

        // 首先创建所有包节点
        for (const [packageName, classes] of docIndex.packages.entries()) {
            if (!packageName) continue;

            const parts = packageName.split(".");
            let currentPath = "";

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const parentPath = currentPath;
                currentPath = currentPath ? `${currentPath}.${part}` : part;
                const packageKey = `pkg_${currentPath}`;

                if (!packageMap.has(currentPath)) {
                    const isLeaf = i === parts.length - 1;
                    const classCount = isLeaf ? classes.length : 0;

                    const node: TreeNode = {
                        key: packageKey,
                        title: (
                            <div className="compact-package-item">
                                <Text className="compact-package-name">{part}</Text>
                                {isLeaf && classCount > 0 && (
                                    <span className="compact-count">{classCount}</span>
                                )}
                            </div>
                        ),
                        icon: <FolderOutlined style={{ fontSize: '10px', color: '#1677ff' }} />,
                        children: [],
                        packageName: currentPath,
                        type: "package",
                    };

                    packageMap.set(currentPath, node);

                    // 添加到父节点或根节点
                    if (parentPath) {
                        const parent = packageMap.get(parentPath);
                        if (parent) {
                            if (!parent.children) parent.children = [];
                            parent.children.push(node);
                        }
                    } else {
                        rootNodes.push(node);
                    }
                }
            }
        }

        // 为每个包添加类节点（确保key唯一）
        for (const [packageName, classes] of docIndex.packages.entries()) {
            const packageNode = packageMap.get(packageName);
            if (packageNode) {
                if (!packageNode.children) packageNode.children = [];
                classes.forEach((fullClassName, index) => {
                    const className = fullClassName.split(".").pop() || "";
                    // 使用包名+类名+索引确保key唯一
                    const classKey = `cls_${packageName}_${fullClassName}_${index}`;

                    // 检查key是否重复
                    if (keySet.has(classKey)) {
                        console.warn(`Duplicate key detected: ${classKey}`);
                        return;
                    }
                    keySet.add(classKey);

                    const classNode: TreeNode = {
                        key: classKey,
                        title: (
                            <div className="compact-class-item">
                                <Text className="compact-class-name" title={fullClassName}>
                                    {className}
                                </Text>
                            </div>
                        ),
                        icon: <ApiOutlined style={{ fontSize: '10px', color: '#fa8c16' }} />,
                        isLeaf: true,
                        className: fullClassName,
                        type: "class",
                    };
                    packageNode.children!.push(classNode);
                });

                // 对类进行排序
                packageNode.children!.sort((a, b) => {
                    if (a.type === "package" && b.type === "class") return -1;
                    if (a.type === "class" && b.type === "package") return 1;
                    const aTitle = a.className || a.packageName || "";
                    const bTitle = b.className || b.packageName || "";
                    return aTitle.localeCompare(bTitle);
                });
            }
        }

        setTreeData(rootNodes);
    };

    /**
     * 根据当前路由更新选中的项
     */
    const updateSelectedKeys = () => {
        const path = location.pathname;

        if (path.startsWith("/class/")) {
            const className = decodeURIComponent(path.replace("/class/", ""));
            // 查找对应的类节点key
            const findClassKey = (nodes: TreeNode[]): string | null => {
                for (const node of nodes) {
                    if (node.className === className) {
                        return node.key;
                    }
                    if (node.children) {
                        const found = findClassKey(node.children);
                        if (found) return found;
                    }
                }
                return null;
            };

            const classKey = findClassKey(treeData);
            if (classKey) {
                setSelectedKeys([classKey]);

                // 展开包含该类的包
                if (docIndex) {
                    for (const [
                        packageName,
                        classes,
                    ] of docIndex.packages.entries()) {
                        if (classes.includes(className)) {
                            const packageParts = packageName.split(".");
                            const keysToExpand: string[] = [];
                            let currentPath = "";

                            for (const part of packageParts) {
                                currentPath = currentPath
                                    ? `${currentPath}.${part}`
                                    : part;
                                keysToExpand.push(`pkg_${currentPath}`);
                            }

                            setExpandedKeys((prev) => [
                                ...new Set([...prev, ...keysToExpand]),
                            ]);
                            break;
                        }
                    }
                }
            }
        } else if (path.startsWith("/package/")) {
            const packageName = decodeURIComponent(
                path.replace("/package/", "")
            );
            setSelectedKeys([`pkg_${packageName}`]);
        } else {
            setSelectedKeys([]);
        }
    };

    /**
     * 处理树节点点击
     */
    const handleSelect = (selectedKeys: React.Key[]) => {
        const key = selectedKeys[0] as string;

        if (key?.startsWith("cls_")) {
            // 从树节点中找到对应的类名
            const findClassByKey = (
                nodes: TreeNode[],
                targetKey: string
            ): string | null => {
                for (const node of nodes) {
                    if (node.key === targetKey && node.className) {
                        return node.className;
                    }
                    if (node.children) {
                        const found = findClassByKey(node.children, targetKey);
                        if (found) return found;
                    }
                }
                return null;
            };

            const className = findClassByKey(treeData, key);
            if (className) {
                navigate(`/class/${encodeURIComponent(className)}`);
            }
        } else if (key?.startsWith("pkg_")) {
            const packageName = key.replace("pkg_", "");
            navigate(`/package/${encodeURIComponent(packageName)}`);
        }
    };

    if (!docIndex) {
        return (
            <div className="sidebar-loading">
                <Space direction="vertical" align="center">
                    <ApiOutlined style={{ fontSize: 24, color: "#d9d9d9" }} />
                    <Text type="secondary">Loading...</Text>
                </Space>
            </div>
        );
    }

    return (
        <div className="ultra-compact-javadoc-sidebar" ref={sidebarRef}>
            {/* 包和类树 */}
            <div className="sidebar-tree">
                <Tree
                    ref={treeRef}
                    showIcon
                    onSelect={handleSelect}
                    selectedKeys={selectedKeys}
                    expandedKeys={expandedKeys}
                    onExpand={(keys) => setExpandedKeys(keys as string[])}
                    treeData={treeData}
                    blockNode
                    className="ultra-compact-tree"
                />
            </div>

            {/* 极致紧凑样式 */}
            <style
                dangerouslySetInnerHTML={{
                    __html: `
                .ultra-compact-javadoc-sidebar {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    background: #fafafa;
                    border-right: 1px solid #e8e8e8;
                    width: 220px;
                }

                .sidebar-loading {
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 12px;
                }

                .sidebar-tree {
                    flex: 1;
                    overflow: auto;
                    padding: 2px;
                    background: #fafafa;
                    scroll-behavior: smooth;
                }

                .ultra-compact-tree {
                    background: transparent;
                    font-size: 11px;
                }

                .compact-package-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    width: 100%;
                    height: 14px;
                    line-height: 14px;
                }

                .compact-package-name {
                    font-size: 11px !important;
                    color: #1890ff !important;
                    font-weight: 500 !important;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    flex: 1;
                    margin: 0 !important;
                }

                .compact-class-item {
                    display: flex;
                    align-items: center;
                    width: 100%;
                    height: 14px;
                    line-height: 14px;
                }

                .compact-class-name {
                    font-size: 11px !important;
                    color: #595959 !important;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    margin: 0 !important;
                }

                .compact-count {
                    background: #8c8c8c;
                    color: white;
                    font-size: 8px;
                    padding: 0 3px;
                    border-radius: 6px;
                    min-width: 12px;
                    height: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 500;
                    margin-left: auto;
                    flex-shrink: 0;
                }

                /* 极致紧凑Tree组件样式 */
                .ultra-compact-tree .ant-tree-treenode {
                    padding: 0 !important;
                    margin: 0 !important;
                }

                .ultra-compact-tree .ant-tree-node-content-wrapper {
                    border-radius: 2px;
                    transition: background-color 0.15s;
                    padding: 1px 4px !important;
                    margin: 0 !important;
                    height: 14px !important;
                    line-height: 14px !important;
                    display: flex;
                    align-items: center;
                }

                .ultra-compact-tree .ant-tree-node-content-wrapper:hover {
                    background-color: #e6f7ff;
                }

                .ultra-compact-tree .ant-tree-node-content-wrapper.ant-tree-node-selected {
                    background-color: #1890ff;
                    color: white;
                }

                .ultra-compact-tree .ant-tree-node-content-wrapper.ant-tree-node-selected .compact-package-name {
                    color: white !important;
                }

                .ultra-compact-tree .ant-tree-node-content-wrapper.ant-tree-node-selected .compact-class-name {
                    color: white !important;
                }

                .ultra-compact-tree .ant-tree-node-content-wrapper.ant-tree-node-selected .compact-count {
                    background: rgba(255, 255, 255, 0.3);
                    color: white;
                }

                .ultra-compact-tree .ant-tree-switcher {
                    width: 12px !important;
                    height: 14px !important;
                    line-height: 14px !important;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 2px;
                }

                .ultra-compact-tree .ant-tree-switcher .ant-tree-switcher-icon {
                    font-size: 8px !important;
                }

                .ultra-compact-tree .ant-tree-iconEle {
                    width: 12px !important;
                    height: 14px !important;
                    line-height: 14px !important;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 2px;
                }

                .ultra-compact-tree .ant-tree-title {
                    flex: 1;
                    height: 14px !important;
                    line-height: 14px !important;
                    display: flex;
                    align-items: center;
                }

                /* 滚动条样式 */
                .sidebar-tree::-webkit-scrollbar {
                    width: 3px;
                }

                .sidebar-tree::-webkit-scrollbar-track {
                    background: transparent;
                }

                .sidebar-tree::-webkit-scrollbar-thumb {
                    background: #d9d9d9;
                    border-radius: 2px;
                }

                .sidebar-tree::-webkit-scrollbar-thumb:hover {
                    background: #bfbfbf;
                }
            `,
                }}
            />
        </div>
    );
};
