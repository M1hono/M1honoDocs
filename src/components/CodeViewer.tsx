import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import {
    Card,
    Button,
    Space,
    Spin,
    Alert,
    Tooltip,
    Badge,
    message,
} from "antd";
import {
    CopyOutlined,
    ExpandOutlined,
    CompressOutlined,
    LineHeightOutlined,
    SearchOutlined,
    BookOutlined,
} from "@ant-design/icons";
import { JavaClassDoc, ProjectDocIndex } from "../types";

interface CodeViewerProps {
    sourceCode: string | null;
    className: string;
    loading?: boolean;
    onJumpToLine?: (line: number) => void;
    onSmartJump: (simpleClassName: string) => void;
    highlightedLines?: number[];
    title?: string;
    classDoc?: JavaClassDoc;
    docIndex?: ProjectDocIndex | null;
}

/**
 * Monaco Editor 代码查看器
 * 支持Java语法高亮、代码跳转、行号导航等功能
 */
export const CodeViewer: React.FC<CodeViewerProps> = ({
    sourceCode,
    className,
    loading = false,
    onJumpToLine,
    highlightedLines = [],
    title,
    onSmartJump,
}) => {
    const navigate = useNavigate();
    const editorRef = useRef<any>(null);
    const [currentLine, setCurrentLine] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // 监听高亮行变化
    useEffect(() => {
        if (editorRef.current && highlightedLines.length > 0) {
            highlightLines(highlightedLines);
            setTimeout(() => {
                jumpToLine(highlightedLines[0]);
            }, 100);
        }
    }, [highlightedLines]);

    /**
     * Monaco Editor 配置
     */
    const editorOptions = {
        readOnly: true,
        minimap: {
            enabled: true,
            side: "right" as const,
        },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        fontSize: 14,
        lineNumbers: "on" as const,
        glyphMargin: true,
        folding: true,
        lineDecorationsWidth: 10,
        lineNumbersMinChars: 4,
        renderWhitespace: "selection" as const,
        wordWrap: "off" as const,
        theme: "vs",
        bracketPairColorization: {
            enabled: true,
        },
        showFoldingControls: "always" as const,
        smoothScrolling: true,
        cursorBlinking: "blink" as const,
        contextmenu: true,
        quickSuggestions: false,
        parameterHints: {
            enabled: false,
        },
        suggestOnTriggerCharacters: false,
        acceptSuggestionOnEnter: "off" as const,
    };

    /**
     * 编辑器挂载后的回调
     */
    const handleEditorDidMount = (editor: any, monaco: any) => {
        editorRef.current = editor;

        // 设置语言为Java
        monaco.languages.setLanguageConfiguration("java", {
            comments: {
                lineComment: "//",
                blockComment: ["/*", "*/"],
            },
            brackets: [
                ["{", "}"],
                ["[", "]"],
                ["(", ")"],
            ],
            autoClosingPairs: [
                { open: "{", close: "}" },
                { open: "[", close: "]" },
                { open: "(", close: ")" },
                { open: '"', close: '"' },
                { open: "'", close: "'" },
            ],
        });

        // 注册Ctrl+点击跳转提供者
        monaco.languages.registerDefinitionProvider("java", {
            provideDefinition: (model: any, position: any) => {
                const word = model.getWordAtPosition(position);
                if (word) {
                    const selectedText = word.word;
                    if (
                        isJavaClassName(selectedText) ||
                        isJavaMethodName(selectedText)
                    ) {
                        // 返回一个虚拟位置，实际跳转在下面的点击事件中处理
                        return [
                            {
                                uri: model.uri,
                                range: {
                                    startLineNumber: position.lineNumber,
                                    startColumn: word.startColumn,
                                    endLineNumber: position.lineNumber,
                                    endColumn: word.endColumn,
                                },
                            },
                        ];
                    }
                }
                return [];
            },
        });

        // 注册悬停提示
        monaco.languages.registerHoverProvider("java", {
            provideHover: (model: any, position: any) => {
                const word = model.getWordAtPosition(position);
                if (word) {
                    const selectedText = word.word;
                    if (isJavaClassName(selectedText)) {
                        return {
                            range: {
                                startLineNumber: position.lineNumber,
                                startColumn: word.startColumn,
                                endLineNumber: position.lineNumber,
                                endColumn: word.endColumn,
                            },
                            contents: [
                                { value: `**${selectedText}**` },
                                { value: `Ctrl+Click 跳转到类文档` },
                            ],
                        };
                    } else if (isJavaMethodName(selectedText)) {
                        return {
                            range: {
                                startLineNumber: position.lineNumber,
                                startColumn: word.startColumn,
                                endLineNumber: position.lineNumber,
                                endColumn: word.endColumn,
                            },
                            contents: [
                                { value: `**${selectedText}()**` },
                                { value: `Ctrl+Click 跳转到方法文档` },
                            ],
                        };
                    }
                }
                return null;
            },
        });

        // 注册Ctrl+点击事件
        editor.onMouseDown((e: any) => {
            if (e.event.ctrlKey || e.event.metaKey) {
                const position = e.target.position;
                if (position) {
                    const word = editor.getModel()?.getWordAtPosition(position);
                    if (word) {
                        handleSmartJump(word.word);
                    }
                }
            }
        });

        // 注册右键菜单
        editor.addAction({
            id: "jump-to-definition",
            label: "Go to Definition",
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.F12],
            contextMenuGroupId: "navigation",
            contextMenuOrder: 1.5,
            run: () => {
                const position = editor.getPosition();
                const model = editor.getModel();
                const word = model?.getWordAtPosition(position);
                if (word) {
                    handleSmartJump(word.word);
                }
            },
        });

        // 注册快捷键
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyG, () => {
            const lineNumber = prompt("跳转到行号:");
            if (lineNumber && !isNaN(Number(lineNumber))) {
                jumpToLine(Number(lineNumber));
            }
        });

        // 监听光标位置变化 - 添加安全检查
        if (editor.onDidChangeCursorPosition) {
            editor.onDidChangeCursorPosition((e: any) => {
                if (e && e.position && e.position.lineNumber) {
                    setCurrentLine(e.position.lineNumber);
                }
            });
        }

        // 高亮指定行并自动跳转
        if (highlightedLines.length > 0) {
            highlightLines(highlightedLines);
            // 自动跳转到第一个高亮行
            setTimeout(() => {
                jumpToLine(highlightedLines[0]);
            }, 100);
        }

        // 添加新的右键菜单动作
        editor.addAction({
            id: "copy-link-to-selection",
            label: "Copy Link to Selection",
            contextMenuGroupId: "navigation",
            contextMenuOrder: 1.6,
            precondition: "editorHasSelection", // Only show when text is selected
            run: (editor: any) => {
                const selection = editor.getSelection();
                if (selection && !selection.isEmpty()) {
                    const startLine = selection.startLineNumber;
                    const endLine = selection.endLineNumber;
                    const lineRange =
                        startLine === endLine
                            ? startLine
                            : `${startLine}-${endLine}`;

                    const url = new URL(window.location.href);
                    const params = new URLSearchParams(url.search);
                    params.set("tab", "source");
                    params.set("lines", String(lineRange));

                    // Preserve existing params like 'line' if needed, but 'lines' should take precedence
                    params.delete("line");

                    url.search = params.toString();

                    navigator.clipboard.writeText(url.toString()).then(
                        () => {
                            message.success("Link with line selection copied!");
                        },
                        () => {
                            message.error("Failed to copy link.");
                        }
                    );
                }
            },
        });
    };

    /**
     * 判断是否为Java类名
     */
    const isJavaClassName = (text: string): boolean => {
        // 改进类名识别：必须以大写字母开头，且不能是Java关键字
        const javaKeywords = [
            "public",
            "private",
            "protected",
            "static",
            "final",
            "abstract",
            "void",
            "int",
            "boolean",
            "long",
            "double",
            "float",
            "char",
            "byte",
            "short",
            "class",
            "interface",
            "enum",
            "extends",
            "implements",
            "return",
            "this",
            "super",
            "new",
            "if",
            "else",
            "for",
            "while",
            "do",
            "try",
            "catch",
            "finally",
            "throw",
            "throws",
            "import",
            "package",
            "synchronized",
            "volatile",
            "transient",
            "native",
            "strictfp",
            "assert",
            "break",
            "continue",
            "default",
            "goto",
            "instanceof",
            "switch",
            "case",
        ];

        return (
            /^[A-Z][a-zA-Z0-9_]*$/.test(text) &&
            text.length > 1 &&
            text.length < 50 &&
            !javaKeywords.includes(text.toLowerCase())
        );
    };

    /**
     * 判断是否为Java方法名
     */
    const isJavaMethodName = (text: string): boolean => {
        // 改进方法名识别：必须以小写字母开头，不能是关键字，不能是常见的非方法词汇
        const javaKeywords = [
            "public",
            "private",
            "protected",
            "static",
            "final",
            "abstract",
            "void",
            "int",
            "boolean",
            "long",
            "double",
            "float",
            "char",
            "byte",
            "short",
            "class",
            "interface",
            "enum",
            "extends",
            "implements",
            "return",
            "this",
            "super",
            "new",
            "if",
            "else",
            "for",
            "while",
            "do",
            "try",
            "catch",
            "finally",
            "throw",
            "throws",
            "import",
            "package",
            "synchronized",
            "volatile",
            "transient",
            "native",
            "strictfp",
            "assert",
            "break",
            "continue",
            "default",
            "goto",
            "instanceof",
            "switch",
            "case",
        ];

        const commonNonMethods = [
            "param",
            "params",
            "args",
            "arg",
            "value",
            "values",
            "data",
            "config",
            "settings",
            "options",
            "result",
            "results",
            "list",
            "map",
            "set",
            "array",
            "string",
            "object",
            "number",
            "count",
            "size",
            "length",
            "width",
            "height",
            "name",
            "type",
            "kind",
            "sort",
            "order",
            "level",
            "state",
            "status",
            "flag",
            "flags",
        ];

        return (
            /^[a-z][a-zA-Z0-9_]*$/.test(text) &&
            text.length > 2 &&
            text.length < 30 &&
            !javaKeywords.includes(text.toLowerCase()) &&
            !commonNonMethods.includes(text.toLowerCase())
        );
    };

    /**
     * 智能跳转处理
     */
    const handleSmartJump = (selectedText: string) => {
        if (isJavaClassName(selectedText)) {
            onSmartJump(selectedText);
        } else if (isJavaMethodName(selectedText)) {
            const encodedClassName = encodeURIComponent(className);
            navigate(
                `/class/${encodedClassName}?tab=overview&method=${selectedText}`
            );
        }
    };

    /**
     * 高亮指定行
     */
    const highlightLines = (lines: number[]) => {
        if (!editorRef.current) return;

        const decorations = lines.map((line) => ({
            range: new (window as any).monaco.Range(line, 1, line, 1),
            options: {
                isWholeLine: true,
                className: "highlighted-line",
                glyphMarginClassName: "highlighted-line-glyph",
            },
        }));

        editorRef.current.deltaDecorations([], decorations);
    };

    /**
     * 跳转到指定行
     */
    const jumpToLine = (line: number) => {
        if (!editorRef.current) return;

        editorRef.current.revealLineInCenter(line);
        editorRef.current.setPosition({ lineNumber: line, column: 1 });

        if (onJumpToLine) {
            onJumpToLine(line);
        }
    };

    /**
     * 复制源码
     */
    const copySourceCode = async () => {
        if (sourceCode) {
            try {
                await navigator.clipboard.writeText(sourceCode);
                // 可以添加成功提示
            } catch (error) {
                console.error("复制失败:", error);
            }
        }
    };

    /**
     * 切换全屏模式
     */
    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    /**
     * 显示搜索框
     */
    const showSearch = () => {
        if (editorRef.current) {
            editorRef.current.getAction("actions.find").run();
        }
    };

    /**
     * 跳转到类文档
     */
    const jumpToClassDoc = () => {
        const encodedClassName = encodeURIComponent(className);
        navigate(`/class/${encodedClassName}?tab=overview`);
    };

    if (loading) {
        return (
            <Card title="源码加载中...">
                <div style={{ textAlign: "center", padding: "48px" }}>
                    <Spin size="large" />
                    <div style={{ marginTop: "16px" }}>加载源码文件...</div>
                </div>
            </Card>
        );
    }

    if (!sourceCode) {
        return (
            <Alert
                type="warning"
                message="源码不可用"
                description="此类的源码文件未找到或无法访问"
                showIcon
            />
        );
    }

    const cardStyle = isFullscreen
        ? {
              position: "fixed" as const,
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1000,
              margin: 0,
              borderRadius: 0,
          }
        : {};

    return (
        <Card
            style={cardStyle}
            title={
                <Space>
                    <BookOutlined />
                    {title || `源码: ${className}`}
                    <Badge
                        count={sourceCode.split("\n").length}
                        title="总行数"
                    />
                    <Badge count={currentLine} color="blue" title="当前行" />
                </Space>
            }
            extra={
                <Space>
                    <Tooltip title="跳转到文档">
                        <Button
                            icon={<BookOutlined />}
                            onClick={jumpToClassDoc}
                            size="small"
                            type="primary"
                        />
                    </Tooltip>
                    <Tooltip title="搜索 (Ctrl+F)">
                        <Button
                            icon={<SearchOutlined />}
                            onClick={showSearch}
                            size="small"
                        />
                    </Tooltip>
                    <Tooltip title="跳转到行 (Ctrl+G)">
                        <Button
                            icon={<LineHeightOutlined />}
                            onClick={() => {
                                const lineNumber = prompt("跳转到行号:");
                                if (lineNumber && !isNaN(Number(lineNumber))) {
                                    jumpToLine(Number(lineNumber));
                                }
                            }}
                            size="small"
                        />
                    </Tooltip>
                    <Tooltip title="复制源码">
                        <Button
                            icon={<CopyOutlined />}
                            onClick={copySourceCode}
                            size="small"
                        />
                    </Tooltip>
                    <Tooltip title={isFullscreen ? "退出全屏" : "全屏显示"}>
                        <Button
                            icon={
                                isFullscreen ? (
                                    <CompressOutlined />
                                ) : (
                                    <ExpandOutlined />
                                )
                            }
                            onClick={toggleFullscreen}
                            size="small"
                        />
                    </Tooltip>
                </Space>
            }
        >
            <div
                style={{
                    height: isFullscreen ? "calc(100vh - 100px)" : "600px",
                }}
            >
                <Editor
                    height="100%"
                    language="java"
                    value={sourceCode}
                    options={editorOptions}
                    onMount={handleEditorDidMount}
                    theme="vs"
                />
            </div>

            {/* 自定义样式注入 */}
            {typeof window !== "undefined" &&
                (() => {
                    const styleId = "code-viewer-styles";
                    if (!document.getElementById(styleId)) {
                        const style = document.createElement("style");
                        style.id = styleId;
                        style.textContent = `
                        .highlighted-line {
                            background-color: #ffeb3b33;
                        }
                        .highlighted-line-glyph {
                            background-color: #ffeb3b;
                            width: 3px !important;
                            margin-left: 3px;
                        }
                    `;
                        document.head.appendChild(style);
                    }
                    return null;
                })()}
        </Card>
    );
};
