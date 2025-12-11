# 后端开发文档 - 基于云API的文档问答机器人原型系统

## 1. 引言

本文档旨在规范“基于云API的文档问答机器人原型系统”的后端开发流程，明确技术架构、数据库设计及编码规范，确保代码的可维护性、可扩展性和团队协作效率。

## 2. 技术选型

*   **编程语言**: Python 3.10+
*   **Web 框架**: FastAPI (高性能，原生支持异步，自动生成文档)
*   **应用数据库**: SQLite (轻量级，无需配置，适合毕业设计及原型系统，用于存储元数据和聊天记录)
*   **向量数据库**: ChromaDB 或 FAISS (本地运行，用于存储文档的向量嵌入，支持语义检索)
*   **ORM 框架**: SQLAlchemy (配合 Pydantic 进行数据验证)
*   **LLM 集成**: LangChain (用于构建 RAG 流程，管理 Prompt 和模型调用)
*   **文档解析**: PyPDF2 或 LangChain Community Loaders (用于提取 PDF 文本)

> **关于 SQLite 的适用性说明**: 对于毕业设计和原型系统，SQLite 完全足够。它支持标准的 SQL 查询，无需额外部署数据库服务，且性能足以支撑单机或小规模并发访问。对于文档问答的核心（向量检索），我们将使用专门的向量库（如 ChromaDB），SQLite 仅负责存储结构化数据（如上传记录、对话历史）。

## 3. 架构设计

系统采用分层架构设计，实现关注点分离。

### 3.1 系统分层

1.  **接口层 (API Layer / Routers)**
    *   负责处理 HTTP 请求和响应。
    *   定义路由路径、请求方法。
    *   进行初步的参数校验（依赖 Pydantic）。
    *   不包含复杂的业务逻辑，直接调用服务层。

2.  **服务层 (Service Layer)**
    *   核心业务逻辑的实现场所。
    *   **DocumentService**: 处理文件上传、存储、文本提取、文本切片（Chunking）。
    *   **VectorService**: 负责调用 Embedding API 将文本向量化，并存入向量数据库；负责根据问题进行语义检索。
    *   **ChatService**: 组装 Prompt（包含检索到的上下文），调用云端 LLM API，处理流式或非流式响应，格式化引用来源。

3.  **数据访问层 (Data Access Layer / CRUD)**
    *   负责与 SQLite 数据库交互。
    *   封装所有的 SQL 操作（增删改查）。
    *   使用 SQLAlchemy Session 进行事务管理。

4.  **模型层 (Models & Schemas)**
    *   **DB Models**: 定义数据库表结构 (SQLAlchemy Models)。
    *   **Schemas**: 定义 API 请求和响应的数据结构 (Pydantic Models/DTOs)。

### 3.2 核心流程架构 (RAG - 检索增强生成)

1.  **知识库构建流程**:
    *   用户上传 PDF -> 后端接收 -> 解析文本 -> 文本清洗 -> 按字符或语义切片 (Chunking) -> 调用 Embedding 模型 -> 存入向量数据库。
2.  **问答流程**:
    *   用户提问 -> 调用 Embedding 模型向量化问题 -> 在向量数据库中检索 Top-K 相关片段 -> 组装 Prompt (System Prompt + Context + Question) -> 调用 LLM -> 获取回答 -> 解析引用来源 -> 返回前端。

## 4. 目录结构规范

```text
backend/
├── app/
│   ├── api/                # 接口层
│   │   ├── v1/
│   │   │   ├── endpoints/  # 具体路由定义 (chat.py, documents.py)
│   │   │   └── api.py      # 路由汇总
│   ├── core/               # 核心配置
│   │   ├── config.py       # 环境变量配置
│   │   └── security.py     # (可选) 安全相关
│   ├── crud/               # 数据访问层
│   ├── db/                 # 数据库配置
│   │   ├── base.py         # ORM 基类
│   │   └── session.py      # 数据库会话
│   ├── models/             # 数据库模型 (SQLAlchemy)
│   ├── schemas/            # 数据传输模型 (Pydantic)
│   ├── services/           # 业务逻辑层
│   │   ├── chat_service.py
│   │   ├── doc_service.py
│   │   └── vector_service.py
│   └── main.py             # 程序入口
├── data/                   # 存放上传的文件和SQLite文件
├── .env                    # 环境变量 (API Keys 等)
├── requirements.txt        # 依赖列表
└── README.md
```

## 5. 编码规范

### 5.1 代码风格
*   严格遵循 **PEP 8** 风格指南。
*   使用 `black` 进行代码格式化。
*   使用 `isort` 进行导入排序。

### 5.2 类型提示 (Type Hinting)
*   **强制要求**：所有函数参数和返回值必须包含类型注解。
*   利用 FastAPI 依赖 Pydantic 的特性，确保输入输出类型安全。

### 5.3 命名规范
*   **变量/函数/方法**: `snake_case` (如 `get_user_by_id`)
*   **类名**: `PascalCase` (如 `ChatService`)
*   **常量**: `UPPER_CASE` (如 `MAX_UPLOAD_SIZE`)
*   **私有成员**: 以单下划线开头 `_variable`

### 5.4 注释与文档
*   **Docstrings**: 所有公共模块、类、函数必须包含文档字符串（推荐 Google Style）。
*   **复杂逻辑**: 必须在代码块上方添加行级注释，解释“为什么这样做”而不是“做了什么”。

### 5.5 异常处理
*   不要直接返回 500 错误，应捕获特定异常并抛出 `HTTPException`。
*   定义全局异常处理器，统一错误响应格式。

### 5.6 Git 提交规范
遵循 Conventional Commits 规范：
*   `feat`: 新功能
*   `fix`: 修复 Bug
*   `docs`: 文档变更
*   `style`: 代码格式调整（不影响逻辑）
*   `refactor`: 代码重构
*   `chore`: 构建过程或辅助工具的变动

## 6. 接口设计原则

*   **RESTful**: 遵循 REST 语义 (GET 获取, POST 创建, DELETE 删除)。
*   **统一响应格式**:
    所有接口应尽量返回统一的 JSON 结构，例如：
    ```json
    {
      "code": 200,
      "message": "success",
      "data": { ... }
    }
    ```
    *(注：FastAPI 默认直接返回数据对象，可根据需要封装)*

## 7. API 接口定义

所有接口的基础路径为 `/api/v1`。

### 7.1 文档管理 (Documents)

#### 7.1.1 上传文档
*   **URL**: `/documents/upload`
*   **Method**: `POST`
*   **Content-Type**: `multipart/form-data`
*   **Parameters**:
    *   `file`: File (Required, .pdf only)
*   **Response**:
    ```json
    {
      "id": 1,
      "filename": "example.pdf",
      "upload_time": "2023-10-27T10:00:00",
      "status": "processed",
      "message": "File uploaded and processed successfully"
    }
    ```

#### 7.1.2 获取文档列表
*   **URL**: `/documents`
*   **Method**: `GET`
*   **Response**:
    ```json
    [
      {
        "id": 1,
        "filename": "example.pdf",
        "upload_time": "2023-10-27T10:00:00",
        "status": "processed"
      }
    ]
    ```

#### 7.1.3 删除文档
*   **URL**: `/documents/{doc_id}`
*   **Method**: `DELETE`
*   **Parameters**:
    *   `doc_id`: int (Path Parameter)
*   **Response**:
    ```json
    {
      "message": "Document deleted successfully"
    }
    ```

### 7.2 问答对话 (Chat)

#### 7.2.1 发送提问
*   **URL**: `/chat`
*   **Method**: `POST`
*   **Content-Type**: `application/json`
*   **Body**:
    ```json
    {
      "question": "这份文档主要讲了什么？",
      "doc_id": 1  // (可选) 指定文档ID，若不传则默认在最新或所有文档中搜索
    }
    ```
*   **Response**:
    ```json
    {
      "answer": "这份文档主要介绍了...",
      "sources": [
        {
          "page": 1,
          "content": "原文片段..."
        }
      ]
    }
    ```

## 8. 安全性要求

*   **API Key 管理**: 严禁将云服务 API Key 硬编码在代码中，必须通过 `.env` 文件加载。
*   **文件安全**: 限制上传文件的类型（仅 PDF）和大小，防止恶意文件上传。
