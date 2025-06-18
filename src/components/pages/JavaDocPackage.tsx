import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, Typography, Table, Tag, Space, Breadcrumb, Alert, Spin } from "antd";
import { FolderOutlined, ApiOutlined, HomeOutlined } from "@ant-design/icons";
import { ProjectDocIndex, JavaClassDoc } from "../../types";
import { PrebuiltDataLoader } from "../../utils/prebuiltDataLoader";

const { Title, Text, Paragraph } = Typography;

interface JavaDocPackageProps {
    docIndex: ProjectDocIndex | null;
}

/**
 * JavaDoc 包页面
 * 显示指定包的信息和包含的类列表
 */
export const JavaDocPackage: React.FC<JavaDocPackageProps> = ({ docIndex }) => {
    const { packageName: encodedPackageName } = useParams<{
        packageName: string;
    }>();
    const packageName = encodedPackageName
        ? decodeURIComponent(encodedPackageName)
        : "";

    // 状态管理
    const [classDocs, setClassDocs] = useState<JavaClassDoc[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 按需加载包的类数据
    useEffect(() => {
        const loadPackageData = async () => {
            if (!docIndex || !packageName) return;

            const classes = docIndex.packages.get(packageName);
            if (!classes) return;

            // 获取dataLoader实例
            const dataLoader = (docIndex as any).dataLoader as PrebuiltDataLoader;
            if (!dataLoader) {
                setError("数据加载器未初始化");
                return;
            }

            setLoading(true);
            setError(null);

            try {
                console.log(`📦 加载包 ${packageName} 的类数据...`);
                
                // 加载包的所有类数据
                const packageClasses = await dataLoader.loadPackageClasses(packageName);
                
                // 转换为数组并排序
                const classDocsArray = Array.from(packageClasses.values())
                    .sort((a, b) => a.className.localeCompare(b.className));

                setClassDocs(classDocsArray);
                console.log(`✅ 包 ${packageName} 加载完成: ${classDocsArray.length} 个类`);
            } catch (err) {
                console.error("加载包数据失败:", err);
                setError(err instanceof Error ? err.message : "加载失败");
            } finally {
                setLoading(false);
            }
        };

        loadPackageData();
    }, [docIndex, packageName]);

    if (!docIndex) {
        return (
            <Alert
                type="warning"
                message="文档未加载"
                description="请等待文档加载完成"
            />
        );
    }

    if (!packageName) {
        return (
            <Alert
                type="error"
                message="包名无效"
                description="无法解析包名参数"
            />
        );
    }

    const classes = docIndex.packages.get(packageName);

    if (!classes) {
        return (
            <Alert
                type="error"
                message="包不存在"
                description={`找不到包: ${packageName}`}
                action={
                    <Link to="/">
                        <span>返回首页</span>
                    </Link>
                }
            />
        );
    }

    if (error) {
        return (
            <Alert
                type="error"
                message="加载失败"
                description={error}
                action={
                    <Link to="/">
                        <span>返回首页</span>
                    </Link>
                }
            />
        );
    }

    /**
     * 生成面包屑导航
     */
    const generateBreadcrumb = () => {
        const parts = packageName.split(".");
        const breadcrumbItems = [
            {
                title: (
                    <Link to="/">
                        <HomeOutlined /> 首页
                    </Link>
                ),
            },
        ];

        let currentPath = "";
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            currentPath = currentPath ? `${currentPath}.${part}` : part;

            if (i === parts.length - 1) {
                // 当前包，不需要链接
                breadcrumbItems.push({
                    title: (
                        <Space>
                            <FolderOutlined />
                            {part}
                        </Space>
                    ),
                });
            } else {
                // 父包，添加链接
                breadcrumbItems.push({
                    title: (
                        <Link
                            to={`/package/${encodeURIComponent(currentPath)}`}
                        >
                            <FolderOutlined /> {part}
                        </Link>
                    ),
                });
            }
        }

        return breadcrumbItems;
    };

    /**
     * 生成表格列定义
     */
    const columns = [
        {
            title: "类型",
            dataIndex: "classType",
            key: "classType",
            width: 80,
            render: (classType: string) => {
                const typeMap: Record<
                    string,
                    { label: string; color: string }
                > = {
                    class: { label: "Class", color: "blue" },
                    interface: { label: "Interface", color: "green" },
                    enum: { label: "Enum", color: "orange" },
                    record: { label: "Record", color: "purple" },
                    "@interface": { label: "Annotation", color: "magenta" },
                };
                const type = typeMap[classType] || {
                    label: classType || "Class",
                    color: "default",
                };
                return <Tag color={type.color}>{type.label}</Tag>;
            },
        },
        {
            title: "类名",
            dataIndex: "className",
            key: "className",
            render: (className: string, record: JavaClassDoc) => (
                <div>
                    <Link to={`/class/${encodeURIComponent(record.fullName)}`}>
                        <Text strong>{className}</Text>
                    </Link>
                    {record.classComment && (
                        <div
                            style={{
                                fontSize: "12px",
                                color: "#666",
                                marginTop: "4px",
                            }}
                        >
                            {record.classComment
                                .split("\n")[0]
                                .substring(0, 100)}
                            {record.classComment.length > 100 && "..."}
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: "修饰符",
            dataIndex: "modifiers",
            key: "modifiers",
            width: 120,
            render: (modifiers: string[]) => (
                <Space wrap>
                    {modifiers.map((modifier) => {
                        const colorMap: Record<string, string> = {
                            public: "green",
                            private: "red",
                            protected: "orange",
                            static: "blue",
                            final: "purple",
                            abstract: "magenta",
                        };
                        return (
                            <Tag
                                key={modifier}
                                color={colorMap[modifier] || "default"}
                            >
                                {modifier}
                            </Tag>
                        );
                    })}
                </Space>
            ),
        },
        {
            title: "继承",
            dataIndex: "superClass",
            key: "superClass",
            width: 150,
            render: (superClass: string) => {
                if (!superClass || superClass === "Object") return null;

                // 尝试在当前加载的类中找到父类
                const parentClassDoc = classDocs.find(
                    (cls) =>
                        cls.className === superClass ||
                        cls.fullName === superClass
                );

                if (parentClassDoc) {
                    return (
                        <Link
                            to={`/class/${encodeURIComponent(
                                parentClassDoc.fullName
                            )}`}
                        >
                            <Text code>{superClass}</Text>
                        </Link>
                    );
                }

                return <Text code>{superClass}</Text>;
            },
        },
        {
            title: "统计",
            key: "stats",
            width: 120,
            render: (_: any, record: JavaClassDoc) => (
                <Space>
                    <Tag color="blue">{record.methods.length}m</Tag>
                    <Tag color="orange">{record.fields.length}f</Tag>
                </Space>
            ),
        },
    ];

    const breadcrumbItems = generateBreadcrumb();

    return (
        <div>
            {/* 面包屑导航 */}
            <Breadcrumb
                items={breadcrumbItems}
                style={{ marginBottom: "16px" }}
            />

            {/* 包标题和信息 */}
            <Card style={{ marginBottom: "24px" }}>
                <Space align="start">
                    <FolderOutlined
                        style={{ fontSize: "32px", color: "#1890ff" }}
                    />
                    <div>
                        <Title level={2} style={{ margin: 0 }}>
                            package {packageName}
                        </Title>
                        <Text type="secondary">
                            {loading ? "正在加载..." : `包含 ${classDocs.length} 个类`}
                        </Text>
                    </div>
                </Space>

                {/* 包统计信息 */}
                {!loading && (
                    <div style={{ marginTop: "16px" }}>
                        <Space size="large">
                            <div>
                                <Text strong>类:</Text>{" "}
                                {
                                    classDocs.filter(
                                        (c) =>
                                            c.classType === "class" || !c.classType
                                    ).length
                                }
                            </div>
                            <div>
                                <Text strong>接口:</Text>{" "}
                                {
                                    classDocs.filter(
                                        (c) => c.classType === "interface"
                                    ).length
                                }
                            </div>
                            <div>
                                <Text strong>枚举:</Text>{" "}
                                {
                                    classDocs.filter((c) => c.classType === "enum")
                                        .length
                                }
                            </div>
                            <div>
                                <Text strong>总方法:</Text>{" "}
                                {classDocs.reduce(
                                    (sum, c) => sum + c.methods.length,
                                    0
                                )}
                            </div>
                            <div>
                                <Text strong>总字段:</Text>{" "}
                                {classDocs.reduce(
                                    (sum, c) => sum + c.fields.length,
                                    0
                                )}
                            </div>
                        </Space>
                    </div>
                )}
            </Card>

            {/* 类列表表格 */}
            <Card
                title={
                    <Space>
                        <ApiOutlined />
                        类列表
                        {loading && <Spin size="small" />}
                    </Space>
                }
            >
                <Table
                    dataSource={classDocs}
                    columns={columns}
                    rowKey="fullName"
                    loading={loading}
                    pagination={{
                        pageSize: 20,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total) => `共 ${total} 个类`,
                    }}
                    size="small"
                />
            </Card>

            {/* 相关包 */}
            {packageName && (
                <Card title="相关包" style={{ marginTop: "24px" }} size="small">
                    <div>
                        <Space wrap>
                            {/* 显示子包 */}
                            {Array.from(docIndex.packages.keys())
                                .filter(
                                    (pkg) =>
                                        pkg.startsWith(packageName + ".") &&
                                        pkg !== packageName
                                )
                                .slice(0, 10)
                                .map((subPackage) => (
                                    <Link
                                        key={subPackage}
                                        to={`/package/${encodeURIComponent(
                                            subPackage
                                        )}`}
                                    >
                                        <Tag icon={<FolderOutlined />}>
                                            {subPackage.replace(
                                                packageName + ".",
                                                ""
                                            )}
                                        </Tag>
                                    </Link>
                                ))}

                            {/* 显示兄弟包 */}
                            {packageName.includes(".") && (
                                <>
                                    {Array.from(docIndex.packages.keys())
                                        .filter((pkg) => {
                                            const parentPkg =
                                                packageName.substring(
                                                    0,
                                                    packageName.lastIndexOf(".")
                                                );
                                            return (
                                                pkg.startsWith(
                                                    parentPkg + "."
                                                ) &&
                                                pkg !== packageName &&
                                                !pkg.startsWith(
                                                    packageName + "."
                                                ) &&
                                                pkg.split(".").length ===
                                                    packageName.split(".")
                                                        .length
                                            );
                                        })
                                        .slice(0, 5)
                                        .map((siblingPackage) => (
                                            <Link
                                                key={siblingPackage}
                                                to={`/package/${encodeURIComponent(
                                                    siblingPackage
                                                )}`}
                                            >
                                                <Tag>
                                                    {siblingPackage
                                                        .split(".")
                                                        .pop()}
                                                </Tag>
                                            </Link>
                                        ))}
                                </>
                            )}
                        </Space>
                    </div>
                </Card>
            )}
        </div>
    );
};
 