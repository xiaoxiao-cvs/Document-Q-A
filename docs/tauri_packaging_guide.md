# Tauri 桌面应用打包指南

本文档介绍如何将 Document Q&A 系统打包为独立的桌面应用程序。

## 前提条件

### 1. 安装 Rust

访问 [https://rustup.rs](https://rustup.rs) 下载并安装 Rust：

```powershell
# Windows (PowerShell)
winget install Rustlang.Rustup

# 或者下载安装器
# https://win.rustup.rs/x86_64
```

安装完成后，重新打开终端，验证安装：

```bash
rustc --version
cargo --version
```

### 2. 安装 Python 依赖

```bash
cd backend
pip install pyinstaller
pip install -r requirements.txt
```

### 3. 安装前端依赖

```bash
cd frontend
pnpm install
```

## 打包步骤

### 步骤 1：打包后端服务

```bash
cd backend
python build_backend.py
```

这将：
- 使用 PyInstaller 将 Python 后端打包为独立可执行文件
- 将可执行文件复制到 `frontend/src-tauri/binaries/` 目录

### 步骤 2：构建 Tauri 应用

```bash
cd frontend
pnpm tauri build
```

构建完成后，安装包位于：
- Windows: `frontend/src-tauri/target/release/bundle/msi/` 或 `nsis/`
- macOS: `frontend/src-tauri/target/release/bundle/dmg/`
- Linux: `frontend/src-tauri/target/release/bundle/deb/` 或 `appimage/`

## 开发模式

### 分离运行（推荐）

1. 启动后端服务：
```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

2. 启动前端开发服务器：
```bash
cd frontend
pnpm dev
```

3. 启动 Tauri 开发模式（可选）：
```bash
cd frontend
pnpm tauri dev
```

### 配置说明

#### 前端 API 地址

在 `frontend/.env` 或 `frontend/.env.local` 中配置：

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

#### 后端配置

在 `backend/.env` 中配置：

```env
OPENAI_API_KEY=your_api_key
OPENAI_API_BASE=https://api.openai.com/v1
LLM_MODEL=gpt-3.5-turbo
```

或者通过前端界面配置（点击设置图标）。

## 应用行为

### 启动流程

1. 用户双击应用图标
2. Tauri 应用启动
3. 自动启动后端服务（生产模式）
4. 加载前端界面
5. 连接到本地后端 API

### 关闭流程

1. 用户关闭应用窗口
2. Tauri 发送关闭信号
3. 后端服务自动终止
4. 应用完全退出

## 故障排除

### 后端启动失败

检查日志输出，确保：
- 端口 8000 未被占用
- 所有 Python 依赖已正确安装
- 数据目录权限正确

### API 连接失败

- 开发模式：确保后端服务已启动
- 生产模式：检查 binaries 目录是否包含正确的可执行文件

### 打包失败

- 确保 Rust 已正确安装
- 检查 PyInstaller 是否能正常工作
- 确保所有依赖版本兼容

## 文件结构

```
Document-Q-A/
├── backend/
│   ├── app/
│   │   └── ...
│   ├── build_backend.py      # 后端打包脚本
│   ├── backend.spec          # PyInstaller 配置
│   └── requirements.txt
└── frontend/
    ├── src/
    │   └── ...
    ├── src-tauri/
    │   ├── binaries/         # 打包后的后端可执行文件
    │   ├── src/
    │   │   └── lib.rs        # Tauri 主逻辑
    │   ├── Cargo.toml
    │   └── tauri.conf.json   # Tauri 配置
    └── package.json
```
