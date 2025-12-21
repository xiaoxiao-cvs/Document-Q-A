"""
核心配置模块

用于管理应用程序的所有配置项，通过环境变量加载敏感信息。
"""
from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    应用程序配置类
    
    从环境变量或 .env 文件中加载配置。
    """
    
    # API 配置
    API_V1_STR: str = Field(default="/api/v1", description="API 版本前缀路径")
    PROJECT_NAME: str = Field(default="Document Q&A Bot", description="项目名称")
    
    # 服务器配置
    HOST: str = Field(default="0.0.0.0", description="服务器主机地址")
    PORT: int = Field(default=8000, description="服务器端口号")
    DEBUG: bool = Field(default=True, description="是否启用调试模式")
    
    # 数据库配置
    DATABASE_URL: str = Field(
        default="sqlite:///./data/app.db", 
        description="SQLite 数据库连接URL"
    )
    
    # LLM / OpenAI 配置
    OPENAI_API_KEY: Optional[str] = Field(default=None, description="OpenAI API 密钥")
    OPENAI_API_BASE: Optional[str] = Field(default=None, description="OpenAI API 基础URL")
    LLM_MODEL: str = Field(default="gpt-3.5-turbo", description="使用的LLM模型名称")
    EMBEDDING_MODEL: str = Field(default="text-embedding-ada-002", description="嵌入模型名称")
    
    # 向量数据库配置
    CHROMA_PERSIST_DIRECTORY: str = Field(
        default="./data/chroma", 
        description="ChromaDB 持久化目录"
    )
    CHROMA_COLLECTION_NAME: str = Field(
        default="documents", 
        description="ChromaDB 集合名称"
    )
    
    # 文件上传配置
    UPLOAD_DIR: str = Field(default="./data/uploads", description="文件上传目录")
    MAX_UPLOAD_SIZE: int = Field(default=10 * 1024 * 1024, description="最大上传文件大小(字节)")  # 10MB
    ALLOWED_EXTENSIONS: List[str] = Field(
        default=["pdf", "txt", "docx"], 
        description="允许上传的文件扩展名"
    )
    
    # 文本切片配置
    CHUNK_SIZE: int = Field(default=1000, description="文本切片大小")
    CHUNK_OVERLAP: int = Field(default=200, description="文本切片重叠大小")
    
    # 检索配置
    TOP_K_RESULTS: int = Field(default=5, description="检索返回的Top-K结果数量")
    
    # CORS 配置
    CORS_ORIGINS: List[str] = Field(
        default=[
            "http://localhost",
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
        ],
        description="允许的CORS源列表"
    )
    
    # 速率限制配置
    RATE_LIMIT_REQUESTS: int = Field(default=100, description="每分钟最大请求数")
    RATE_LIMIT_WINDOW: int = Field(default=60, description="速率限制时间窗口(秒)")
    
    class Config:
        """Pydantic 配置"""
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# 创建全局配置实例
settings = Settings()
