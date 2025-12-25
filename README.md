# 基于云API的文档问答机器人

基于 RAG (Retrieval-Augmented Generation) 技术构建的智能文档问答系统，支持 PDF 文档上传、智能问答以及原文精准高亮定位功能。

## 🌟 项目简介

本项目是一个文档问答机器人，采用左右分屏布局，左侧为对话交互区域，右侧为文档预览区域。系统能够解析用户上传的 PDF 文档，通过向量检索和大语言模型生成精准回答，并支持点击引用跳转至原文对应位置进行高亮显示。

### ✨ 新功能

- **前端模型配置**: 支持在界面直接配置 API 地址、密钥和模型
- **桌面应用打包**: 支持使用 Tauri 打包为独立桌面应用
- **一键启动**: 桌面应用自动启动/关闭后端服务

## 技术架构

### 后端技术栈

- **Web 框架**: FastAPI
- **PDF 解析**: PyMuPDF (fitz)
- **RAG 框架**: LangChain
- **向量数据库**: ChromaDB
- **大语言模型**: OpenAI API 兼容接口

### 前端技术栈

- **构建工具**: Vite
- **UI 框架**: React + TypeScript
- **样式方案**: Tailwind CSS
- **PDF 渲染**: react-pdf
- **状态管理**: Zustand
- **HTTP 客户端**: Axios
- **桌面打包**: Tauri

## 核心功能

### 文档处理

- PDF 文档上传与解析
- 带坐标的文本块提取 (bbox)
- 文本分块与向量化存储
- 元数据注入 (页码、坐标信息)

### 智能问答

- 基于向量相似度的上下文检索
- 大语言模型驱动的智能回答生成
- 流式输出 (Server-Sent Events)
- 引用来源追踪与展示

### 文档阅读

- PDF 文档在线预览
- 翻页与缩放功能
- 虚拟滚动性能优化
- 引用定位与高亮显示

### 交互体验

- 响应式左右分屏布局
- 可调节面板尺寸
- 点击引用跳转原文
- 坐标映射高亮标注

## 项目结构

```
Document-Q-A/
├── backend/                 # 后端服务
│   ├── app/
│   │   ├── api/            # API 接口
│   │   ├── core/           # 核心配置
│   │   ├── services/       # 业务服务
│   │   └── utils/          # 工具函数
│   ├── build_backend.py    # 后端打包脚本
│   ├── backend.spec        # PyInstaller 配置
│   ├── requirements.txt
│   └── .env
├── frontend/                # 前端应用
│   ├── src/
│   │   ├── components/     # UI 组件
│   │   ├── hooks/          # 自定义 Hooks
│   │   ├── stores/         # 状态管理
│   │   └── utils/          # 工具函数
│   ├── src-tauri/          # Tauri 桌面应用配置
│   │   ├── src/            # Rust 源码
│   │   ├── binaries/       # 打包后端可执行文件
│   │   └── tauri.conf.json
│   ├── package.json
│   └── vite.config.js
├── scripts/                 # 构建脚本
│   └── build.ps1
├── docs/                    # 文档
└── README.md
```

## 快速开始

### 环境要求

- Python 3.9+
- Node.js 18+
- npm 或 yarn

### 后端部署

```bash
# 进入后端目录
cd backend

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate   # Windows

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入 API Key

# 启动服务
uvicorn app.main:app --reload --port 8000
```

### 前端部署

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 访问应用

启动成功后，在浏览器中访问 `http://localhost:5173`

## 🖥️ 桌面应用打包

### 前提条件

1. 安装 [Rust](https://rustup.rs)
2. 安装 PyInstaller: `pip install pyinstaller`

### 打包步骤

```bash
# 方式一：使用构建脚本
.\scripts\build.ps1 build

# 方式二：手动打包
# 1. 打包后端
cd backend
python build_backend.py

# 2. 构建 Tauri 应用
cd frontend
pnpm tauri build
```

详细说明请参阅 [Tauri 打包指南](docs/tauri_packaging_guide.md)

## ⚙️ 模型配置

支持在前端界面配置 LLM 模型：

1. 点击界面右上角的 ⚙️ 设置图标
2. 填写配置信息：
   - **API 地址**: 兼容 OpenAI 的 API 端点 (如 DeepSeek、Azure 等)
   - **API 密钥**: 你的 API Key
   - **对话模型**: 如 `gpt-4o`, `deepseek-chat` 等
   - **嵌入模型**: 用于文档向量化
3. 点击"测试连接"验证配置
4. 保存配置

## API 接口

### 文档上传

```
POST /api/upload
Content-Type: multipart/form-data

请求参数:
- file: PDF 文件

响应:
{
  "file_id": "string",
  "filename": "string",
  "page_count": number
}
```

### 文档问答

```
POST /api/chat
Content-Type: application/json

请求参数:
{
  "question": "string",
  "file_id": "string"
}

响应 (流式):
- 文本内容逐字输出
- 结束时返回引用来源 JSON
```

## 配置说明

### 环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| GEMINI_API_KEY | Google Gemini API 密钥 | AIza... |
| CHROMA_PERSIST_DIR | 向量数据库持久化目录 | ./chroma_db |
| CHUNK_SIZE | 文本分块大小 | 500 |
| CHUNK_OVERLAP | 分块重叠大小 | 50 |

## 开发计划

- [x] 项目初始化与环境搭建
- [x] PDF 解析与坐标提取模块
- [x] 向量数据库集成
- [x] LLM 问答接口开发
- [x] 前端界面与 PDF 渲染
- [x] 流式传输与引用高亮
- [x] 前端模型配置功能
- [x] Tauri 桌面应用打包支持
- [ ] UI 美化与性能优化
- [ ] 多文档对话支持

## 许可证

本项目采用 MIT 许可证，详见 [LICENSE](LICENSE) 文件。
