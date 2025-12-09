# 毕业设计项目开发大纲：基于云API的文档问答机器人

> **目标**：构建一个仿 Gemini 界面、具备左右分屏、支持原文精准高亮定位的 RAG 文档问答系统。
> **技术栈**：Python (FastAPI + PyMuPDF + LangChain) + React (Vite + Shadcn/UI + react-pdf)。

## 阶段一：环境搭建与基础架构 (Infrastructure)
此阶段目标是跑通 "Hello World"，确保前后端环境隔离且可用。

- [ ] **1.1 项目初始化**
    - [ ] 创建 Git 仓库，建立目录结构（建议 `backend/` 和 `frontend/` 分离）。
    - [ ] 编写 `.gitignore` (忽略 `venv`, `node_modules`, `.env`, `__pycache__`)。
- [ ] **1.2 后端环境配置 (Python)**
    - [ ] 创建虚拟环境 (`python -m venv venv`)。
    - [ ] 安装核心依赖：`fastapi`, `uvicorn`, `langchain`, `google-generativeai` (或 `openai`), `pymupdf` (fitz), `chromadb`。
    - [ ] 配置 `.env` 文件（存放 API Key）。
- [ ] **1.3 前端环境配置 (React)**
    - [ ] 使用 Vite 初始化项目 (`npm create vite@latest`)。
    - [ ] 安装 Tailwind CSS。
    - [ ] 初始化 **Shadcn/UI** (`npx shadcn-ui@latest init`)。
    - [ ] 安装关键库：`react-pdf`, `zustand` (状态管理), `axios`, `react-markdown`, `lucide-react` (图标)。

---

## 阶段二：后端核心开发 - PDF 解析与 RAG 引擎 (Backend Core)
此阶段不涉及界面，专注于 API 接口和数据处理，建议使用 Postman/Swagger 测试。

- [ ] **2.1 PDF 解析模块 (最关键步骤)**
    - [ ] 编写 PDFLoader 类，使用 `fitz (PyMuPDF)` 打开文件。
    - [ ] **实现“带坐标提取”功能**：不仅提取文本，还要提取每个文本块的 `bbox` (bounding box: x0, y0, x1, y1) 和 `page_number`。
    - [ ] 数据清洗：去除页眉页脚噪音（可选）。
- [ ] **2.2 向量数据库与检索**
    - [ ] 文本切分 (Text Splitter)：设置合适的 Chunk Size (如 500 tokens)。
    - [ ] **Metadata 注入**：确保每个 Chunk 存入向量库时，都带有 `{"page": 1, "bbox": [...]}` 这样的元数据。
    - [ ] 集成 ChromaDB：实现文档的 Embedding 存储和相似度搜索。
- [ ] **2.3 LLM 接入与问答逻辑**
    - [ ] 接入 Google Gemini API (或其他免费 API)。
    - [ ] 构建 Prompt 模板：`"基于以下上下文回答问题，并引用来源..."`。
    - [ ] 实现简单的非流式问答接口进行测试。
- [ ] **2.4 API 接口开发**
    - [ ] `POST /api/upload`: 接收 PDF 文件，执行解析和向量化，返回 `file_id`。
    - [ ] `POST /api/chat`: 接收 `question` 和 `file_id`，返回答案及来源元数据。

---

## 阶段三：前端核心开发 - 界面与 PDF 渲染 (Frontend Core)
此阶段完成静态界面和 PDF 的基础显示。

- [ ] **3.1 整体布局 (Layout)**
    - [ ] 实现响应式左右分屏布局 (Resizable Panel)。
    - [ ] 左侧：聊天区域 (Chat Area) + 输入框。
    - [ ] 右侧：文档预览区域 (Document Viewer)。
- [ ] **3.2 PDF 阅读器实现**
    - [ ] 封装 `<PDFViewer />` 组件 (基于 `react-pdf`)。
    - [ ] 实现基础功能：文档加载、翻页、缩放 (Zoom In/Out)。
    - [ ] **性能优化**：使用 `react-window` 或懒加载机制，避免一次性渲染几百页 PDF 卡死。
- [ ] **3.3 聊天组件开发**
    - [ ] 封装 `<MessageBubble />`：区分 User 和 AI 的样式。
    - [ ] 集成 `react-markdown`：渲染 AI 返回的 Markdown 格式文本。

---

## 阶段四：前后端联调与高亮交互 (Integration & Highlighting)
此阶段是毕设的“灵魂”，实现点击引用跳转。

- [ ] **4.1 流式传输 (Streaming) 实现**
    - [ ] 后端：改造 `/chat` 接口为 `StreamingResponse` (Server-Sent Events)。
    - [ ] 前端：实现流式读取逻辑，让文字像打字机一样逐字显示。
- [ ] **4.2 引用源数据回传**
    - [ ] 后端：在流式输出结束后，追加一个 JSON 数据包，包含 `sources` (页码、坐标)。
    - [ ] 前端：解析该 JSON，将引用渲染为可点击的按钮 `[1]`。
- [ ] **4.3 坐标映射与高亮 (难点)**
    - [ ] **坐标换算逻辑**：后端传回的坐标通常是 PDF 原始点数 (Points)，前端显示的是缩放后的像素 (Pixels)。需要公式：`DisplayX = OriginalX * (CurrentScale)`。
    - [ ] **高亮图层**：在 PDF 页面上方覆盖一层绝对定位的 `div`。
    - [ ] **交互实现**：
        - 用户点击聊天框的 `[1]`。
        - 右侧自动滚动到对应 `page`。
        - 在对应坐标位置绘制一个半透明黄色的矩形框。

---

## 阶段五：美化与完善 (Polishing)
此阶段为了满足“界面美化”和“性能可靠”的要求。

- [ ] **5.1 UI/UX 细节打磨**
    - [ ] 添加 Loading 骨架屏 (Skeleton) 和上传进度条。
    - [ ] 仿 Gemini/ChatGPT 的输入框设计 (自适应高度)。
    - [ ] 移动端适配 (在小屏幕下折叠右侧 PDF，只显示聊天)。
- [ ] **5.2 容错与状态管理**
    - [ ] 处理上传失败、API 超时、Token 超出限制等错误。
    - [ ] 使用 Zustand 管理全局状态：当前选中的高亮区域、当前缩放比例。
- [ ] **5.3 演示准备**
    - [ ] 准备 2-3 个典型的测试 PDF (如技术手册、论文、财报)。
    - [ ] 录制操作演示视频 (作为答辩备份)。