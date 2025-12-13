# 项目启动指南

## 前端启动步骤

### 1. 进入前端目录
```bash
cd frontend
```

### 2. 安装依赖
```bash
npm install
```

### 3. 启动开发服务器
```bash
npm run dev
```

前端将在 **http://localhost:3000** 启动

### 4. 其他命令
```bash
# 构建生产版本
npm run build

# 预览生产版本
npm run preview

# 代码检查
npm run lint
```

## 后端启动步骤

### 1. 进入后端目录
```bash
cd backend
```

### 2. 创建虚拟环境（可选但推荐）
```bash
python -m venv venv

# macOS/Linux
source venv/bin/activate

# Windows
venv\Scripts\activate
```

### 3. 安装依赖
```bash
pip install -r requirements.txt
```

### 4. 启动后端服务
```bash
uvicorn app.main:app --reload --port 8000
```

后端将在 **http://localhost:8000** 启动

### 5. 查看 API 文档
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 完整启动流程

### 方式一：分别启动（推荐用于开发）

1. 打开终端 1 - 启动后端：
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

2. 打开终端 2 - 启动前端：
```bash
cd frontend
npm install
npm run dev
```

3. 访问 http://localhost:3000 使用应用

### 方式二：使用 tmux/screen（适合 Linux/macOS）

```bash
# 使用 tmux
tmux new -s docqa
cd backend && uvicorn app.main:app --reload --port 8000
# 按 Ctrl+B 然后按 C 创建新窗口
cd frontend && npm run dev
# 按 Ctrl+B 然后按 数字键 切换窗口
```

## 环境要求

### 前端
- Node.js >= 16.0.0
- npm >= 8.0.0

### 后端
- Python >= 3.8
- pip

## 项目结构

```
Document-Q-A/
├── frontend/          # React 前端
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── backend/           # FastAPI 后端
│   ├── app/
│   ├── data/
│   └── requirements.txt
└── docs/              # 文档
```

## 常见问题

### 前端端口被占用
如果 3000 端口被占用，可以修改 `frontend/vite.config.ts`：
```typescript
server: {
  port: 3001, // 改成其他端口
  // ...
}
```

### 后端端口被占用
启动时指定其他端口：
```bash
uvicorn app.main:app --reload --port 8001
```

同时需要修改前端的代理配置 `frontend/vite.config.ts`：
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:8001', // 改成对应端口
    changeOrigin: true,
  },
}
```

### 依赖安装失败
- 前端：尝试删除 `node_modules` 和 `package-lock.json`，重新安装
- 后端：使用国内镜像源 `pip install -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt`

## 开发提示

1. **热更新**：前后端都支持热更新，修改代码后会自动刷新
2. **调试**：
   - 前端：使用浏览器开发者工具
   - 后端：查看终端日志输出
3. **数据存储**：上传的文件和向量数据库存储在 `backend/data/` 目录

## 功能测试

1. 上传文档：在左侧面板拖拽或点击上传文档
2. 选择文档：点击文档卡片进行选择（可多选）
3. 开始对话：在右侧输入框输入问题，AI 会基于选中的文档回答
4. 删除文档：悬停文档卡片，点击删除按钮

## 下一步

- 查看 [前端开发文档](docs/frontend_development_guide.md)
- 查看 [后端开发文档](docs/backend_development_guide.md)
- 阅读 [项目路线图](Project Roadmap.md)
