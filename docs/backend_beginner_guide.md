# 后端代码新手指南 (Backend Beginner's Guide)

欢迎来到 Document-Q-A 项目的后端开发指南！这份文档旨在帮助新手快速理解我们的后端架构、代码组织方式以及如何开始开发。

## 1. 项目概览

本项目是一个基于 **FastAPI** 的文档问答系统后端。它的主要功能是：
1.  接收用户上传的 PDF 文档。
2.  解析文档并将其内容存储到向量数据库 (ChromaDB) 中。
3.  接收用户的问题，在向量数据库中检索相关内容。
4.  利用大语言模型 (LLM) 根据检索到的内容回答用户问题。

### 核心技术栈

*   **FastAPI**: 一个现代、快速（高性能）的 Web 框架，用于构建 API。
*   **SQLAlchemy**: Python 的 SQL 工具包和对象关系映射 (ORM) 工具，用于操作 SQLite 数据库。
*   **Pydantic**: 用于数据验证和设置管理。
*   **LangChain**: 用于构建 LLM 应用的框架（虽然我们可能只用到了部分功能）。
*   **ChromaDB**: 一个开源的向量数据库，用于存储和检索文档的向量表示。
*   **SQLite**: 轻量级的文件型数据库，用于存储业务数据（如文档记录、聊天记录）。

---

## 2. 目录结构说明

后端代码位于 `backend/` 目录下。以下是关键文件和文件夹的说明：

```text
backend/
├── app/                    # 应用核心代码
│   ├── api/                # API 路由定义
│   │   └── v1/             # v1 版本接口
│   │       ├── endpoints/  # 具体功能的接口实现 (如 chat.py, documents.py)
│   │       └── api.py      # 路由汇总
│   ├── core/               # 核心配置
│   │   └── config.py       # 环境变量和应用配置 (Settings)
│   ├── crud/               # 数据库增删改查操作 (Create, Read, Update, Delete)
│   ├── db/                 # 数据库连接和会话管理
│   │   ├── base.py         # ORM 基类
│   │   └── session.py      # 数据库会话 (Session) 创建
│   ├── models/             # 数据库模型 (SQLAlchemy Models) - 定义表结构
│   ├── schemas/            # 数据交互模型 (Pydantic Schemas) - 定义请求/响应格式
│   ├── services/           # 业务逻辑层 - 处理复杂的业务流程 (如调用 LLM, 向量检索)
│   └── main.py             # 程序入口文件
├── data/                   # 数据存储目录 (自动生成)
│   ├── chroma/             # 向量数据库文件
│   └── uploads/            # 上传的文件存储
├── requirements.txt        # Python 依赖列表
└── .env                    # 环境变量文件 (需要自己创建)
```

---

## 3. 核心概念与流程

为了读懂代码，你需要理解请求是如何在系统中流转的。通常遵循以下模式：

**Request (请求) -> API (路由) -> Service (业务逻辑) -> CRUD (数据操作) -> Database (数据库)**

### 举个例子：用户上传文档

1.  **API 层 (`app/api/v1/endpoints/documents.py`)**:
    *   接收 HTTP POST 请求。
    *   验证上传的文件格式。
    *   调用 Service 层处理文件。

2.  **Service 层 (`app/services/doc_service.py`)**:
    *   将文件保存到磁盘 (`data/uploads`).
    *   读取 PDF 内容。
    *   将内容切分成小块 (Chunks)。
    *   调用向量服务 (`vector_service.py`) 将切片存入 ChromaDB。
    *   调用 CRUD 层将文档记录存入 SQLite。

3.  **CRUD 层 (`app/crud/document.py`)**:
    *   接收文档信息。
    *   使用 SQLAlchemy 将数据写入数据库表。

4.  **Models 层 (`app/models/document.py`)**:
    *   定义了数据库中 `documents` 表长什么样（有哪些字段，如 `filename`, `upload_time`）。

5.  **Schemas 层 (`app/schemas/document.py`)**:
    *   定义了 API 返回给前端的数据格式（例如，不返回数据库内部的某些字段）。

---

## 4. 如何开始阅读代码？

建议按照以下顺序阅读代码：

1.  **`app/main.py`**:
    *   这是入口。看它是如何创建 `FastAPI` 应用的，以及如何挂载路由 (`app.include_router`)。
    *   关注 `lifespan` 函数，了解启动时初始化了什么（如数据库）。

2.  **`app/models/`**:
    *   先看数据结构。`document.py` 和 `chat.py` 定义了我们存储什么数据。这能帮你建立对业务的直观认识。

3.  **`app/api/v1/endpoints/`**:
    *   看 `documents.py` 和 `chat.py`。这里定义了对外提供的接口。
    *   通过阅读接口函数，你可以知道系统能做什么。

4.  **`app/services/`**:
    *   这是最复杂的部分。`chat_service.py` 包含了与 LLM 对话的核心逻辑。`vector_service.py` 包含了向量检索的逻辑。

---

## 5. 常见任务指南

### Q: 我想修改数据库表结构
1.  修改 `app/models/` 下对应的模型文件。
2.  **注意**: 本项目目前可能使用 `init_db()` 自动建表。如果表已存在，修改模型可能不会自动更新表结构。你可能需要删除 `data/app.db` (开发环境) 让它重新生成，或者引入 Alembic 进行迁移管理。

### Q: 我想添加一个新的 API 接口
1.  在 `app/schemas/` 中定义请求和响应的数据结构 (Pydantic models)。
2.  在 `app/api/v1/endpoints/` 下创建或修改文件，编写路由函数。
3.  如果涉及复杂逻辑，在 `app/services/` 中编写业务代码。
4.  如果涉及数据库操作，在 `app/crud/` 中编写数据库操作代码。
5.  确保在 `app/api/v1/api.py` 中注册了你的路由模块。

### Q: 如何调试？
*   项目配置了 `DEBUG=True`。
*   你可以使用 `print()` 大法，或者在 VS Code 中配置 Python Debugger 附加到运行中的进程。
*   查看控制台输出，FastAPI 会打印详细的错误堆栈。

## 6. 常用命令

在 `backend` 目录下：

*   **安装依赖**: `pip install -r requirements.txt`
*   **运行服务**: `uvicorn app.main:app --reload`
    *   `--reload`: 代码修改后自动重启，开发时很有用。

---

希望这份指南能帮你快速上手！如果有任何问题，多看代码，多尝试修改并观察结果，是最好的学习方式。
