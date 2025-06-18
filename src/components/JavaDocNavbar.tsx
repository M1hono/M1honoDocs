import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input, Button, Space, AutoComplete, Spin, Typography, Divider } from 'antd';
import { 
    SearchOutlined, 
    HomeOutlined, 
    ReloadOutlined, 
    ApiOutlined,
    FolderOutlined
} from '@ant-design/icons';
import { ProjectDocIndex } from '../types';

const { Search } = Input;
const { Text } = Typography;

interface JavaDocNavbarProps {
  docIndex: ProjectDocIndex | null;
  loading: boolean;
  onRegenerate: () => void;
}

/**
 * 现代化 JavaDoc 导航栏
 * 提供智能搜索功能和现代化设计
 */
export const JavaDocNavbar: React.FC<JavaDocNavbarProps> = ({
  docIndex,
  loading,
  onRegenerate
}) => {
  const navigate = useNavigate();
  const [searchOptions, setSearchOptions] = useState<{ value: string; label: React.ReactNode }[]>([]);

  // 构建搜索索引
  const searchIndex = useMemo(() => {
    if (!docIndex) return { classes: [], packages: [] };
    
    const classes: Array<{ name: string; fullName: string; packageName: string }> = [];
    const packages: Array<{ name: string; fullName: string; classCount: number }> = [];
    
    // 从包数据构建类索引 - 修复版
    for (const [packageName, classList] of docIndex.packages.entries()) {
      // 添加包到索引
      packages.push({
        name: packageName.split('.').pop() || packageName,
        fullName: packageName,
        classCount: classList.length
      });
      
      // 添加包中的所有类到索引
      for (const fullClassName of classList) {
        // 提取简单类名
        const classNameParts = fullClassName.split('.');
        const className = classNameParts[classNameParts.length - 1] || fullClassName;
        
        classes.push({
          name: className,
          fullName: fullClassName,
          packageName: packageName
        });
      }
    }
    
    console.log(`🔍 搜索索引构建完成: ${classes.length} 个类, ${packages.length} 个包`);
    return { classes, packages };
  }, [docIndex]);

  /**
   * 智能搜索处理 - 增强版
   */
  const handleSearch = (value: string) => {
    if (!value || !docIndex) {
      setSearchOptions([]);
      return;
    }

    const options: { value: string; label: React.ReactNode }[] = [];
    const searchLower = value.toLowerCase();
    
    // 支持 .java 文件格式搜索
    const cleanedValue = value.replace(/\.java$/, '');
    const cleanedLower = cleanedValue.toLowerCase();
    
    // 精准匹配优先（完全匹配类名）
    const exactMatches = searchIndex.classes.filter(cls => {
      return cls.name.toLowerCase() === cleanedLower || 
             cls.fullName.toLowerCase() === cleanedLower;
    });
    
    // 精准匹配结果
    exactMatches.forEach(cls => {
      options.push({
        value: `/class/${encodeURIComponent(cls.fullName)}`,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ApiOutlined style={{ color: '#52c41a' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontWeight: 'bold', 
                color: '#52c41a',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {highlightMatch(cls.name, cleanedValue)} 
                <span style={{ fontSize: '10px', color: '#52c41a', marginLeft: 4 }}>EXACT</span>
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#666',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {highlightMatch(cls.packageName, cleanedValue)}
              </div>
            </div>
            <div style={{ fontSize: '10px', color: '#999' }}>Class</div>
          </div>
        )
      });
    });

    // 模糊匹配（增加结果数量到30个）
    const fuzzyMatches = searchIndex.classes.filter(cls => {
      // 跳过已经精准匹配的
      if (exactMatches.some(exact => exact.fullName === cls.fullName)) {
        return false;
      }
      
      const nameLower = cls.name.toLowerCase();
      const fullNameLower = cls.fullName.toLowerCase();
      const packageLower = cls.packageName.toLowerCase();
      
      return nameLower.includes(cleanedLower) ||
             fullNameLower.includes(cleanedLower) ||
             packageLower.includes(cleanedLower) ||
             // 支持首字母缩写搜索
             cls.name.split(/(?=[A-Z])/).map(part => part.charAt(0)).join('').toLowerCase().includes(cleanedLower) ||
             // 支持去掉分隔符的搜索
             cls.name.replace(/[._]/g, '').toLowerCase().includes(cleanedLower);
    }).slice(0, 30); // 增加到30个结果
    
    // 模糊匹配结果
    fuzzyMatches.forEach(cls => {
      options.push({
        value: `/class/${encodeURIComponent(cls.fullName)}`,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ApiOutlined style={{ color: '#fa8c16' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontWeight: 'bold', 
                color: '#1890ff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {highlightMatch(cls.name, cleanedValue)}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#666',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {highlightMatch(cls.packageName, cleanedValue)}
              </div>
            </div>
            <div style={{ fontSize: '10px', color: '#999' }}>Class</div>
          </div>
        )
      });
    });

    // 添加分割线（只有在有结果时）
    if (exactMatches.length > 0 || fuzzyMatches.length > 0) {
      options.push({
        value: 'divider-1',
        label: <Divider style={{ margin: '4px 0' }} />
      });
    }

    // 搜索包 - 增强包搜索（增加结果数量）
    const packageMatches = searchIndex.packages.filter(pkg => {
      const nameLower = pkg.name.toLowerCase();
      const fullNameLower = pkg.fullName.toLowerCase();
      
      return nameLower.includes(cleanedLower) ||
             fullNameLower.includes(cleanedLower) ||
             // 支持包名片段搜索
             pkg.fullName.split('.').some(part => part.toLowerCase().includes(cleanedLower));
    }).slice(0, 15); // 增加包搜索结果
    
    packageMatches.forEach(pkg => {
      options.push({
        value: `/package/${encodeURIComponent(pkg.fullName)}`,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FolderOutlined style={{ color: '#1890ff' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontWeight: 'bold', 
                color: '#1890ff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {highlightMatch(pkg.fullName, cleanedValue)}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {pkg.classCount} classes
              </div>
            </div>
            <div style={{ fontSize: '10px', color: '#999' }}>Package</div>
          </div>
        )
      });
    });

    // 如果搜索结果为空，提供建议
    if (options.filter(opt => !opt.value.startsWith('divider')).length === 0) {
      options.push({
        value: 'no-results',
        label: (
          <div style={{ padding: '8px', textAlign: 'center', color: '#999' }}>
            <div>未找到匹配结果</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              尝试搜索: Block, Entity, Client, Server, Minecraft
            </div>
            <div style={{ fontSize: '11px', marginTop: '2px', color: '#bbb' }}>
              支持 "Class.java" 格式搜索
            </div>
          </div>
        )
      });
    }

    setSearchOptions(options);
  };

  /**
   * 高亮匹配的文本
   */
  const highlightMatch = (text: string, searchValue: string): React.ReactNode => {
    if (!searchValue || !text) return text;
    
    const searchLower = searchValue.toLowerCase();
    const textLower = text.toLowerCase();
    const index = textLower.indexOf(searchLower);
    
    if (index === -1) return text;
    
    const beforeMatch = text.substring(0, index);
    const match = text.substring(index, index + searchValue.length);
    const afterMatch = text.substring(index + searchValue.length);
    
    return (
      <>
        {beforeMatch}
        <span style={{ background: '#fff566', color: '#000', fontWeight: 'bold' }}>
          {match}
        </span>
        {afterMatch}
      </>
    );
  };

  /**
   * 处理搜索选择 - 增强版
   */
  const handleSelect = (value: string) => {
    if (value.startsWith('divider') || value === 'no-results') return;
    navigate(value);
    setSearchOptions([]);
  };

  /**
   * 快速搜索并跳转 - 增强版
   */
  const handleQuickSearch = (value: string) => {
    if (!value || !docIndex) return;

    // 支持 .java 文件格式搜索
    const cleanedValue = value.replace(/\.java$/, '');
    const searchLower = cleanedValue.toLowerCase();

    // 第一优先级：精确匹配类名
    for (const cls of searchIndex.classes) {
      if (cls.name.toLowerCase() === searchLower || 
          cls.fullName.toLowerCase() === searchLower) {
        navigate(`/class/${encodeURIComponent(cls.fullName)}`);
        setSearchOptions([]);
        return;
      }
    }

    // 第二优先级：精确匹配包名
    for (const pkg of searchIndex.packages) {
      if (pkg.fullName.toLowerCase() === searchLower) {
        navigate(`/package/${encodeURIComponent(pkg.fullName)}`);
        setSearchOptions([]);
        return;
      }
    }

    // 第三优先级：类名包含搜索词（但优先更短的匹配）
    const containsMatches = searchIndex.classes.filter(cls => 
      cls.name.toLowerCase().includes(searchLower) ||
      cls.fullName.toLowerCase().includes(searchLower)
    ).sort((a, b) => a.name.length - b.name.length); // 按长度排序，短的优先
    
    if (containsMatches.length > 0) {
      navigate(`/class/${encodeURIComponent(containsMatches[0].fullName)}`);
      setSearchOptions([]);
      return;
    }

    // 第四优先级：包名包含搜索词
    const packageContainsMatches = searchIndex.packages.filter(pkg => 
      pkg.fullName.toLowerCase().includes(searchLower)
    );
    
    if (packageContainsMatches.length > 0) {
      navigate(`/package/${encodeURIComponent(packageContainsMatches[0].fullName)}`);
      setSearchOptions([]);
      return;
    }

    // 如果没有匹配，显示搜索建议
    handleSearch(value);
  };

  return (
    <div className="modern-navbar">
      {/* 左侧 Logo 和标题 */}
      <div className="navbar-brand">
        <Link to="/" className="brand-link">
          <div className="brand-icon">🎮</div>
          <div className="brand-text">
            <div className="brand-title">Minecraft JavaDoc</div>
            <div className="brand-subtitle">
              Forge 1.20.1 & KubeJS • {docIndex?.totalClasses || 0} Classes
            </div>
          </div>
        </Link>
      </div>

      {/* 中间搜索框 */}
      <div className="navbar-search">
        <AutoComplete
          style={{ width: '100%' }}
          options={searchOptions}
          onSelect={handleSelect}
          onSearch={handleSearch}
          placeholder="Search classes and packages... (e.g., Block, Agent)"
          dropdownClassName="modern-search-dropdown"
        >
          <Search
            enterButton={<SearchOutlined />}
            onSearch={handleQuickSearch}
            size="middle"
            className="modern-search-input"
          />
        </AutoComplete>
      </div>

      {/* 右侧操作按钮 */}
      <div className="navbar-actions">
        <Space size="small">
          <Button
            icon={<HomeOutlined />}
            onClick={() => navigate('/')}
            type="text"
            className="action-button"
          >
            Home
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={onRegenerate}
            type="text"
            loading={loading}
            className="action-button"
          >
            Reload
          </Button>
          {loading && <Spin size="small" />}
        </Space>
      </div>

      {/* 现代化样式 */}
      <style dangerouslySetInnerHTML={{__html: `
        .modern-navbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 64px;
          background: #fff;
          border-bottom: 1px solid #f0f0f0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          padding: 0 24px;
        }

        .navbar-brand {
          display: flex;
          align-items: center;
          min-width: 300px;
        }

        .brand-link {
          display: flex;
          align-items: center;
          text-decoration: none;
          transition: all 0.3s;
        }

        .brand-link:hover {
          transform: scale(1.02);
        }

        .brand-icon {
          font-size: 28px;
          margin-right: 12px;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
        }

        .brand-text {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }

        .brand-title {
          font-size: 18px;
          font-weight: 700;
          color: #1677ff;
          white-space: nowrap;
          letter-spacing: -0.5px;
        }

        .brand-subtitle {
          font-size: 11px;
          color: #8c8c8c;
          white-space: nowrap;
          font-weight: 500;
        }

        .navbar-search {
          flex: 1;
          max-width: 500px;
          margin: 0 32px;
        }

        .modern-search-input {
          border-radius: 8px;
          border: 2px solid #f0f0f0;
          transition: all 0.3s;
        }

        .modern-search-input:hover {
          border-color: #d9d9d9;
        }

        .modern-search-input:focus-within {
          border-color: #1677ff;
          box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.1);
        }

        .navbar-actions {
          display: flex;
          align-items: center;
          min-width: 200px;
          justify-content: flex-end;
        }

        .action-button {
          border-radius: 6px;
          font-weight: 500;
          transition: all 0.3s;
        }

        .action-button:hover {
          background-color: #f0f8ff;
          color: #1677ff;
        }

        .modern-search-dropdown {
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border: 1px solid #e8e8e8;
        }

        .modern-search-dropdown .ant-select-item {
          padding: 8px 12px;
          border-radius: 4px;
          margin: 2px 4px;
        }

        .modern-search-dropdown .ant-select-item:hover {
          background-color: #f0f8ff;
        }

        .modern-search-dropdown .ant-select-item.ant-select-item-option-selected {
          background-color: #e6f7ff;
        }

        @media (max-width: 768px) {
          .modern-navbar {
            padding: 0 16px;
          }
          
          .navbar-brand {
            min-width: 200px;
          }
          
          .brand-title {
            font-size: 16px;
          }
          
          .brand-subtitle {
            font-size: 10px;
          }
          
          .navbar-search {
            margin: 0 16px;
          }
          
          .navbar-actions {
            min-width: 120px;
          }
        }
      `}} />
    </div>
  );
}; 