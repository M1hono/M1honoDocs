import React, { useState, useEffect } from 'react';
import { Card, Typography, Tag, Collapse, Button, Space, List, Input, Spin, Tabs, Table, Badge, Avatar } from 'antd';
import { CodeOutlined, BookOutlined, FileTextOutlined, LinkOutlined, ApiOutlined, FieldTimeOutlined, OrderedListOutlined, TagOutlined } from '@ant-design/icons';
import { JavaClassDoc, JavaMethodDoc, JavaFieldDoc, ProjectDocIndex } from '../types';
import { CrossReferenceAnalyzer, ClassUsage, MethodUsage, CrossReference } from '../utils/crossReferenceAnalyzer';
import { JavaDocNavigation } from './JavaDocNavigation';
import { CodeEditor } from './CodeEditor';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { TabPane } = Tabs;

interface JavaDocViewerProps {
  docIndex: ProjectDocIndex | null;
  onViewSource?: (filePath: string, lineStart?: number, lineEnd?: number) => void;
}

/**
 * 增强的 JavaDoc 浏览器
 * 提供传统 JavaDoc 风格的界面，支持交叉引用分析
 */
export const JavaDocViewer: React.FC<JavaDocViewerProps> = ({ docIndex, onViewSource }) => {
  const [selectedClass, setSelectedClass] = useState<JavaClassDoc | null>(null);
  const [viewMode, setViewMode] = useState<'doc' | 'source' | 'usage'>('doc');
  const [sourceCode, setSourceCode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [crossRefAnalyzer, setCrossRefAnalyzer] = useState<CrossReferenceAnalyzer | null>(null);
  const [classUsage, setClassUsage] = useState<ClassUsage | null>(null);
  const [methodUsages, setMethodUsages] = useState<Map<string, MethodUsage>>(new Map());
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // 初始化交叉引用分析器
  useEffect(() => {
    if (docIndex) {
      setCrossRefAnalyzer(new CrossReferenceAnalyzer(docIndex));
    }
  }, [docIndex]);

  /**
   * 加载源码文件
   */
  const loadSourceCode = async (filePath: string) => {
    setLoading(true);
    try {
      const response = await fetch(filePath);
      if (response.ok) {
        const code = await response.text();
        setSourceCode(code);
      } else {
        setSourceCode('// 无法加载源码文件');
      }
    } catch (error) {
      setSourceCode('// 加载源码时出错: ' + error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 选择类并分析使用情况
   */
  const handleClassSelect = async (classDoc: JavaClassDoc) => {
    setSelectedClass(classDoc);
    setViewMode('doc');
    await loadSourceCode(classDoc.filePath);
    
    // 异步分析使用情况
    if (crossRefAnalyzer) {
      setAnalysisLoading(true);
      try {
        const usage = await crossRefAnalyzer.analyzeClassUsage(classDoc.fullName);
        setClassUsage(usage);
        
        // 分析重要方法的使用情况
        const methodUsageMap = new Map<string, MethodUsage>();
        for (const method of classDoc.methods.slice(0, 5)) { // 只分析前5个方法
          const methodUsage = await crossRefAnalyzer.analyzeMethodUsage(classDoc.fullName, method.name);
          methodUsageMap.set(method.name, methodUsage);
        }
        setMethodUsages(methodUsageMap);
      } catch (error) {
        console.error('分析使用情况失败:', error);
      } finally {
        setAnalysisLoading(false);
      }
    }
  };

  /**
   * 渲染修饰符标签
   */
  const renderModifiers = (modifiers: string[]) => {
    const colorMap: Record<string, string> = {
      public: 'green',
      private: 'red',
      protected: 'orange',
      static: 'blue',
      final: 'purple',
      abstract: 'magenta',
      synchronized: 'cyan',
      volatile: 'geekblue',
      transient: 'lime'
    };

    return modifiers.map((modifier) => (
      <Tag key={modifier} color={colorMap[modifier] || 'default'}>
        {modifier}
      </Tag>
    ));
  };

  /**
   * 渲染方法签名
   */
  const renderMethodSignature = (method: JavaMethodDoc) => {
    const params = method.parameters
      .map((p) => `${p.type} ${p.name}${p.isVarArgs ? '...' : ''}`)
      .join(', ');
    
    return (
      <div style={{ fontFamily: 'monospace', fontSize: '14px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <Text>
          {renderModifiers(method.modifiers)} 
          <Text strong style={{ color: '#1890ff' }}>{method.returnType}</Text>{' '}
          <Text strong>{method.name}</Text>
          <Text>(</Text>
          <Text type="secondary">{params}</Text>
          <Text>)</Text>
          {method.exceptions.length > 0 && (
            <>
              <Text> throws </Text>
              <Text type="warning">{method.exceptions.join(', ')}</Text>
            </>
          )}
        </Text>
      </div>
    );
  };

  /**
   * 渲染字段签名
   */
  const renderFieldSignature = (field: JavaFieldDoc) => {
    return (
      <div style={{ fontFamily: 'monospace', fontSize: '14px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <Text>
          {renderModifiers(field.modifiers)} 
          <Text strong style={{ color: '#1890ff' }}>{field.type}</Text>{' '}
          <Text strong>{field.name}</Text>
          {field.initialValue && (
            <>
              <Text> = </Text>
              <Text type="secondary">{field.initialValue}</Text>
            </>
          )}
        </Text>
      </div>
    );
  };

  /**
   * 渲染 JavaDoc 注释
   */
  const renderJavaDocComment = (comment?: string) => {
    if (!comment) return null;
    
    return (
      <div style={{ 
        background: '#f6f8fa', 
        padding: '12px', 
        borderRadius: '4px', 
        marginBottom: '12px',
        borderLeft: '4px solid #0969da'
      }}>
        <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
          {comment}
        </Paragraph>
      </div>
    );
  };

  /**
   * 渲染使用情况统计
   */
  const renderUsageStats = () => {
    if (!classUsage) return null;

    const columns = [
      {
        title: '引用类型',
        dataIndex: 'type',
        key: 'type',
        render: (type: string) => {
          const typeMap: Record<string, { label: string; color: string }> = {
            import: { label: 'Import', color: 'blue' },
            extends: { label: 'Extends', color: 'green' },
            implements: { label: 'Implements', color: 'orange' },
            field: { label: 'Field Type', color: 'purple' },
            method_call: { label: 'Method Call', color: 'red' },
            parameter: { label: 'Parameter', color: 'cyan' },
            return_type: { label: 'Return Type', color: 'magenta' }
          };
          const typeInfo = typeMap[type] || { label: type, color: 'default' };
          return <Tag color={typeInfo.color}>{typeInfo.label}</Tag>;
        }
      },
      {
        title: '引用次数',
        dataIndex: 'count',
        key: 'count',
        render: (count: number) => <Badge count={count} style={{ backgroundColor: '#52c41a' }} />
      },
      {
        title: '引用者',
        dataIndex: 'references',
        key: 'references',
        render: (references: CrossReference[]) => (
          <div>
            {references.slice(0, 3).map((ref, index) => (
              <div key={index}>
                <Button
                  type="link"
                  size="small"
                  onClick={() => {
                    if (onViewSource) {
                      onViewSource(ref.filePath, ref.location.line, ref.location.line);
                    }
                  }}
                >
                  {ref.referencedBy}
                </Button>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  (line {ref.location.line})
                </Text>
              </div>
            ))}
            {references.length > 3 && (
              <Text type="secondary">... 还有 {references.length - 3} 个引用</Text>
            )}
          </div>
        )
      }
    ];

    const dataSource = Array.from(classUsage.referencesByType.entries()).map(([type, refs]) => ({
      key: type,
      type,
      count: refs.length,
      references: refs
    }));

    return (
      <Card title="使用情况统计" size="small">
        <div style={{ marginBottom: '16px' }}>
          <Space>
            <Text strong>总引用次数:</Text>
            <Badge count={classUsage.totalReferences} style={{ backgroundColor: '#1890ff' }} />
            <Text strong>被引用的类数:</Text>
            <Badge count={classUsage.referencedByCount} style={{ backgroundColor: '#52c41a' }} />
          </Space>
        </div>
        <Table
          columns={columns}
          dataSource={dataSource}
          size="small"
          pagination={false}
        />
      </Card>
    );
  };

  /**
   * 渲染方法使用情况
   */
  const renderMethodUsage = (method: JavaMethodDoc) => {
    const usage = methodUsages.get(method.name);
    if (!usage || usage.totalCalls === 0) return null;

    return (
      <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
        <Space>
          <LinkOutlined style={{ color: '#1890ff' }} />
          <Text strong>被调用 {usage.totalCalls} 次</Text>
          <Text type="secondary">被 {usage.calledByCount} 个类调用</Text>
          <Button
            type="link"
            size="small"
            onClick={() => setViewMode('usage')}
          >
            查看详情
          </Button>
        </Space>
      </div>
    );
  };

  const enumConstants = selectedClass?.fields.filter(f => f.isEnumConstant) || [];
  const regularFields = selectedClass?.fields.filter(f => !f.isEnumConstant) || [];

  if (!docIndex) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>
          <Text>正在加载项目文档...</Text>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* 左侧导航 */}
      <div style={{ width: '320px', borderRight: '1px solid #d9d9d9' }}>
        <JavaDocNavigation
          docIndex={docIndex}
          onClassSelect={handleClassSelect}
          selectedClass={selectedClass}
        />
      </div>

      {/* 右侧内容 */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {selectedClass ? (
          <Tabs 
            activeKey={viewMode} 
            onChange={(key) => setViewMode(key as 'doc' | 'source' | 'usage')}
            style={{ height: '100%' }}
            tabBarExtraContent={
              analysisLoading && (
                <Spin size="small" />
              )
            }
          >
            <TabPane 
              tab={
                <span>
                  <BookOutlined />
                  文档
                </span>
              } 
              key="doc"
            >
              <div style={{ padding: '16px', overflow: 'auto', height: 'calc(100vh - 120px)' }}>
                {/* 类头部信息 */}
                <Card>
                  <div style={{ marginBottom: '16px' }}>
                    <Space align="start">
                      <ApiOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                      <div>
                        <Title level={2} style={{ margin: 0 }}>
                          {selectedClass.className}
                        </Title>
                        <Text type="secondary">{selectedClass.fullName}</Text>
                      </div>
                    </Space>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    {renderModifiers(selectedClass.modifiers)}
                  </div>

                  {selectedClass.superClass && (
                    <div style={{ marginBottom: '8px' }}>
                      <Text strong>继承: </Text>
                      <Text code>{selectedClass.superClass}</Text>
                    </div>
                  )}

                  {selectedClass.interfaces.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <Text strong>实现接口: </Text>
                      {selectedClass.interfaces.map((intf, index) => (
                        <Text key={index} code style={{ marginRight: '8px' }}>
                          {intf}
                        </Text>
                      ))}
                    </div>
                  )}

                  <div style={{ marginBottom: '8px' }}>
                    <Text strong>源文件: </Text>
                    <Button
                      type="link"
                      size="small"
                      icon={<FileTextOutlined />}
                      onClick={() => setViewMode('source')}
                    >
                      {selectedClass.filePath}
                    </Button>
                  </div>

                  {classUsage && (
                    <div>
                      <Text strong>使用统计: </Text>
                      <Space>
                        <Badge count={classUsage.totalReferences} style={{ backgroundColor: '#1890ff' }} />
                        <Text type="secondary">次引用</Text>
                        <Badge count={classUsage.referencedByCount} style={{ backgroundColor: '#52c41a' }} />
                        <Text type="secondary">个类引用</Text>
                      </Space>
                    </div>
                  )}
                </Card>

                {/* KubeJS 支持 */}
                <Card 
                  title={
                    <Space>
                      <CodeOutlined style={{ color: '#fa8c16' }} />
                      KubeJS 支持
                    </Space>
                  } 
                  size="small" 
                  style={{ marginTop: '16px' }}
                >
                  <div style={{ marginBottom: '12px' }}>
                    <Text strong>在 KubeJS 中引用此类：</Text>
                  </div>
                  <div style={{ 
                    background: '#f5f5f5', 
                    padding: '12px', 
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    marginBottom: '8px',
                    position: 'relative'
                  }}>
                    <Text copyable={{ 
                      text: `const $${selectedClass.className} = Java.loadClass('${selectedClass.fullName.replace(/\./g, '$')}')`,
                      tooltips: ['点击复制', '复制成功']
                    }}>
                      const ${selectedClass.className} = Java.loadClass('${selectedClass.fullName.replace(/\./g, '$')}')
                    </Text>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    <Text type="secondary">
                      💡 提示：KubeJS 中内部类使用 <Text code>$</Text> 符号分隔，而不是 <Text code>.</Text>
                    </Text>
                  </div>
                  {selectedClass.innerClasses && selectedClass.innerClasses.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <Text strong style={{ fontSize: '12px' }}>内部类引用示例：</Text>
                      {selectedClass.innerClasses.slice(0, 3).map((innerClass, index) => (
                        <div key={index} style={{ 
                          background: '#f9f9f9', 
                          padding: '8px', 
                          borderRadius: '4px',
                          fontFamily: 'monospace',
                          fontSize: '12px',
                          marginTop: '4px'
                        }}>
                          <Text copyable={{ 
                            text: `const $${innerClass.className} = Java.loadClass('${innerClass.fullName.replace(/\./g, '$')}')`,
                            tooltips: ['点击复制', '复制成功']
                          }}>
                            const ${innerClass.className} = Java.loadClass('${innerClass.fullName.replace(/\./g, '$')}')
                          </Text>
                        </div>
                      ))}
                      {selectedClass.innerClasses.length > 3 && (
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          ... 还有 {selectedClass.innerClasses.length - 3} 个内部类
                        </Text>
                      )}
                    </div>
                  )}
                </Card>

                {/* 类描述 */}
                {selectedClass.classComment && (
                  <Card title="类描述" size="small" style={{ marginTop: '16px' }}>
                    {renderJavaDocComment(selectedClass.classComment)}
                  </Card>
                )}

                {/* Enum Constants */}
                {selectedClass.classType === 'enum' && enumConstants.length > 0 && (
                    <Card
                        title={
                            <Space>
                                <OrderedListOutlined />
                                Enum Constants ({enumConstants.length})
                            </Space>
                        }
                        size="small"
                        style={{ marginTop: '16px' }}
                    >
                        <List
                            size="small"
                            dataSource={enumConstants}
                            renderItem={item => (
                                <List.Item>
                                    <List.Item.Meta
                                        avatar={<Avatar icon={<TagOutlined />} />}
                                        title={<Text strong>{item.name}</Text>}
                                        description={renderJavaDocComment(item.comment)}
                                    />
                                </List.Item>
                            )}
                        />
                    </Card>
                )}

                {/* Fields */}
                {regularFields.length > 0 && (
                  <Card 
                    title={
                      <Space>
                        <FieldTimeOutlined />
                        Fields ({regularFields.length})
                      </Space>
                    } 
                    size="small" 
                    style={{ marginTop: '16px' }}
                  >
                    <Collapse size="small">
                      {regularFields.map((field, index) => (
                        <Panel
                          header={
                            <Space>
                              <Text strong>{field.name}</Text>
                              <Text type="secondary">: {field.type}</Text>
                            </Space>
                          }
                          key={index}
                        >
                          {renderFieldSignature(field)}
                          {renderJavaDocComment(field.comment)}
                        </Panel>
                      ))}
                    </Collapse>
                  </Card>
                )}

                {/* 方法 */}
                {selectedClass.methods.length > 0 && (
                  <Card 
                    title={
                      <Space>
                        <CodeOutlined />
                        方法 ({selectedClass.methods.length})
                      </Space>
                    } 
                    size="small" 
                    style={{ marginTop: '16px' }}
                  >
                    <Collapse size="small">
                      {selectedClass.methods.map((method, index) => (
                        <Panel
                          header={
                            <Space>
                              <Text strong>{method.name}</Text>
                              <Text type="secondary">
                                ({method.parameters.length} 参数)
                              </Text>
                            </Space>
                          }
                          key={index}
                        >
                          {renderMethodSignature(method)}
                          {renderJavaDocComment(method.comment)}
                          {renderMethodUsage(method)}
                        </Panel>
                      ))}
                    </Collapse>
                  </Card>
                )}

                {/* 内部类 */}
                {selectedClass.innerClasses && selectedClass.innerClasses.length > 0 && (
                  <Card 
                    title={
                      <Space>
                        <ApiOutlined />
                        内部类 ({selectedClass.innerClasses.length})
                      </Space>
                    } 
                    size="small" 
                    style={{ marginTop: '16px' }}
                  >
                    <List
                      size="small"
                      dataSource={selectedClass.innerClasses}
                      renderItem={(innerClass, index) => (
                        <List.Item key={index}>
                          <Card 
                            size="small" 
                            style={{ width: '100%', cursor: 'pointer' }}
                            hoverable
                            onClick={() => {
                              console.log('Inner class selected:', innerClass.fullName);
                              handleClassSelect(innerClass);
                            }}
                          >
                            <div style={{ marginBottom: '8px' }}>
                              <Space>
                                <Text strong style={{ color: '#1890ff' }}>
                                  {innerClass.className}
                                </Text>
                                <Tag color={innerClass.classType === 'enum' ? 'orange' : 
                                           innerClass.classType === 'interface' ? 'blue' : 'green'}>
                                  {innerClass.classType || 'class'}
                                </Tag>
                              </Space>
                            </div>
                            
                            <div style={{ marginBottom: '8px' }}>
                              {renderModifiers(innerClass.modifiers)}
                            </div>

                            <div style={{ marginBottom: '8px' }}>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                {innerClass.fullName}
                              </Text>
                            </div>

                            {innerClass.classComment && (
                              <div style={{ 
                                background: '#f9f9f9', 
                                padding: '8px', 
                                borderRadius: '4px',
                                marginBottom: '8px' 
                              }}>
                                <Text style={{ fontSize: '12px' }}>
                                  {innerClass.classComment.length > 100 
                                    ? innerClass.classComment.substring(0, 100) + '...'
                                    : innerClass.classComment
                                  }
                                </Text>
                              </div>
                            )}

                            <div>
                              <Space>
                                <Badge 
                                  count={innerClass.fields?.length || 0} 
                                  size="small"
                                  style={{ backgroundColor: '#52c41a' }}
                                />
                                <Text type="secondary" style={{ fontSize: '12px' }}>字段</Text>
                                <Badge 
                                  count={innerClass.methods?.length || 0} 
                                  size="small"
                                  style={{ backgroundColor: '#1890ff' }}
                                />
                                <Text type="secondary" style={{ fontSize: '12px' }}>方法</Text>
                                {innerClass.innerClasses && innerClass.innerClasses.length > 0 && (
                                  <>
                                    <Badge 
                                      count={innerClass.innerClasses.length} 
                                      size="small"
                                      style={{ backgroundColor: '#fa8c16' }}
                                    />
                                    <Text type="secondary" style={{ fontSize: '12px' }}>内部类</Text>
                                  </>
                                )}
                              </Space>
                            </div>
                          </Card>
                        </List.Item>
                      )}
                    />
                  </Card>
                )}
              </div>
            </TabPane>
            
            <TabPane 
              tab={
                <span>
                  <CodeOutlined />
                  源码
                </span>
              } 
              key="source"
            >
              <div style={{ height: 'calc(100vh - 120px)' }}>
                <CodeEditor
                  file={{
                    name: selectedClass.className + '.java',
                    path: selectedClass.filePath,
                    type: 'file'
                  }}
                  content={sourceCode}
                  isLoading={loading}
                />
              </div>
            </TabPane>

            <TabPane 
              tab={
                <span>
                  <LinkOutlined />
                  使用情况
                  {classUsage && (
                    <Badge 
                      count={classUsage.totalReferences} 
                      size="small" 
                      style={{ marginLeft: '8px' }} 
                    />
                  )}
                </span>
              } 
              key="usage"
            >
              <div style={{ padding: '16px', overflow: 'auto', height: 'calc(100vh - 120px)' }}>
                {analysisLoading ? (
                  <div style={{ textAlign: 'center', padding: '48px' }}>
                    <Spin size="large" tip="分析使用情况..." />
                  </div>
                ) : (
                  classUsage && renderUsageStats()
                )}
              </div>
            </TabPane>
          </Tabs>
        ) : (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            flexDirection: 'column'
          }}>
            <BookOutlined style={{ fontSize: '64px', color: '#d9d9d9' }} />
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <Title level={4} type="secondary">
                JavaDoc 文档浏览器
              </Title>
              <Text type="secondary">
                从左侧选择一个类来查看详细文档
              </Text>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 