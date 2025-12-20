# 项目安装与启动指南

本文档将指导你如何从零开始搭建并运行 Document-Q-A 项目的前后端环境。

## 1. 环境准备

在开始之前，请确保你的电脑上已经安装了以下软件：

*   **Python**: 建议版本 3.10 或更高。
*   **Node.js**: 建议版本 18 或更高。
*   **pnpm**: 前端包管理工具。如果你还没有安装，可以使用 npm 安装：
    ```bash
    npm install -g pnpm
    ```
*   **Git**: 用于克隆代码仓库。

---

## 2. 后端设置与启动

后端基于 Python FastAPI 构建。为了避免依赖冲突，我们将使用 `venv` 创建一个独立的虚拟环境。

### 2.1 进入后端目录

打开终端（Terminal）或命令行工具，进入项目的 `backend` 目录：

```bash
cd backend
```

### 2.2 创建虚拟环境

运行以下命令创建一个名为 `.venv` 的虚拟环境：

```bash
# Windows / Linux / macOS
python -m venv .venv
```

### 2.3 激活虚拟环境

激活虚拟环境后，你安装的 Python 包将只在这个环境中生效。

*   **Windows (PowerShell)**:
    ```powershell
    .\.venv\Scripts\Activate.ps1
    ```
    *注意：如果遇到权限错误，请先运行 `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`。*

*   **Windows (CMD)**:
    ```cmd
    .\.venv\Scripts\activate.bat
    ```

*   **macOS / Linux**:
    ```bash
    source .venv/bin/activate
    ```

激活成功后，你的命令行提示符前通常会出现 `(.venv)` 字样。

### 2.4 安装依赖

在激活的虚拟环境中，运行以下命令安装项目所需的 Python 库：

```bash
pip install -r requirements.txt
```

### 2.5 配置环境变量

项目需要一些配置才能运行（例如 API Key）。

1.  将 `.env.example` 文件复制一份并重命名为 `.env`：
    *   Windows: `copy .env.example .env`
    *   macOS/Linux: `cp .env.example .env`
2.  打开 `.env` 文件，填入必要的配置信息（如 OpenAI API Key 等）。

### 2.6 启动后端服务

使用 `uvicorn` 启动开发服务器：

```bash
uvicorn app.main:app --reload
```

*   `--reload`: 代码修改后自动重启，方便开发。
*   启动成功后，后端 API 地址通常为: `http://localhost:8000`
*   API 文档地址: `http://localhost:8000/docs`

---

## 3. 前端设置与启动

前端基于 React 和 Vite 构建，使用 `pnpm` 进行包管理。

### 3.1 进入前端目录

打开一个新的终端窗口（保持后端终端运行），进入项目的 `frontend` 目录：

```bash
cd frontend
```

### 3.2 安装依赖

运行以下命令安装前端依赖：

```bash
pnpm install
```

### 3.3 启动前端服务

运行开发服务器：

```bash
pnpm dev
```

*   启动成功后，终端会显示访问地址，通常为: `http://localhost:5173`

---

## 4. 访问应用

现在，前后端都已启动：

1.  打开浏览器，访问前端地址（如 `http://localhost:5173`）。
2.  你应该能看到 Document-Q-A 的界面。
3.  尝试上传一个 PDF 文档，并开始提问！

---

## 常见问题

*   **端口被占用**：如果 8000 或 5173 端口被占用，请关闭占用端口的程序，或者在启动命令中指定其他端口（后端需修改启动参数，前端可在 `vite.config.ts` 中配置）。
*   **依赖安装失败**：请检查网络连接，或者尝试切换国内镜像源。
