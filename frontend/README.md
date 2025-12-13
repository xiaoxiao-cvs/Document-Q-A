# Document Q&A Frontend

基于 React + TypeScript + Vite 构建的现代化文档问答系统前端。

## 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **样式**: Tailwind CSS
- **动画**: Framer Motion
- **图标**: Lucide React
- **状态管理**: Zustand
- **HTTP 客户端**: Axios
- **Markdown**: React Markdown + remark-gfm
- **文件上传**: React Dropzone

## 项目结构

```
frontend/
├── src/
│   ├── api/              # API 接口封装
│   ├── assets/           # 静态资源
│   ├── components/
│   │   ├── ui/           # 基础 UI 组件
│   │   ├── business/     # 业务组件
│   │   └── layout/       # 布局组件
│   ├── hooks/            # 自定义 Hooks
│   ├── lib/              # 工具函数
│   ├── store/            # Zustand Store
│   ├── types/            # TypeScript 类型定义
│   ├── App.tsx           # 根组件
│   └── main.tsx          # 入口文件
├── public/               # 公共资源
├── index.html            # HTML 模板
├── package.json          # 项目依赖
├── tsconfig.json         # TypeScript 配置
├── vite.config.ts        # Vite 配置
└── tailwind.config.js    # Tailwind 配置
```

## 开始使用

### 1. 安装依赖

```bash
cd frontend
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

应用将在 http://localhost:3000 启动

### 3. 构建生产版本

```bash
npm run build
```

### 4. 预览生产版本

```bash
npm run preview
```

## 功能特性

- ✅ 文档上传（支持 PDF、TXT、DOCX）
- ✅ 文档列表展示与管理
- ✅ 文档选择与删除
- ✅ 智能问答对话
- ✅ 实时消息流
- ✅ 来源引用展示
- ✅ 响应式设计
- ✅ 流畅动画效果
- ✅ 黑白灰极简风格

## 设计规范

### 配色方案
- 主色调：黑 (`#09090b`)、深灰 (`#18181b`)、浅灰 (`#f4f4f5`)、白 (`#ffffff`)
- 强调色：高对比度的纯黑/纯白
- 功能色：红色（错误）、绿色（成功）

### 形状
- 圆角：统一使用大圆角 (rounded-xl / 2xl)
- 卡片：微边框 + 极淡阴影

### 动效
- 页面进入：淡入 + 上滑
- 列表加载：交错动画
- 按钮点击：缩放反馈
- 卡片悬停：上浮效果

## API 配置

默认后端 API 地址为 `http://localhost:8000`，在 [vite.config.ts](vite.config.ts) 中配置：

```typescript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
  },
}
```

## 环境变量

可以创建 `.env` 文件配置环境变量：

```env
VITE_API_BASE_URL=http://localhost:8000
```

## 开发建议

1. 使用 TypeScript 进行类型安全开发
2. 遵循 Tailwind CSS 原子化样式编写规范
3. 使用 Framer Motion 实现流畅动画
4. 保持组件的单一职责原则
5. 使用自定义 Hooks 复用逻辑

## 浏览器支持

- Chrome (最新版)
- Firefox (最新版)
- Safari (最新版)
- Edge (最新版)

## 许可证

MIT
