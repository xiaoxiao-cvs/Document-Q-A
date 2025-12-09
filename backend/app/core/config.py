"""
应用配置设置。
使用 pydantic-settings 加载环境变量。
"""
from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """从环境变量加载的应用设置。"""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )
    
    # API 密钥
    google_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    
    # 应用设置
    app_name: str = "Document Q&A API"
    app_version: str = "0.1.0"
    debug: bool = False
    
    # 文件存储设置
    upload_dir: Path = Path("uploads")
    max_file_size: int = 50 * 1024 * 1024  # 50 MB
    allowed_extensions: set[str] = {".pdf"}
    
    # 数据库设置
    database_url: str = "sqlite:///./document_qa.db"
    
    # 向量数据库设置
    chroma_persist_dir: Path = Path("chroma_db")
    
    # 文本处理设置
    chunk_size: int = 500
    chunk_overlap: int = 50
    
    # LLM 设置
    llm_provider: str = "google"  # "google" 或 "openai"
    llm_model: str = "gemini-pro"
    llm_temperature: float = 0.3
    max_tokens: int = 2048
    
    def get_api_key(self) -> str:
        """根据配置的 LLM 提供商获取 API 密钥。"""
        if self.llm_provider == "google":
            if not self.google_api_key:
                raise ValueError("GOOGLE_API_KEY 未设置")
            return self.google_api_key
        elif self.llm_provider == "openai":
            if not self.openai_api_key:
                raise ValueError("OPENAI_API_KEY 未设置")
            return self.openai_api_key
        else:
            raise ValueError(f"不支持的 LLM 提供商: {self.llm_provider}")


@lru_cache
def get_settings() -> Settings:
    """获取缓存的设置实例。"""
    return Settings()
