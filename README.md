# Minecraft JavaDoc 浏览器

🎮 基于源码自动生成的 JavaDoc 风格文档浏览器，专为 Minecraft Forge 和 KubeJS 项目设计。

## ✨ 功能特性

- 📚 **自动解析源码**：自动扫描 Java 源文件，解析类、方法、字段和 JavaDoc 注释
- 🌐 **真实路由**：每个类和包都有独立的 URL，支持书签和直接链接
- 🌲 **包层次导航**：类似传统 JavaDoc 的包/类树形结构
- 🔍 **智能搜索**：支持类名、包名模糊搜索和自动补全
- 📖 **完整文档**：显示类描述、方法签名、字段信息、继承关系
- 💻 **源码查看**：支持在文档中直接查看源代码
- 📱 **现代界面**：基于 Ant Design 的响应式现代化界面

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

## 📁 项目结构

```
src/
├── components/
│   ├── pages/
│   │   ├── JavaDocHome.tsx      # 主页组件
│   │   ├── JavaDocPackage.tsx   # 包页面组件
│   │   └── JavaDocClass.tsx     # 类页面组件
│   ├── JavaDocRouter.tsx        # 路由系统
│   ├── JavaDocNavbar.tsx        # 顶部导航栏
│   └── JavaDocSidebar.tsx       # 侧边栏导航
├── utils/
│   ├── realFileScanner.ts       # 文件扫描器
│   ├── enhancedJavaParser.ts    # Java 解析器
│   └── realDocumentGenerator.ts # 文档生成器
├── types/
│   └── index.ts                 # TypeScript 类型定义
└── App.tsx                      # 主应用入口
```

## 🔗 路由系统

系统使用 React Router 实现传统 JavaDoc 风格的 URL 结构：

- `/` - 主页，显示项目概览和统计信息
- `/package/com.mojang.authlib` - 包页面，显示包内所有类
- `/class/com.mojang.authlib.Agent` - 类页面，显示类的完整文档

## 🎯 支持的项目

- **Forge 1.20.1-47.1.99**：Minecraft Forge 模组开发框架
- **KubeJS-2001**：JavaScript 模组开发工具

## 🔧 技术栈

- **React 18** + **TypeScript**：现代化前端框架
- **React Router**：客户端路由
- **Ant Design**：UI 组件库
- **Vite**：快速构建工具

## 📝 使用说明

1. **首次启动**：系统会自动扫描项目文件并生成文档索引
2. **浏览文档**：使用左侧包树或顶部搜索来导航
3. **查看源码**：在类页面的"源码"标签页中查看原始源代码
4. **书签支持**：所有页面都有独立 URL，可以添加书签或分享链接

## 🐛 故障排除

### 没有找到项目文件？

系统会自动生成测试数据供演示。要扫描真实项目：

1. 确保项目文件在正确路径：`/forge-1.20.1-47.1.99/` 或 `/KubeJS-2001/`
2. 点击"重新扫描"按钮
3. 检查浏览器控制台的详细日志

### 类数量过少？

系统期望找到数千个类。如果只找到少量类，可能是：

- 项目路径不正确
- 文件权限问题
- 网络访问限制

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## �� 许可证

MIT License 