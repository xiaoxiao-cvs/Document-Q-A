# 生产环境修复指南

## 问题描述

在生产环境（打包后的应用）中，Tauri 应用无法正确启动 Python 后端服务。主要错误包括：

### 错误1：路径问题
打包后的应用中，`BACKEND_DIR` 指向临时解压目录 `C:\Users\...\AppData\Local\Temp`，导致找不到数据文件。

### 错误2：模块导入失败
```
ERROR: Error loading ASGI app. Could not import module "app.main".
```
PyInstaller 打包后，使用字符串 `"app.main:app"` 方式启动 uvicorn 会失败，因为打包后的单文件可执行程序无法进行模块导入。

### 错误3：数据目录不存在
数据目录（uploads、chroma、thumbnails）在打包后不存在，导致应用无法保存数据。

## 解决方案

### 1. 修改后端配置路径 (`backend/app/core/config.py`)

修改了路径配置，使其在生产环境下使用用户数据目录：

- **Windows**: `%APPDATA%\Document-QA\`
- **macOS**: `~/Library/Application Support/Document-QA/`
- **Linux**: `~/.document-qa/`

```python
import sys
from pathlib import Path

# 获取backend目录的绝对路径
# 在生产环境（打包后）使用用户数据目录，开发环境使用项目目录
if getattr(sys, 'frozen', False):
    # 生产环境：打包后的应用
    # 使用用户数据目录存储数据
    if sys.platform == "win32":
        BACKEND_DIR = Path(os.environ.get('APPDATA', Path.home())) / "Document-QA"
    elif sys.platform == "darwin":
        BACKEND_DIR = Path.home() / "Library" / "Application Support" / "Document-QA"
    else:
        BACKEND_DIR = Path.home() / ".document-qa"
else:
    # 开发环境：使用项目目录
    BACKEND_DIR = Path(__file__).parent.parent.parent.resolve()

DATA_DIR = BACKEND_DIR / "data"
```

### 2. 修复 Uvicorn 启动方式 (`backend/app/main.py`) ⭐ 关键修复

**问题**：打包后使用字符串 `"app.main:app"` 会导致模块导入错误。

**解决**：在生产环境直接传递 `app` 对象给 uvicorn：

```python
if __name__ == "__main__":
    import signal
    import uvicorn
    
    # 确保工作目录正确
    # 在打包环境下，不切换到 backend 目录，使用当前目录
    if not getattr(sys, 'frozen', False):
        # 开发环境：切换到 backend 目录
        os.chdir(_backend_dir)
    
    print(f"启动服务器...")
    print(f"工作目录: {os.getcwd()}")
    print(f"API 文档: http://{settings.HOST}:{settings.PORT}/docs")
    print(f"按 Ctrl+C 优雅退出")
    
    # 配置 uvicorn
    # 在打包环境下直接传递 app 对象，而不是字符串
    if getattr(sys, 'frozen', False):
        # 生产环境：直接使用 app 对象（避免模块导入问题）
        config = uvicorn.Config(
            app,  # ⭐ 直接传递 app 对象，而不是字符串
            host=settings.HOST,
            port=settings.PORT,
            log_level="info",
        )
    else:
        # 开发环境：使用字符串以支持热重载
        config = uvicorn.Config(
            "app.main:app",  # 字符串方式支持热重载
            host=settings.HOST,
            port=settings.PORT,
            reload=settings.DEBUG,
            reload_dirs=[_backend_dir] if settings.DEBUG else None,
        )
    server = uvicorn.Server(config)
    
    # ... 剩余代码
```

### 3. 更新 Tauri 启动逻辑 (`frontend/src-tauri/src/lib.rs`)

添加了在启动后端时设置正确的工作目录：

```rust
#[cfg(not(debug_assertions))]
{
    use std::path::PathBuf;
    
    log::info!("生产模式：启动打包的后端服务");
    
    // 获取用户数据目录
    let data_dir = if cfg!(target_os = "windows") {
        let appdata = std::env::var("APPDATA").unwrap_or_else(|_| {
            dirs::home_dir()
                .unwrap()
                .join("AppData\\Roaming")
                .to_string_lossy()
                .to_string()
        });
        PathBuf::from(appdata).join("Document-QA")
    } else if cfg!(target_os = "macos") {
        dirs::home_dir()
            .unwrap()
            .join("Library")
            .join("Application Support")
            .join("Document-QA")
    } else {
        dirs::home_dir().unwrap().join(".document-qa")
    };
    
    // 确保目录存在
    std::fs::create_dir_all(&data_dir).ok();
    
    let sidecar = shell
        .sidecar("backend")
        .expect("无法找到后端可执行文件")
        .current_dir(data_dir);  // ⭐ 设置工作目录
    
    match sidecar.spawn() {
        // ... 处理进程
    }
}
```

### 4. 确保数据目录创建 (`backend/app/main.py`)

在应用启动时自动创建所需的数据目录：

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    print(f" 正在启动 {settings.PROJECT_NAME}...")
    
    # 确保数据目录存在
    from app.core.config import DATA_DIR
    from pathlib import Path
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.CHROMA_PERSIST_DIRECTORY, exist_ok=True)
    os.makedirs(Path(DATA_DIR) / "thumbnails", exist_ok=True)
    
    # 初始化数据库
    init_db()
    print(" 数据库初始化完成")
    
    yield
    
    print(" 正在关闭应用...")
```

### 5. 添加依赖 (`frontend/src-tauri/Cargo.toml`)

添加了 `dirs` crate 用于跨平台获取用户目录：

```toml
[dependencies]
serde_json = "1.0"
serde = { version = "1.0", features = ["derive"] }
log = "0.4"
tauri = { version = "2.9.5", features = [] }
tauri-plugin-log = "2"
tauri-plugin-shell = "2"
dirs = "5.0"  # ⭐ 新增：跨平台目录支持
```

## 重新打包步骤

### 1. 重新打包后端

```bash
cd backend
python build_backend.py
```

这会生成：`frontend/src-tauri/binaries/backend-x86_64-pc-windows-msvc.exe`（约 141 MB）

### 2. 重新打包前端

```bash
cd frontend
pnpm tauri build
```

输出文件：
- MSI 安装包：`frontend/src-tauri/target/release/bundle/msi/Document-QA_0.1.0_x64_en-US.msi`
- NSIS 安装包：`frontend/src-tauri/target/release/bundle/nsis/Document-QA_0.1.0_x64-setup.exe`

## 验证

打包完成后，测试以下功能：

1. ✅ 应用启动时自动创建数据目录
2. ✅ 后端服务正常启动（端口 8000）
3. ✅ 前端可以连接后端 API
4. ✅ 文件上传功能正常
5. ✅ 文档问答功能正常
6. ✅ 数据持久化（重启应用后数据仍存在）
7. ✅ 无模块导入错误

## 数据位置

用户数据将存储在：

- **Windows**: `C:\Users\<用户名>\AppData\Roaming\Document-QA\data\`
- **macOS**: `/Users/<用户名>/Library/Application Support/Document-QA/data/`
- **Linux**: `/home/<用户名>/.document-qa/data/`

目录结构：
```
Document-QA/
├── data/
│   ├── app.db              # SQLite 数据库
│   ├── chroma/             # 向量数据库
│   ├── uploads/            # 上传的文档
│   └── thumbnails/         # 文档缩略图
```

## 故障排查

### 问题1：后端无法启动

检查日志或启动可执行文件直接查看错误：
```bash
# 直接运行后端（用于调试）
"C:\Users\<用户名>\AppData\Roaming\Document-QA\backend.exe"
```

### 问题2：模块导入错误

确认 [main.py](backend/app/main.py#L216-L240) 中使用了正确的启动方式：
- ✅ 生产环境：`uvicorn.Config(app, ...)` （直接传递对象）
- ❌ 错误方式：`uvicorn.Config("app.main:app", ...)`（字符串方式在打包后无效）

### 问题3：找不到数据文件

确认数据目录已创建并有写入权限：
```bash
# Windows
dir %APPDATA%\Document-QA\data

# Linux/macOS
ls -la ~/.document-qa/data
```

### 问题4：端口冲突

如果 8000 端口被占用，可以修改后端配置或结束占用进程：
```bash
# 查看端口占用（Windows）
netstat -ano | findstr :8000

# 结束进程
taskkill /PID <PID> /F
```

## 关键修改总结

1. ✅ **路径配置**：使用用户数据目录而不是临时目录
2. ✅ **Uvicorn 启动**：生产环境直接传递 `app` 对象（⭐ 最关键的修复）
3. ✅ **工作目录**：Tauri 启动时设置正确的工作目录
4. ✅ **数据目录**：自动创建所需的数据目录
5. ✅ **依赖管理**：添加 `dirs` crate 支持

## 注意事项

1. 打包前确保 `backend/data/llm_config.json` 等配置文件已正确设置
2. 生产环境不会包含开发环境的数据，用户需要重新上传文档
3. 建议提供数据导入/导出功能，方便用户迁移数据
4. Windows Defender 可能会扫描大型可执行文件，首次运行可能较慢

## 环境变量支持（可选）

可以通过环境变量自定义数据目录位置：

```bash
# Windows
set DOCUMENT_QA_DATA_DIR=D:\MyData\DocumentQA

# Linux/macOS
export DOCUMENT_QA_DATA_DIR=/custom/path/documentqa
```

如需支持此功能，可在 `config.py` 中添加：

```python
# 优先使用环境变量
data_dir_env = os.environ.get('DOCUMENT_QA_DATA_DIR')
if data_dir_env:
    BACKEND_DIR = Path(data_dir_env)
elif getattr(sys, 'frozen', False):
    # ... 原有逻辑
```
