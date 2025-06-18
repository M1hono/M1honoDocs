import React, { useState, useEffect } from "react";
import { Tree, Typography, Badge, Space } from "antd";
import { 
    FolderOutlined, 
    ApiOutlined, 
    FolderOpenOutlined,
    FileTextOutlined
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
    type: 'package' | 'class';
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
                            <div className="sidebar-package-item">
                                <div className="package-info">
                                    <Text strong className="package-name">{part}</Text>
                                    {isLeaf && classCount > 0 && (
                                        <Badge
                                            count={classCount}
                                            size="small"
                                            className="class-count-badge"
                                        />
                                    )}
                                </div>
                            </div>
                        ),
                        icon: isLeaf ? <FolderOpenOutlined className="package-icon-open" /> : <FolderOutlined className="package-icon" />,
                        children: [],
                        packageName: currentPath,
                        type: 'package',
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
                    const className = fullClassName.split('.').pop() || '';
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
                            <div className="sidebar-class-item">
                                <Text className="class-name" title={fullClassName}>{className}</Text>
                                <div className="class-info">
                                    <FileTextOutlined className="class-icon-small" />
                                </div>
                            </div>
                        ),
                        icon: <ApiOutlined className="class-icon" />,
                        isLeaf: true,
                        className: fullClassName,
                        type: 'class',
                    };
                    packageNode.children!.push(classNode);
                });

                // 对类进行排序
                packageNode.children!.sort((a, b) => {
                    if (a.type === 'package' && b.type === 'class') return -1;
                    if (a.type === 'class' && b.type === 'package') return 1;
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
                    for (const [packageName, classes] of docIndex.packages.entries()) {
                        if (classes.includes(className)) {
                            const packageParts = packageName.split(".");
                            const keysToExpand: string[] = [];
                            let currentPath = "";

                            for (const part of packageParts) {
                                currentPath = currentPath ? `${currentPath}.${part}` : part;
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
            const packageName = decodeURIComponent(path.replace("/package/", ""));
            setSelectedKeys([`pkg_${packageName}`]);
        } else {
            setSelectedKeys([]);
        }
    };

    /**
     * 处理树节点点击
     */
    const handleSelect = (selectedKeys: React.Key[], info: any) => {
        const key = selectedKeys[0] as string;

        if (key?.startsWith("cls_")) {
            // 从树节点中找到对应的类名
            const findClassByKey = (nodes: TreeNode[], targetKey: string): string | null => {
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
                    <ApiOutlined style={{ fontSize: 24, color: '#d9d9d9' }} />
                    <Text type="secondary">Loading...</Text>
                </Space>
            </div>
        );
    }

    return (
        <div className="clean-sidebar">
            {/* 包和类树 */}
            <div className="sidebar-tree">
                <Tree
                    showIcon
                    onSelect={handleSelect}
                    selectedKeys={selectedKeys}
                    expandedKeys={expandedKeys}
                    onExpand={(keys) => setExpandedKeys(keys as string[])}
                    treeData={treeData}
                    blockNode
                    className="clean-tree"
                />
            </div>

            {/* 简洁样式 */}
            <style dangerouslySetInnerHTML={{__html: `
                .clean-sidebar {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    background: #fafafa;
                    border-right: 1px solid #e8e8e8;
                }

                .sidebar-loading {
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 24px;
                }

                .sidebar-tree {
                    flex: 1;
                    overflow: auto;
                    padding: 12px;
                    background: #fafafa;
                }

                .clean-tree {
                    background: transparent;
                    font-size: 13px;
                }

                .sidebar-package-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    width: 100%;
                    padding: 2px 0;
                }

                .package-info {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex: 1;
                    min-width: 0;
                }

                .package-name {
                    font-size: 13px;
                    color: #1890ff;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .sidebar-class-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    width: 100%;
                    padding: 2px 0;
                }

                .class-name {
                    font-size: 12px;
                    color: #595959;
                    flex: 1;
                    min-width: 0;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .class-info {
                    opacity: 0.5;
                }

                .class-icon-small {
                    font-size: 10px;
                    color: #d9d9d9;
                }

                .package-icon, .package-icon-open {
                    color: #1890ff !important;
                    font-size: 14px;
                }

                .class-icon {
                    color: #fa8c16 !important;
                    font-size: 12px;
                }

                .class-count-badge {
                    background-color: #52c41a !important;
                    font-size: 10px;
                    height: 16px;
                    line-height: 14px;
                    min-width: 16px;
                    border-radius: 8px;
                }

                /* 自定义Tree组件样式 */
                .clean-tree .ant-tree-node-content-wrapper {
                    border-radius: 6px;
                    transition: all 0.2s;
                    padding: 4px 8px;
                    margin: 1px 0;
                }

                .clean-tree .ant-tree-node-content-wrapper:hover {
                    background-color: #e6f7ff;
                }

                .clean-tree .ant-tree-node-content-wrapper.ant-tree-node-selected {
                    background-color: #1890ff;
                    color: white;
                }

                .clean-tree .ant-tree-node-content-wrapper.ant-tree-node-selected .package-name {
                    color: white;
                }

                .clean-tree .ant-tree-node-content-wrapper.ant-tree-node-selected .class-name {
                    color: white;
                }

                .clean-tree .ant-tree-switcher {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
            `}} />
        </div>
    );
};
 