"""
设置管理 API 端点模块

提供 LLM 配置的获取和更新接口。
"""
import json
import os
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.core.config import settings

# 创建路由器
router = APIRouter(prefix="/settings", tags=["设置管理"])

# 配置文件路径
CONFIG_FILE = "./data/llm_config.json"


class LLMConfigRequest(BaseModel):
    """LLM 配置请求模型"""
    api_base: Optional[str] = Field(None, description="API 基础URL")
    api_key: Optional[str] = Field(None, description="API 密钥")
    model: Optional[str] = Field(None, description="模型名称")
    embedding_model: Optional[str] = Field(None, description="嵌入模型名称")


class LLMConfigResponse(BaseModel):
    """LLM 配置响应模型"""
    api_base: Optional[str] = Field(None, description="API 基础URL")
    api_key_set: bool = Field(default=False, description="API 密钥是否已设置")
    api_key_preview: Optional[str] = Field(None, description="API 密钥预览（隐藏部分）")
    model: str = Field(default="gpt-3.5-turbo", description="模型名称")
    embedding_model: str = Field(default="text-embedding-ada-002", description="嵌入模型名称")


def _load_config() -> dict:
    """从文件加载配置"""
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def _save_config(config: dict):
    """保存配置到文件"""
    os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)


def _mask_api_key(api_key: Optional[str]) -> Optional[str]:
    """隐藏 API 密钥的中间部分"""
    if not api_key:
        return None
    if len(api_key) <= 8:
        return "*" * len(api_key)
    return api_key[:4] + "*" * (len(api_key) - 8) + api_key[-4:]


def get_effective_config() -> dict:
    """
    获取有效的 LLM 配置
    
    优先级：文件配置 > 环境变量 > 默认值
    """
    file_config = _load_config()
    
    return {
        "api_base": file_config.get("api_base") or settings.OPENAI_API_BASE,
        "api_key": file_config.get("api_key") or settings.OPENAI_API_KEY,
        "model": file_config.get("model") or settings.LLM_MODEL,
        "embedding_model": file_config.get("embedding_model") or settings.EMBEDDING_MODEL,
    }


@router.get(
    "/llm",
    response_model=LLMConfigResponse,
    summary="获取 LLM 配置",
    description="获取当前的 LLM 配置信息"
)
async def get_llm_config() -> LLMConfigResponse:
    """获取当前 LLM 配置"""
    config = get_effective_config()
    api_key = config.get("api_key")
    
    return LLMConfigResponse(
        api_base=config.get("api_base"),
        api_key_set=bool(api_key and api_key != "your_api_key_here"),
        api_key_preview=_mask_api_key(api_key) if api_key and api_key != "your_api_key_here" else None,
        model=config.get("model", "gpt-3.5-turbo"),
        embedding_model=config.get("embedding_model", "text-embedding-ada-002"),
    )


@router.put(
    "/llm",
    response_model=LLMConfigResponse,
    summary="更新 LLM 配置",
    description="更新 LLM 配置信息"
)
async def update_llm_config(request: LLMConfigRequest) -> LLMConfigResponse:
    """更新 LLM 配置"""
    # 加载现有配置
    config = _load_config()
    
    # 更新配置
    if request.api_base is not None:
        config["api_base"] = request.api_base if request.api_base else None
    if request.api_key is not None:
        config["api_key"] = request.api_key if request.api_key else None
    if request.model is not None:
        config["model"] = request.model if request.model else "gpt-3.5-turbo"
    if request.embedding_model is not None:
        config["embedding_model"] = request.embedding_model if request.embedding_model else "text-embedding-ada-002"
    
    # 保存配置
    _save_config(config)
    
    # 重新加载向量服务的配置
    try:
        from app.services.vector_service import vector_service
        vector_service.reload_config()
    except Exception as e:
        print(f"⚠ 重新加载向量服务配置失败: {e}")
    
    # 返回更新后的配置
    effective_config = get_effective_config()
    api_key = effective_config.get("api_key")
    
    return LLMConfigResponse(
        api_base=effective_config.get("api_base"),
        api_key_set=bool(api_key and api_key != "your_api_key_here"),
        api_key_preview=_mask_api_key(api_key) if api_key and api_key != "your_api_key_here" else None,
        model=effective_config.get("model", "gpt-3.5-turbo"),
        embedding_model=effective_config.get("embedding_model", "text-embedding-ada-002"),
    )


@router.post(
    "/llm/test",
    summary="测试 LLM 连接",
    description="测试当前 LLM 配置是否可用"
)
async def test_llm_connection():
    """测试 LLM 连接"""
    config = get_effective_config()
    
    api_key = config.get("api_key")
    if not api_key or api_key == "your_api_key_here":
        return {
            "success": False,
            "message": "未配置 API 密钥",
        }
    
    try:
        from openai import AsyncOpenAI
        
        client = AsyncOpenAI(
            api_key=api_key,
            base_url=config.get("api_base") if config.get("api_base") else None
        )
        
        # 发送简单的测试请求
        response = await client.chat.completions.create(
            model=config.get("model", "gpt-3.5-turbo"),
            messages=[{"role": "user", "content": "Hi"}],
            max_tokens=5,
        )
        
        return {
            "success": True,
            "message": "连接成功",
            "model": response.model,
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"连接失败: {str(e)}",
        }
