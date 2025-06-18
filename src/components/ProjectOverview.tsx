import React, { useState, useEffect } from "react";
import {
    Card,
    Typography,
    Space,
    Badge,
    List,
    Button,
    Progress,
    Divider,
    Tag,
} from "antd";
import {
    FolderOutlined,
    ApiOutlined,
    CodeOutlined,
    FieldTimeOutlined,
    FireOutlined,
    FileTextOutlined,
} from "@ant-design/icons";
import { ProjectDocIndex } from "../types";
import { CrossReferenceAnalyzer } from "../utils/crossReferenceAnalyzer";

const { Title, Text, Paragraph } = Typography;

interface ProjectOverviewProps {
    docIndex: ProjectDocIndex | null;
}

/**
 * 项目概览组件
 * 显示项目的统计信息、热门类等
 */
export const ProjectOverview: React.FC<ProjectOverviewProps> = ({
    docIndex,
}) => {
    const [stats, setStats] = useState({
        packages: 0,
        classes: 0,
        methods: 0,
        fields: 0,
        packageStats: [] as { packageName: string; classCount: number }[],
    });
    const [popularClasses, setPopularClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (docIndex) {
            calculateStats();
            analyzePopularClasses();
        }
    }, [docIndex]);

    /**
     * 计算项目统计信息
     */
    const calculateStats = () => {
        if (!docIndex) return;

        let totalMethods = 0;
        let totalFields = 0;

        for (const classDoc of docIndex.classes.values()) {
            totalMethods += classDoc.methods.length;
            totalFields += classDoc.fields.length;
        }

        const packageStats: { packageName: string; classCount: number }[] = [];
        for (const [packageName, classes] of docIndex.packages.entries()) {
            packageStats.push({
                packageName,
                classCount: classes.length,
            });
        }

        // 按类数量排序
        packageStats.sort((a, b) => b.classCount - a.classCount);

        setStats({
            packages: docIndex.packages.size,
            classes: docIndex.classes.size,
            methods: totalMethods,
            fields: totalFields,
            packageStats: packageStats.slice(0, 10), // 只显示前10个包
        });
    };

    /**
     * 分析热门类（简单版本，基于方法和字段数量）
     */
    const analyzePopularClasses = async () => {
        if (!docIndex) return;

        setLoading(true);
        try {
            const classesWithScore: {
                className: string;
                score: number;
                methods: number;
                fields: number;
            }[] = [];

            for (const [className, classDoc] of docIndex.classes) {
                // 简单的评分算法：方法数 * 2 + 字段数
                const score =
                    classDoc.methods.length * 2 + classDoc.fields.length;
                classesWithScore.push({
                    className,
                    score,
                    methods: classDoc.methods.length,
                    fields: classDoc.fields.length,
                });
            }

            // 按分数排序，取前10个
            classesWithScore.sort((a, b) => b.score - a.score);
            setPopularClasses(classesWithScore.slice(0, 10));
        } catch (error) {
            console.error("分析热门类失败:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!docIndex) {
        return (
            <div style={{ padding: "24px", textAlign: "center" }}>
                <Text type="secondary">正在加载项目信息...</Text>
            </div>
        );
    }

    return (
        <div style={{ padding: "24px" }}>
            {/* 项目标题 */}
            <div style={{ marginBottom: "24px", textAlign: "center" }}>
                <Title level={2}>🎮 Minecraft JavaDoc 文档</Title>
                <Paragraph style={{ fontSize: "16px", color: "#666" }}>
                    自动从源码生成的 JavaDoc 风格文档，支持交叉引用分析
                </Paragraph>
            </div>

            {/* 统计卡片 */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "16px",
                    marginBottom: "24px",
                }}
            >
                <Card>
                    <Space>
                        <FolderOutlined
                            style={{ fontSize: "24px", color: "#1890ff" }}
                        />
                        <div>
                            <div
                                style={{ fontSize: "24px", fontWeight: "bold" }}
                            >
                                {stats.packages}
                            </div>
                            <Text type="secondary">包</Text>
                        </div>
                    </Space>
                </Card>

                <Card>
                    <Space>
                        <ApiOutlined
                            style={{ fontSize: "24px", color: "#fa8c16" }}
                        />
                        <div>
                            <div
                                style={{ fontSize: "24px", fontWeight: "bold" }}
                            >
                                {stats.classes}
                            </div>
                            <Text type="secondary">类</Text>
                        </div>
                    </Space>
                </Card>

                <Card>
                    <Space>
                        <CodeOutlined
                            style={{ fontSize: "24px", color: "#52c41a" }}
                        />
                        <div>
                            <div
                                style={{ fontSize: "24px", fontWeight: "bold" }}
                            >
                                {stats.methods}
                            </div>
                            <Text type="secondary">方法</Text>
                        </div>
                    </Space>
                </Card>

                <Card>
                    <Space>
                        <FieldTimeOutlined
                            style={{ fontSize: "24px", color: "#eb2f96" }}
                        />
                        <div>
                            <div
                                style={{ fontSize: "24px", fontWeight: "bold" }}
                            >
                                {stats.fields}
                            </div>
                            <Text type="secondary">字段</Text>
                        </div>
                    </Space>
                </Card>
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "24px",
                }}
            >
                {/* 包统计 */}
                <Card
                    title={
                        <Space>
                            <FolderOutlined />
                            包统计 (Top 10)
                        </Space>
                    }
                    size="small"
                >
                    <List
                        size="small"
                        dataSource={stats.packageStats}
                        renderItem={(item, index) => (
                            <List.Item>
                                <Space
                                    style={{
                                        width: "100%",
                                        justifyContent: "space-between",
                                    }}
                                >
                                    <Space>
                                        <Badge
                                            count={index + 1}
                                            style={{
                                                backgroundColor: "#1890ff",
                                            }}
                                        />
                                        <Text
                                            style={{ fontFamily: "monospace" }}
                                        >
                                            {item.packageName}
                                        </Text>
                                    </Space>
                                    <Badge
                                        count={item.classCount}
                                        style={{ backgroundColor: "#52c41a" }}
                                    />
                                </Space>
                            </List.Item>
                        )}
                    />
                </Card>

                {/* 热门类 */}
                <Card
                    title={
                        <Space>
                            <FireOutlined />
                            热门类 (Top 10)
                        </Space>
                    }
                    size="small"
                    loading={loading}
                >
                    <List
                        size="small"
                        dataSource={popularClasses}
                        renderItem={(item, index) => (
                            <List.Item>
                                <Space
                                    style={{
                                        width: "100%",
                                        justifyContent: "space-between",
                                    }}
                                >
                                    <Space>
                                        <Badge
                                            count={index + 1}
                                            style={{
                                                backgroundColor: "#fa8c16",
                                            }}
                                        />
                                        <div>
                                            <Text strong>
                                                {item.className
                                                    .split(".")
                                                    .pop()}
                                            </Text>
                                            <br />
                                            <Text
                                                type="secondary"
                                                style={{ fontSize: "12px" }}
                                            >
                                                {item.methods}个方法,{" "}
                                                {item.fields}个字段
                                            </Text>
                                        </div>
                                    </Space>
                                    <Text type="secondary">
                                        评分: {item.score}
                                    </Text>
                                </Space>
                            </List.Item>
                        )}
                    />
                </Card>
            </div>

            {/* 功能介绍 */}
            <Card title="功能特性" style={{ marginTop: "24px" }}>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fit, minmax(300px, 1fr))",
                        gap: "16px",
                    }}
                >
                    <div>
                        <Space>
                            <ApiOutlined style={{ color: "#1890ff" }} />
                            <Text strong>自动解析</Text>
                        </Space>
                        <Paragraph
                            style={{ marginTop: "8px", marginLeft: "24px" }}
                        >
                            自动扫描 Java 源码，解析类、方法、字段和 JavaDoc
                            注释
                        </Paragraph>
                    </div>

                    <div>
                        <Space>
                            <FileTextOutlined style={{ color: "#52c41a" }} />
                            <Text strong>交叉引用</Text>
                        </Space>
                        <Paragraph
                            style={{ marginTop: "8px", marginLeft: "24px" }}
                        >
                            分析类和方法的使用情况，找出谁在使用某个类或方法
                        </Paragraph>
                    </div>

                    <div>
                        <Space>
                            <CodeOutlined style={{ color: "#fa8c16" }} />
                            <Text strong>源码查看</Text>
                        </Space>
                        <Paragraph
                            style={{ marginTop: "8px", marginLeft: "24px" }}
                        >
                            在文档和源码之间无缝切换，支持语法高亮
                        </Paragraph>
                    </div>

                    <div>
                        <Space>
                            <FolderOutlined style={{ color: "#eb2f96" }} />
                            <Text strong>包导航</Text>
                        </Space>
                        <Paragraph
                            style={{ marginTop: "8px", marginLeft: "24px" }}
                        >
                            类似传统 JavaDoc 的包/类层次结构导航
                        </Paragraph>
                    </div>
                </div>
            </Card>

            {/* 项目信息 */}
            <Card title="项目信息" style={{ marginTop: "24px" }}>
                <Space direction="vertical" style={{ width: "100%" }}>
                    <div>
                        <Text strong>包含项目:</Text>
                        <div style={{ marginTop: "8px" }}>
                            <Tag color="blue">KubeJS-2001</Tag>
                            <Tag color="green">forge-1.20.1-47.1.99</Tag>
                        </div>
                    </div>

                    <Divider />

                    <div>
                        <Text strong>支持的功能:</Text>
                        <ul style={{ marginTop: "8px", paddingLeft: "20px" }}>
                            <li>类、接口、枚举的文档生成</li>
                            <li>方法和字段的详细信息</li>
                            <li>JavaDoc 注释解析</li>
                            <li>继承关系和接口实现</li>
                            <li>使用情况分析和交叉引用</li>
                            <li>包结构导航</li>
                            <li>源码查看和语法高亮</li>
                        </ul>
                    </div>
                </Space>
            </Card>
        </div>
    );
};
