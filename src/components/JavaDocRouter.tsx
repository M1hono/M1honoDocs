import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout, Spin, Alert } from 'antd';
import { ProjectDocIndex } from '../types';
import { JavaDocHome } from './pages/JavaDocHome';
import { JavaDocPackage } from './pages/JavaDocPackage';
import { JavaDocClass } from './pages/JavaDocClass';
import { JavaDocNavbar } from './JavaDocNavbar';
import { JavaDocSidebar } from './JavaDocSidebar';

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
}

/**
 * JavaDoc 路由系统
 * 模仿传统 JavaDoc 的 URL 结构，修复布局和滚动问题
 */
export const JavaDocRouter: React.FC<JavaDocRouterProps> = ({
  docIndex,
  loading,
  error,
  onRegenerate
}) => {
  
  // 如果正在加载，显示加载界面
  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '48px',
          borderRadius: '16px',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
          maxWidth: '500px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '24px' }}>🎮</div>
          <h2 style={{ marginBottom: '16px', color: '#1677ff' }}>Minecraft JavaDoc 浏览器</h2>
          <Spin size="large" />
          <p style={{ marginTop: '16px', color: '#666' }}>正在生成文档数据...</p>
          <p style={{ fontSize: '14px', color: '#999', marginTop: '8px' }}>
            生成数百个类和方法，请稍候...
          </p>
        </div>
      </div>
    );
  }

  // 如果有错误，显示错误界面
  if (error) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '24px',
        background: '#f5f5f5'
      }}>
        <div style={{ maxWidth: '600px', width: '100%' }}>
          <Alert
            type="error"
            message="文档生成失败"
            description={
              <div>
                <p>{error}</p>
                <p style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
                  请检查控制台查看详细错误信息，或尝试重新生成文档。
                </p>
              </div>
            }
            showIcon
            action={
              <button 
                onClick={onRegenerate} 
                style={{
                  background: '#1677ff',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
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
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f5f5f5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
          <h3 style={{ color: '#1677ff' }}>欢迎使用 Minecraft JavaDoc 浏览器</h3>
          <p style={{ color: '#666' }}>正在准备文档数据...</p>
        </div>
      </div>
    );
  }

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <Layout style={{ height: '100vh', overflow: 'hidden' }}>
        {/* 顶部导航栏 - 固定 */}
        <Header style={{ 
          background: '#fff', 
          borderBottom: '1px solid #e8e8e8',
          padding: '0 24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          position: 'relative',
          zIndex: 1001,
          height: '64px',
          lineHeight: '64px'
        }}>
          <JavaDocNavbar 
            docIndex={docIndex}
            loading={loading}
            onRegenerate={onRegenerate}
          />
        </Header>

        <Layout style={{ height: 'calc(100vh - 64px)' }}>
          {/* 左侧边栏 - 固定 */}
          <Sider 
            width={300} 
            style={{ 
              background: '#fff',
              borderRight: '1px solid #e8e8e8',
              height: '100%',
              position: 'relative',
              zIndex: 1000
            }}
          >
            <div style={{ height: '100%', overflow: 'hidden' }}>
              <JavaDocSidebar docIndex={docIndex} />
            </div>
          </Sider>

          {/* 主内容区域 - 可滚动 */}
          <Layout style={{ background: '#fff' }}>
            <Content style={{ 
              height: '100%',
              overflow: 'auto', // 这里启用滚动
              background: '#fff'
            }}>
              <div style={{ 
                padding: '24px',
                minHeight: '100%'
              }}>
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
                      <JavaDocPackage docIndex={docIndex} />
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
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </Content>
          </Layout>
        </Layout>
      </Layout>
    </Router>
  );
}; 