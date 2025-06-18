import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Input, Typography, Collapse } from "antd";
import {
    Search,
    Folder,
    FolderOpen,
    File,
    Coffee,
    Settings,
    FileText,
    Braces,
} from "lucide-react";
import { FileNode, ProjectInfo } from "../types";
import { getFileIcon, searchFiles, flattenFileTree } from "../utils/fileUtils";
import { Tree } from "antd";
import { loadDirectoryContent } from "../utils/fileSystemAPI";

const { Search: AntSearch } = Input;
const { Panel } = Collapse;

interface FileTreeProps {
    projects: ProjectInfo[];
    onFileSelect: (file: FileNode) => void;
    onDirectoryExpand?: (node: FileNode) => void;
    selectedFile: FileNode | null;
    searchTerm?: string;
    onSearch?: (term: string) => void;
}

/**
 * 文件树组件
 */
export const FileTree: React.FC<FileTreeProps> = ({
    projects,
    onFileSelect,
    onDirectoryExpand,
    selectedFile,
    searchTerm: externalSearchTerm,
    onSearch,
}) => {
    const [internalSearchTerm, setInternalSearchTerm] = useState("");
    const searchTerm = externalSearchTerm || internalSearchTerm;
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    const getIcon = (iconName: string) => {
        const iconProps = { size: 16 };
        switch (iconName) {
            case "folder":
                return <Folder {...iconProps} />;
            case "folder-open":
                return <FolderOpen {...iconProps} />;
            case "coffee":
                return <Coffee {...iconProps} />;
            case "settings":
                return <Settings {...iconProps} />;
            case "file-text":
                return <FileText {...iconProps} />;
            case "braces":
                return <Braces {...iconProps} />;
            default:
                return <File {...iconProps} />;
        }
    };

    const toggleNode = async (node: FileNode) => {
        const newExpanded = new Set(expandedNodes);
        if (newExpanded.has(node.path)) {
            newExpanded.delete(node.path);
        } else {
            newExpanded.add(node.path);

            // 调用外部的目录展开处理函数
            if (node.type === "directory" && onDirectoryExpand) {
                try {
                    await onDirectoryExpand(node);
                } catch (error) {
                    console.error("Failed to expand directory:", error);
                }
            }
        }
        setExpandedNodes(newExpanded);
    };

    const updateNodeExpansion = (nodes: FileNode[]): FileNode[] => {
        return nodes.map((node) => ({
            ...node,
            isExpanded: expandedNodes.has(node.path),
            children: node.children
                ? updateNodeExpansion(node.children)
                : undefined,
        }));
    };

    const renderFileNode = (node: FileNode) => {
        const isSelected = selectedFile?.path === node.path;
        const icon = getIcon(getFileIcon(node));
        const paddingLeft = (node.level || 0) * 16 + 8;

        return (
            <div
                key={node.path}
                className={`file-tree-item ${isSelected ? "selected" : ""}`}
                data-type={node.type}
                data-extension={node.extension || ""}
                style={{ paddingLeft }}
                onClick={() => {
                    if (node.type === "directory") {
                        toggleNode(node);
                    } else {
                        onFileSelect(node);
                    }
                }}
            >
                <span className="icon">{icon}</span>
                <span>{node.name}</span>
            </div>
        );
    };

    const renderFileTree = (nodes: FileNode[]) => {
        const updatedNodes = updateNodeExpansion(nodes);
        const flatNodes = flattenFileTree(updatedNodes);

        if (searchTerm) {
            const searchResults = searchFiles(projects, searchTerm);
            return searchResults.map(renderFileNode);
        }

        return flatNodes.map(renderFileNode);
    };

    return (
        <div className="sidebar">
            <div className="search-container">
                <AntSearch
                    placeholder="搜索文件..."
                    value={searchTerm}
                    onChange={(e) => {
                        const value = e.target.value;
                        if (onSearch) {
                            onSearch(value);
                        } else {
                            setInternalSearchTerm(value);
                        }
                    }}
                    prefix={<Search size={16} />}
                    allowClear
                />
            </div>

            <div className="file-tree">
                <Collapse
                    defaultActiveKey={projects.map((_, index) =>
                        index.toString()
                    )}
                    ghost
                >
                    {projects.map((project, index) => (
                        <Panel
                            key={index.toString()}
                            header={
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                    }}
                                >
                                    <Folder size={16} />
                                    <div>
                                        <Typography.Text strong>
                                            {project.name}
                                        </Typography.Text>
                                        <br />
                                        <Typography.Text
                                            type="secondary"
                                            style={{ fontSize: 12 }}
                                        >
                                            {project.description}
                                        </Typography.Text>
                                    </div>
                                </div>
                            }
                        >
                            <div style={{ marginTop: 8 }}>
                                {renderFileTree(project.files)}
                            </div>
                        </Panel>
                    ))}
                </Collapse>
            </div>
        </div>
    );
};
