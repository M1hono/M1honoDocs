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
    Col
} from "antd";
import { Link } from "react-router-dom";
import {
    FolderOutlined,
    ApiOutlined,
    FireOutlined,
    TrophyOutlined,
    RocketOutlined,
    BookOutlined
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
        if (!docIndex)
            return { packages: 0, classes: 0 };

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
                classCount: classList.length
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
        if (packageName.startsWith('com.mojang')) return 'Mojang';
        if (packageName.startsWith('net.minecraft.client')) return 'Client';
        if (packageName.startsWith('net.minecraft.server')) return 'Server';
        if (packageName.startsWith('net.minecraft')) return 'Core';
        if (packageName.startsWith('net.minecraftforge')) return 'Forge';
        return 'Other';
    };

    /**
     * 获取包的描述
     */
    const getPackageDescription = (packageName: string): string => {
        const parts = packageName.split('.');
        return `${parts.length} level package`;
    };

    /**
     * 获取分类颜色
     */
    const getCategoryColor = (category: string): string => {
        const colors = {
            'Mojang': '#1677ff',
            'Client': '#52c41a', 
            'Server': '#fa8c16',
            'Core': '#722ed1',
            'Forge': '#eb2f96',
            'Other': '#8c8c8c'
        };
        return colors[category as keyof typeof colors] || '#8c8c8c';
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
                    <Progress percent={85} showInfo={false} strokeColor="#1677ff" />
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
                            <div className="metric-number">{stats.packages.toLocaleString()}</div>
                            <div className="metric-label">Packages</div>
                        </div>
                        <div className="metric-divider"></div>
                        <div className="metric-item">
                            <div className="metric-number">{stats.classes.toLocaleString()}</div>
                            <div className="metric-label">Classes</div>
                        </div>
                        <div className="metric-divider"></div>
                        <div className="metric-item">
                            <div className="metric-number">{Math.round(stats.classes / stats.packages)}</div>
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
                        <Text type="secondary">Packages sorted by class count</Text>
                    </div>
                    
                    <div className="ranking-list">
                        {packageRanking.map((item, index) => (
                            <div key={item.packageName} className="ranking-item">
                                <div className="ranking-position">
                                    <Avatar 
                                        size={32}
                                        className={`rank-avatar ${index < 3 ? 'top-rank' : ''}`}
                                        style={{ 
                                            backgroundColor: index < 3 ? getCategoryColor(getPackageCategory(item.packageName)) : '#f0f0f0',
                                            color: index < 3 ? 'white' : '#666'
                                        }}
                                    >
                                        {index + 1}
                                    </Avatar>
                                </div>
                                <div className="ranking-content">
                                    <div className="package-info">
                                        <Link
                                            to={`/package/${encodeURIComponent(item.packageName)}`}
                                            className="package-name"
                                        >
                                            {item.packageName}
                                        </Link>
                                        <Text className="package-description" type="secondary">
                                            {getPackageDescription(item.packageName)}
                                        </Text>
                                    </div>
                                </div>
                                <div className="ranking-metrics">
                                    <Tag 
                                        color={getCategoryColor(getPackageCategory(item.packageName))}
                                        className="category-tag"
                                    >
                                        {getPackageCategory(item.packageName)}
                                    </Tag>
                                    <div className="class-count">
                                        <Text strong>{item.classCount}</Text>
                                        <Text type="secondary" style={{ fontSize: '12px' }}> classes</Text>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* 现代化样式 */}
            <style dangerouslySetInnerHTML={{__html: `
                .ultra-modern-home {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 24px;
                    min-height: 100vh;
                    background: #fafafa;
                }

                .loading-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 60vh;
                    text-align: center;
                }

                .loading-spinner {
                    margin-bottom: 24px;
                }

                .loading-icon {
                    font-size: 24px;
                    color: #1677ff;
                }

                .loading-text {
                    width: 300px;
                }

                .hero-section {
                    position: relative;
                    text-align: center;
                    padding: 60px 0 40px;
                    margin: -24px -24px 40px -24px;
                    background: linear-gradient(135deg,rgb(255, 255rgb(255, 255, 255)%, #69c0ff 100%);
                    border-radius: 0 0 16px 16px;
                }

                .hero-background {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    opacity: 0.1;
                }

                .hero-pattern {
                    width: 100%;
                    height: 100%;
                    background-image: 
                        radial-gradient(circle at 25% 25%, #fff 2px, transparent 2px),
                        radial-gradient(circle at 75% 75%, #fff 1px, transparent 1px);
                    background-size: 50px 50px;
                    animation: float 20s ease-in-out infinite;
                }

                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }

                .hero-content {
                    position: relative;
                    z-index: 2;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 0 24px;
                }

                .hero-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 12px;
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 12px;
                    color: white;
                    font-size: 13px;
                    font-weight: 500;
                    margin-bottom: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                }

                .hero-title {
                    margin: 0 !important;
                    font-size: 42px !important;
                    font-weight: 700 !important;
                    color: white !important;
                    margin-bottom: 16px !important;
                    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                }

                .hero-subtitle {
                    font-size: 18px !important;
                    color: rgba(255, 255, 255, 0.9) !important;
                    line-height: 1.5 !important;
                    margin: 0 0 32px 0 !important;
                }

                .hero-metrics {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 24px;
                    padding: 20px;
                    background: rgba(255, 255, 255, 0.15);
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }

                .metric-item {
                    text-align: center;
                }

                .metric-number {
                    font-size: 28px;
                    font-weight: 700;
                    color: white;
                    line-height: 1;
                }

                .metric-label {
                    font-size: 13px;
                    color: rgba(255, 255, 255, 0.8);
                    margin-top: 4px;
                }

                .metric-divider {
                    width: 1px;
                    height: 32px;
                    background: rgba(255, 255, 255, 0.3);
                }

                .dashboard-section {
                    margin-bottom: 40px;
                }

                .dashboard-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 20px;
                }

                .dashboard-card {
                    position: relative;
                    padding: 24px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
                    border: 1px solid #f0f0f0;
                    transition: box-shadow 0.3s ease;
                }

                .dashboard-card:hover {
                    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
                }

                .card-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    color: white;
                    margin-bottom: 16px;
                }

                .dashboard-card.packages .card-icon {
                    background: #1677ff;
                }

                .dashboard-card.classes .card-icon {
                    background: #fa8c16;
                }

                .card-content {
                    position: relative;
                    z-index: 2;
                }

                .card-number {
                    font-size: 36px;
                    font-weight: 700;
                    color: #262626;
                    line-height: 1;
                    margin-bottom: 6px;
                }

                .card-label {
                    font-size: 16px;
                    font-weight: 600;
                    color: #262626;
                    margin-bottom: 4px;
                }

                .card-subtitle {
                    font-size: 13px;
                    color: #8c8c8c;
                }

                .card-accent {
                    position: absolute;
                    top: 0;
                    right: 0;
                    width: 100px;
                    height: 100px;
                    border-radius: 50%;
                    opacity: 0.1;
                    transform: translate(30px, -30px);
                }

                .dashboard-card.packages .card-accent {
                    background: linear-gradient(135deg, #1677ff, #40a9ff);
                }

                .dashboard-card.classes .card-accent {
                    background: linear-gradient(135deg, #fa8c16, #ffc53d);
                }

                .ranking-section {
                    margin-bottom: 40px;
                }

                .ranking-card {
                    border-radius: 12px;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
                    border: 1px solid #f0f0f0;
                    background: white;
                }

                .ranking-header {
                    padding: 20px 20px 0 20px;
                    border-bottom: 1px solid #f0f0f0;
                    margin-bottom: 12px;
                }

                .ranking-title {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 20px;
                    font-weight: 600;
                    color: #262626;
                    margin-bottom: 6px;
                }

                .ranking-title .anticon {
                    font-size: 20px;
                    color: #fa8c16;
                }

                .ranking-list {
                    padding: 0 20px 20px;
                }

                .ranking-item {
                    display: flex;
                    align-items: center;
                    padding: 16px;
                    margin-bottom: 8px;
                    background: #fafafa;
                    border-radius: 8px;
                    transition: all 0.2s ease;
                    border: 1px solid transparent;
                }

                .ranking-item:hover {
                    background: #f0f8ff;
                    border-color: #d9d9d9;
                    transform: translateX(2px);
                }

                .ranking-position {
                    margin-right: 16px;
                    flex-shrink: 0;
                }

                .rank-avatar {
                    font-weight: 600;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
                }

                .ranking-content {
                    flex: 1;
                    min-width: 0;
                }

                .package-info {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .package-name {
                    font-size: 14px;
                    font-weight: 600;
                    color: #262626 !important;
                    text-decoration: none !important;
                    font-family: 'JetBrains Mono', Monaco, 'Courier New', monospace;
                    display: block;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 400px;
                }

                .package-name:hover {
                    color: #1677ff !important;
                }

                .package-description {
                    font-size: 12px;
                    line-height: 1.3;
                }

                .ranking-metrics {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 6px;
                    flex-shrink: 0;
                }

                .category-tag {
                    border-radius: 6px !important;
                    font-weight: 500 !important;
                    font-size: 11px !important;
                }

                .class-count {
                    text-align: right;
                }

                @media (max-width: 768px) {
                    .ultra-modern-home {
                        padding: 0 16px;
                    }

                    .hero-section {
                        margin: -16px -16px 32px -16px;
                        padding: 48px 0 32px;
                    }

                    .hero-title {
                        font-size: 32px !important;
                    }

                    .hero-metrics {
                        flex-direction: column;
                        gap: 12px;
                    }

                    .metric-divider {
                        width: 40px;
                        height: 1px;
                    }

                    .dashboard-grid {
                        grid-template-columns: 1fr;
                    }

                    .ranking-item {
                        padding: 12px;
                    }

                    .package-name {
                        max-width: 200px;
                        font-size: 13px;
                    }

                    .ranking-metrics {
                        flex-direction: row;
                        align-items: center;
                    }
                }
            `}} />
        </div>
    );
};
