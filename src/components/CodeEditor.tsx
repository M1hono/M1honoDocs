import React from "react";
import { Editor } from "@monaco-editor/react";
import { Typography, Spin } from "antd";
import { FileNode } from "../types";
import { getFileLanguage } from "../utils/fileUtils";

const { Title, Text } = Typography;

interface CodeEditorProps {
    file: FileNode | null;
    content: string;
    isLoading: boolean;
}

/**
 * 代码编辑器组件 - 只读模式
 */
export const CodeEditor: React.FC<CodeEditorProps> = ({
    file,
    content,
    isLoading,
}) => {
    if (!file) {
        return (
            <div className="code-area">
                <div className="welcome-container">
                    <div className="welcome-content">
                        <Title
                            level={3}
                            style={{ marginBottom: 16, color: "#1890ff" }}
                        >
                            🎮 Minecraft 代码浏览器
                        </Title>
                        <Text
                            style={{
                                fontSize: 16,
                                color: "#666",
                                display: "block",
                                marginBottom: 20,
                            }}
                        >
                            探索 Minecraft Forge 和 KubeJS 的源代码世界
                        </Text>
                        <Text type="secondary" style={{ fontSize: 14 }}>
                            👈 点击左侧文件树中的文件开始查看代码
                        </Text>
                    </div>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="code-area">
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "100%",
                    }}
                >
                    <Spin size="large" tip="加载文件内容..." />
                </div>
            </div>
        );
    }

    const language = getFileLanguage(file.name);

    return (
        <div className="code-area">
            <div className="header">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Title level={5} style={{ margin: 0 }}>
                        {file.name}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {file.path}
                    </Text>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        只读模式 • {language.toUpperCase()}
                    </Text>
                </div>
            </div>

            <Editor
                height="calc(100vh - 120px)"
                language={language}
                value={content}
                theme="vs"
                options={{
                    readOnly: true,
                    minimap: { enabled: true },
                    fontSize: 14,
                    lineNumbers: "on",
                    renderWhitespace: "selection",
                    wordWrap: "on",
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    cursorStyle: "line",
                    renderLineHighlight: "line",
                    selectOnLineNumbers: true,
                    roundedSelection: false,
                    renderControlCharacters: false,
                    fontFamily:
                        "'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
                    fontLigatures: true,
                    bracketPairColorization: {
                        enabled: true,
                    },
                    guides: {
                        indentation: true,
                        bracketPairs: true,
                    },
                    quickSuggestions: false,
                    parameterHints: {
                        enabled: false,
                    },
                    hover: {
                        enabled: true,
                    },
                    contextmenu: true,
                    folding: true,
                    foldingStrategy: "indentation",
                    showFoldingControls: "always",
                    unfoldOnClickAfterEndOfLine: false,
                    disableLayerHinting: false,
                    hideCursorInOverviewRuler: false,
                    links: true,
                    mouseWheelZoom: true,
                    multiCursorMergeOverlapping: true,
                    multiCursorModifier: "alt",
                    overviewRulerBorder: true,
                    overviewRulerLanes: 2,
                    padding: {
                        top: 10,
                        bottom: 10,
                    },
                    quickSuggestionsDelay: 10,
                    revealHorizontalRightPadding: 5,
                    rulers: [],
                    scrollbar: {
                        vertical: "visible",
                        horizontal: "visible",
                        arrowSize: 11,
                        useShadows: true,
                        verticalHasArrows: false,
                        horizontalHasArrows: false,
                        horizontalScrollbarSize: 12,
                        verticalScrollbarSize: 12,
                        verticalSliderSize: 12,
                        horizontalSliderSize: 12,
                    },
                }}
            />
        </div>
    );
};
