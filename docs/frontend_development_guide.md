# 前端开发文档 - 基于云API的文档问答机器人原型系统

## 1. 设计理念 (Design System)

基于用户需求，本系统采用 **"Modern Monochrome" (现代黑白灰)** 设计风格，强调极简、质感与流畅的交互体验。

### 1.1 视觉规范
*   **配色方案 (Color Palette)**:
    *   **主色调**: 黑 (`#09090b`)、深灰 (`#18181b`)、浅灰 (`#f4f4f5`)、白 (`#ffffff`)。
    *   **强调色**: 纯黑或纯白（用于按钮、高亮文本），通过高对比度传达层级。
    *   **功能色**: 红色（错误/删除）、绿色（成功/在线），保持低饱和度，不破坏整体黑白氛围。
*   **形状 (Shape)**:
    *   **圆角**: 全局采用 **大圆角 (Rounded-XL / 2XL)**，营造亲和力与现代感。
    *   **卡片**: 采用微边框 (Border) 或 极淡的阴影，避免厚重的拟物感。
*   **质感 (Texture)**:
    *   **毛玻璃 (Glassmorphism)**: Modal 遮罩、侧边栏背景、悬浮提示框均需应用 `backdrop-blur` 效果，增强空间层次感。
*   **排版 (Typography)**:
    *   使用无衬线字体 (Inter 或 System UI)，字重区分明显。

### 1.2 动效规范 (Animation)
使用 **Framer Motion** 实现流畅的微交互：
*   **进入/退出**: 页面元素采用淡入 + 轻微位移 (Fade In + Slide Up)。
*   **列表加载**: 采用交错动画 (Stagger Children)，避免生硬的整块出现。
*   **交互反馈**: 按钮点击有缩放 (Scale Down)，卡片悬停有上浮 (Lift Up)。
*   **Modal**: 弹窗配合毛玻璃背景，从中心柔和放大弹出。

## 2. 技术选型

*   **构建工具**: Vite 5.x
*   **框架**: React 18 (TypeScript)
*   **样式引擎**: **Tailwind CSS** (原子化 CSS，快速实现黑白灰与圆角)
*   **动画库**: **Framer Motion** (实现复杂的编排动画)
*   **图标库**: **Lucide React** (线条风格，完美契合极简设计)
*   **状态管理**: **Zustand** (轻量级，管理文档列表和对话状态)
*   **HTTP 客户端**: Axios
*   **Markdown 渲染**: react-markdown + tailwind-typography
*   **文件上传**: react-dropzone

## 3. 目录结构

```text
frontend/
├── src/
│   ├── api/                # API 接口封装
│   ├── assets/             # 静态资源
│   ├── components/
│   │   ├── ui/             # 基础 UI 组件 (Button, Input, Modal, Card) - 高度复用
│   │   ├── business/       # 业务组件 (ChatBubble, FileList, UploadZone)
│   │   └── layout/         # 布局组件 (Sidebar, MainLayout)
│   ├── hooks/              # 自定义 Hooks (useChat, useFileUpload)
│   ├── lib/                # 工具函数 (utils, cn)
│   ├── store/              # Zustand Store
│   ├── types/              # TS 类型定义
│   ├── App.tsx             # 根组件
│   └── main.tsx            # 入口
├── tailwind.config.js      # Tailwind 配置 (定义颜色、圆角、动画)
└── vite.config.ts          # Vite 配置
```

## 4. 核心组件设计

### 4.1 布局 (Layout)
*   **Sidebar (左侧)**: 深灰色背景 + 毛玻璃。展示 Logo、上传区域、文档列表。
*   **Main (右侧)**: 浅灰色或白色背景。展示对话区域。

### 4.2 模态框 (Modal)
*   **遮罩**: `bg-black/20 backdrop-blur-sm` (黑色半透明 + 毛玻璃)。
*   **内容**: 白色/深色卡片，`rounded-2xl`，`shadow-2xl`。

### 4.3 上传组件 (UploadZone)
*   参考设计：虚线边框 (`border-dashed`)，圆角矩形。
*   交互：拖拽进入时边框变实线并高亮；上传中显示进度条动画。

### 4.4 聊天气泡 (ChatBubble)
*   **User**: 纯黑背景，白色文字，圆角 `rounded-2xl rounded-tr-sm` (右上角直角)。
*   **AI**: 浅灰背景，深色文字，圆角 `rounded-2xl rounded-tl-sm` (左上角直角)。
*   **Markdown**: 针对 AI 回答中的代码块、列表进行 Tailwind Typography 样式定制。

## 5. 开发计划

1.  **初始化**: 配置 Vite + Tailwind + Framer Motion。
2.  **基础组件库**: 封装 Button, Card, Modal, Input (确保圆角和黑白风格统一)。
3.  **业务开发 - 文档篇**: 实现文件上传、列表展示、删除功能。
4.  **业务开发 - 对话篇**: 实现聊天界面、流式消息渲染、引用来源展示。
5.  **UI 润色**: 添加动效，调整毛玻璃参数，适配深色模式。
