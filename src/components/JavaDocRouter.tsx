import React from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";
import { Layout, Spin, Alert } from "antd";
import { ProjectDocIndex } from "../types";
import { JavaDocHome } from "./pages/JavaDocHome";
import { JavaDocPackage } from "./pages/JavaDocPackage";
import { JavaDocClass } from "./pages/JavaDocClass";
import { JavaDocNavbar } from "./JavaDocNavbar";
import { JavaDocSidebar } from "./JavaDocSidebar";

const { Header, Sider, Content } = Layout;

interface JavaDocRouterProps {
    docIndex: ProjectDocIndex | null;
    loading: boolean;
    error: string;
    onRegenerate: () => void;
    parseProgress?: {
        total: number;
        parsed: number;
        current: string;
    } | null;
    // Version props
    availableVersions: string[];
    currentVersion: string;
    onVersionChange: (version: string) => void;
}

/**
 * JavaDoc 路由系统
 * 模仿传统 JavaDoc 的 URL 结构，修复布局和滚动问题
 */
export const JavaDocRouter: React.FC<JavaDocRouterProps> = ({
    docIndex,
    loading,
    error,
    onRegenerate,
    availableVersions,
    currentVersion,
    onVersionChange,
}) => {
    // 如果正在加载，显示加载界面
    if (loading && !docIndex) {
        return (
            <div className="router-loading-container">
                <div className="router-loading-content">
                    <div style={{ fontSize: "48px", marginBottom: "24px" }}>
                        🎮
                    </div>
                    <h2 style={{ marginBottom: "16px", color: "#1677ff" }}>
                        Minecraft JavaDoc 浏览器
                    </h2>
                    <Spin size="large" />
                    <p style={{ marginTop: "16px", color: "#666" }}>
                        正在生成文档数据...
                    </p>
                    <p
                        style={{
                            fontSize: "14px",
                            color: "#999",
                            marginTop: "8px",
                        }}
                    >
                        生成数百个类和方法，请稍候...
                    </p>
                </div>
            </div>
        );
    }

    // 如果有错误，显示错误界面
    if (error) {
        return (
            <div className="router-error-container">
                <div style={{ maxWidth: "600px", width: "100%" }}>
                    <Alert
                        type="error"
                        message="文档生成失败"
                        description={
                            <div>
                                <p>{error}</p>
                                <p className="router-error-description">
                                    请检查控制台查看详细错误信息，或尝试重新生成文档。
                                </p>
                            </div>
                        }
                        showIcon
                        action={
                            <button
                                onClick={onRegenerate}
                                className="router-error-button"
                            >
                                重新生成
                            </button>
                        }
                    />
                </div>
            </div>
        );
    }

    // 如果没有文档数据，显示空状态
    if (!docIndex) {
        return (
            <div className="router-empty-container">
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                        📚
                    </div>
                    <h3 style={{ color: "#1677ff" }}>
                        欢迎使用 Minecraft JavaDoc 浏览器
                    </h3>
                    <p style={{ color: "#666" }}>正在准备文档数据...</p>
                </div>
            </div>
        );
    }

    return (
        <Router
            future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
            }}
        >
            <Layout className="javadoc-layout">
                {/* 顶部导航栏 - 固定 */}
                <Header className="javadoc-header">
                    <JavaDocNavbar
                        docIndex={docIndex}
                        availableVersions={availableVersions}
                        currentVersion={currentVersion}
                        onVersionChange={onVersionChange}
                    />
                </Header>

                <Layout className="javadoc-body">
                    {/* 左侧边栏 - 固定 */}
                    <Sider width={300} className="javadoc-sider">
                        <div className="javadoc-sider-content">
                            <JavaDocSidebar docIndex={docIndex} />
                        </div>
                    </Sider>

                    {/* 主内容区域 - 可滚动 */}
                    <Layout className="javadoc-main">
                        <Content className="javadoc-content">
                            <div className="javadoc-page-content">
                                <Routes>
                                    {/* 主页 */}
                                    <Route
                                        path="/"
                                        element={
                                            <JavaDocHome
                                                docIndex={docIndex}
                                                loading={false}
                                            />
                                        }
                                    />

                                    {/* 包页面 */}
                                    <Route
                                        path="/package/:packageName/*"
                                        element={
                                            <JavaDocPackage
                                                docIndex={docIndex}
                                            />
                                        }
                                    />

                                    {/* 类页面 */}
                                    <Route
                                        path="/class/:className/*"
                                        element={
                                            <JavaDocClass docIndex={docIndex} />
                                        }
                                    />

                                    {/* 重定向未知路径到首页 */}
                                    <Route
                                        path="*"
                                        element={<Navigate to="/" replace />}
                                    />
                                </Routes>
                            </div>
                        </Content>
                    </Layout>
                </Layout>
            </Layout>
        </Router>
    );
};
