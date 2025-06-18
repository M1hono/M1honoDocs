import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Input, Typography } from "antd";
import {
    Search,
    Folder,
    FolderOpen,
    File,
    Coffee,
    Settings,
    FileText,
    Braces,
    ChevronRight,
    ChevronDown,
} from "lucide-react";
import { FileNode, ProjectInfo } from "../types";
import { getFileIcon, searchFiles, flattenFileTree } from "../utils/fileUtils";
import { loadDirectoryContent } from "../utils/fileSystemAPI";

const { Search: AntSearch } = Input;

interface FileTreeProps {
    projects: ProjectInfo[];
    onFileSelect: (file: FileNode) => void;
    onDirectoryExpand?: (node: FileNode) => void;
    selectedFile: FileNode | null;
    searchTerm?: string;
    onSearch?: (term: string) => void;
}

/**
 * VS Code风格极致紧凑文件树
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
    const [collapsedProjects, setCollapsedProjects] = useState<Set<number>>(new Set());

    const getIcon = (iconName: string) => {
        const iconProps = { size: 10 };
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

    const getDirectoryFileCount = (node: FileNode): number => {
        if (node.type === "file") return 1;
        if (!node.children) return 0;
        return node.children.reduce((count, child) => count + getDirectoryFileCount(child), 0);
    };

    const toggleNode = async (node: FileNode) => {
        const newExpanded = new Set(expandedNodes);
        if (newExpanded.has(node.path)) {
            newExpanded.delete(node.path);
        } else {
            newExpanded.add(node.path);
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

    const toggleProject = (index: number) => {
        const newCollapsed = new Set(collapsedProjects);
        if (newCollapsed.has(index)) {
            newCollapsed.delete(index);
        } else {
            newCollapsed.add(index);
        }
        setCollapsedProjects(newCollapsed);
    };

    const renderFileNode = (node: FileNode, level = 0): React.ReactNode => {
        const isSelected = selectedFile?.path === node.path;
        const icon = getIcon(getFileIcon(node));
        const isExpanded = expandedNodes.has(node.path);
        const hasChildren = node.children && node.children.length > 0;
        const fileCount = node.type === "directory" ? getDirectoryFileCount(node) : 0;

        const nodeElement = (
            <div
                key={`${node.path}-${level}`}
                className={`vscode-item ${isSelected ? "selected" : ""}`}
                data-type={node.type}
                style={{ 
                    paddingLeft: `${level * 6 + 2}px`,
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (node.type === "directory") {
                        toggleNode(node);
                    } else {
                        onFileSelect(node);
                    }
                }}
            >
                <span 
                    className="vscode-chevron" 
                    style={{ visibility: node.type === "directory" && hasChildren ? 'visible' : 'hidden' }}
                >
                    {isExpanded ? <ChevronDown size={8} /> : <ChevronRight size={8} />}
                </span>
                <span className="vscode-icon">{icon}</span>
                <span className="vscode-name">{node.name}</span>
                {node.type === "directory" && fileCount > 0 && (
                    <span className="vscode-count">{fileCount}</span>
                )}
            </div>
        );

        if (node.type === "directory" && isExpanded && node.children) {
            return (
                <React.Fragment key={node.path}>
                    {nodeElement}
                    {node.children.map(child => renderFileNode(child, level + 1))}
                </React.Fragment>
            );
        }

        return nodeElement;
    };

    const renderProject = (project: ProjectInfo, index: number) => {
        const isCollapsed = collapsedProjects.has(index);
        const totalFiles = project.files.reduce((count, file) => count + getDirectoryFileCount(file), 0);

        return (
            <div key={index} className="vscode-project">
                <div
                    className="vscode-project-header"
                    onClick={() => toggleProject(index)}
                >
                    <span className="vscode-chevron">
                        {isCollapsed ? <ChevronRight size={8} /> : <ChevronDown size={8} />}
                    </span>
                    <Folder size={10} />
                    <span className="vscode-project-name">{project.name}</span>
                    <span className="vscode-count">{totalFiles}</span>
                </div>
                
                {!isCollapsed && (
                    <div className="vscode-project-content">
                        {project.files.map(file => renderFileNode(file, 0))}
                    </div>
                )}
            </div>
        );
    };

    const renderSearchResults = () => {
        if (!searchTerm) return null;
        
        const searchResults = searchFiles(projects, searchTerm);
        return (
            <div className="vscode-search-results">
                <div className="vscode-search-header">
                    {searchResults.length} results
                </div>
                {searchResults.map(node => renderFileNode(node, 0))}
            </div>
        );
    };

    return (
        <div className="vscode-sidebar">
            <div className="vscode-search">
                <AntSearch
                    placeholder="Search files"
                    value={searchTerm}
                    onChange={(e) => {
                        const value = e.target.value;
                        if (onSearch) {
                            onSearch(value);
                        } else {
                            setInternalSearchTerm(value);
                        }
                    }}
                    prefix={<Search size={10} />}
                    allowClear
                    size="small"
                />
            </div>

            <div className="vscode-tree">
                {searchTerm ? (
                    renderSearchResults()
                ) : (
                    projects.map((project, index) => renderProject(project, index))
                )}
            </div>
        </div>
    );
};
