"""
打包脚本 - 将后端服务打包为可执行文件

使用方法:
    python build_backend.py

依赖:
    pip install pyinstaller
"""
import os
import sys
import shutil
import subprocess
from pathlib import Path

# 项目路径
BACKEND_DIR = Path(__file__).parent
PROJECT_ROOT = BACKEND_DIR.parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"
TAURI_BINARIES_DIR = FRONTEND_DIR / "src-tauri" / "binaries"

def get_target_triple():
    """获取目标平台的 triple"""
    import platform
    
    system = platform.system().lower()
    machine = platform.machine().lower()
    
    if system == "windows":
        if machine in ("amd64", "x86_64"):
            return "x86_64-pc-windows-msvc"
        elif machine in ("arm64", "aarch64"):
            return "aarch64-pc-windows-msvc"
    elif system == "darwin":
        if machine in ("arm64", "aarch64"):
            return "aarch64-apple-darwin"
        else:
            return "x86_64-apple-darwin"
    elif system == "linux":
        if machine in ("amd64", "x86_64"):
            return "x86_64-unknown-linux-gnu"
        elif machine in ("arm64", "aarch64"):
            return "aarch64-unknown-linux-gnu"
    
    raise RuntimeError(f"不支持的平台: {system}-{machine}")

def main():
    print("=" * 50)
    print("Document Q&A 后端打包脚本")
    print("=" * 50)
    
    # 切换到后端目录
    os.chdir(BACKEND_DIR)
    
    # 获取目标平台
    target_triple = get_target_triple()
    print(f"\n目标平台: {target_triple}")
    
    # 创建 binaries 目录
    TAURI_BINARIES_DIR.mkdir(parents=True, exist_ok=True)
    
    # 运行 PyInstaller
    print("\n正在打包后端服务...")
    result = subprocess.run([
        sys.executable, "-m", "PyInstaller",
        "--clean",
        "--noconfirm",
        "backend.spec"
    ], capture_output=False)
    
    if result.returncode != 0:
        print("打包失败!")
        sys.exit(1)
    
    # 获取输出文件
    dist_dir = BACKEND_DIR / "dist"
    
    # Windows 平台
    if sys.platform == "win32":
        exe_name = "backend.exe"
        target_name = f"backend-{target_triple}.exe"
    else:
        exe_name = "backend"
        target_name = f"backend-{target_triple}"
    
    source_exe = dist_dir / exe_name
    target_exe = TAURI_BINARIES_DIR / target_name
    
    if source_exe.exists():
        print(f"\n复制可执行文件到: {target_exe}")
        shutil.copy2(source_exe, target_exe)
        print(f"文件大小: {target_exe.stat().st_size / 1024 / 1024:.2f} MB")
    else:
        print(f"错误: 找不到输出文件 {source_exe}")
        sys.exit(1)
    
    print("\n" + "=" * 50)
    print("打包完成!")
    print("=" * 50)
    print(f"\n输出文件: {target_exe}")
    print("\n下一步:")
    print("  cd frontend")
    print("  pnpm tauri build")

if __name__ == "__main__":
    main()
