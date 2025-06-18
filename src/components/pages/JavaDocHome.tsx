import React from "react";
import {
    Card,
    Typography,
    Space,
    List,
    Tag,
    Spin,
    Progress,
    Avatar,
    Statistic,
    Row,
    Col,
} from "antd";
import { Link } from "react-router-dom";
import {
    FolderOutlined,
    ApiOutlined,
    FireOutlined,
    TrophyOutlined,
    RocketOutlined,
    BookOutlined,
} from "@ant-design/icons";
import { ProjectDocIndex } from "../../types";

const { Title, Paragraph, Text } = Typography;

interface JavaDocHomeProps {
    docIndex: ProjectDocIndex | null;
    loading: boolean;
}

/**
 * JavaDoc 主页
 * 现代化设计的项目概览和导航页面
 */
export const JavaDocHome: React.FC<JavaDocHomeProps> = ({
    docIndex,
    loading,
}) => {
    /**
     * 计算项目统计信息
     */
    const getProjectStats = () => {
        if (!docIndex) return { packages: 0, classes: 0 };

        const packages = docIndex.totalPackages || docIndex.packages.size;
        const classes = docIndex.totalClasses || docIndex.classes.size;

        return { packages, classes };
    };

    /**
     * 获取包中类数量排行（增强版）
     */
    const getPackageClassRanking = () => {
        if (!docIndex) return [];

        const packageRanking: Array<{
            packageName: string;
            classCount: number;
        }> = [];

        for (const [packageName, classList] of docIndex.packages.entries()) {
            packageRanking.push({
                packageName,
                classCount: classList.length,
            });
        }

        // 按类数量排序，取前20个
        packageRanking.sort((a, b) => b.classCount - a.classCount);
        return packageRanking.slice(0, 20);
    };

    /**
     * 获取包的分类
     */
    const getPackageCategory = (packageName: string): string => {
        if (packageName.startsWith("com.mojang")) return "Mojang";
        if (packageName.startsWith("net.minecraft.client")) return "Client";
        if (packageName.startsWith("net.minecraft.server")) return "Server";
        if (packageName.startsWith("net.minecraft")) return "Core";
        if (packageName.startsWith("net.minecraftforge")) return "Forge";
        return "Other";
    };

    /**
     * 获取包的描述
     */
    const getPackageDescription = (packageName: string): string => {
        const parts = packageName.split(".");
        return `${parts.length} level package`;
    };

    /**
     * 获取分类颜色
     */
    const getCategoryColor = (category: string): string => {
        const colors = {
            Mojang: "#1677ff",
            Client: "#52c41a",
            Server: "#fa8c16",
            Core: "#722ed1",
            Forge: "#eb2f96",
            Other: "#8c8c8c",
        };
        return colors[category as keyof typeof colors] || "#8c8c8c";
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner">
                    <Spin size="large" />
                    <RocketOutlined className="loading-icon" />
                </div>
                <div className="loading-text">
                    <Text>正在加载 Minecraft JavaDoc 文档...</Text>
                    <Progress
                        percent={85}
                        showInfo={false}
                        strokeColor="#1677ff"
                    />
                </div>
            </div>
        );
    }

    if (!docIndex) {
        return (
            <div className="loading-container">
                <Title level={3}>欢迎使用 Minecraft JavaDoc 浏览器</Title>
                <Paragraph>请等待项目扫描完成。</Paragraph>
            </div>
        );
    }

    const stats = getProjectStats();
    const packageRanking = getPackageClassRanking();

    return (
        <div className="ultra-modern-home">
            {/* 简洁的头部区域 */}
            <div className="hero-section">
                <div className="hero-content">
                    <Title level={1} className="hero-title">
                        Minecraft JavaDoc
                    </Title>
                    <Paragraph className="hero-subtitle">
                        Forge 1.20.1-47.1.99 API Documentation
                    </Paragraph>

                    <div className="hero-metrics">
                        <div className="metric-item">
                            <div className="metric-number">
                                {stats.packages.toLocaleString()}
                            </div>
                            <div className="metric-label">Packages</div>
                        </div>
                        <div className="metric-divider"></div>
                        <div className="metric-item">
                            <div className="metric-number">
                                {stats.classes.toLocaleString()}
                            </div>
                            <div className="metric-label">Classes</div>
                        </div>
                        <div className="metric-divider"></div>
                        <div className="metric-item">
                            <div className="metric-number">
                                {Math.round(stats.classes / stats.packages)}
                            </div>
                            <div className="metric-label">Avg/Package</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 包排行榜 */}
            <div className="ranking-section">
                <Card className="ranking-card">
                    <div className="ranking-header">
                        <div className="ranking-title">
                            <FolderOutlined />
                            <span>Package Rankings</span>
                        </div>
                        <Text type="secondary">
                            Packages sorted by class count
                        </Text>
                    </div>

                    <div className="ranking-list">
                        {packageRanking.map((item, index) => (
                            <div
                                key={item.packageName}
                                className="ranking-item"
                            >
                                <div className="ranking-position">
                                    <Avatar
                                        size={32}
                                        className={`rank-avatar ${
                                            index < 3 ? "top-rank" : ""
                                        }`}
                                        style={{
                                            backgroundColor:
                                                index < 3
                                                    ? getCategoryColor(
                                                          getPackageCategory(
                                                              item.packageName
                                                          )
                                                      )
                                                    : "#f0f0f0",
                                            color: index < 3 ? "white" : "#666",
                                        }}
                                    >
                                        {index + 1}
                                    </Avatar>
                                </div>
                                <div className="ranking-content">
                                    <div className="package-info">
                                        <Link
                                            to={`/package/${encodeURIComponent(
                                                item.packageName
                                            )}`}
                                            className="package-name"
                                        >
                                            {item.packageName}
                                        </Link>
                                        <Text
                                            className="package-description"
                                            type="secondary"
                                        >
                                            {getPackageDescription(
                                                item.packageName
                                            )}
                                        </Text>
                                    </div>
                                </div>
                                <div className="ranking-metrics">
                                    <Tag
                                        color={getCategoryColor(
                                            getPackageCategory(item.packageName)
                                        )}
                                        className="category-tag"
                                    >
                                        {getPackageCategory(item.packageName)}
                                    </Tag>
                                    <div className="class-count">
                                        <Text strong>{item.classCount}</Text>
                                        <Text
                                            type="secondary"
                                            style={{ fontSize: "12px" }}
                                        >
                                            {" "}
                                            classes
                                        </Text>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};
