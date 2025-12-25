# Document Q&A 构建脚本 (Windows PowerShell)
# 用法: .\build.ps1 [命令]
# 命令:
#   dev      - 启动开发模式
#   build    - 构建桌面应用
#   backend  - 仅打包后端
#   clean    - 清理构建产物

param(
    [Parameter(Position=0)]
    [string]$Command = "help"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $ProjectRoot "backend"
$FrontendDir = Join-Path $ProjectRoot "frontend"

function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-Host "=" * 50 -ForegroundColor Cyan
    Write-Host $Text -ForegroundColor Cyan
    Write-Host "=" * 50 -ForegroundColor Cyan
    Write-Host ""
}

function Check-Rust {
    try {
        $null = Get-Command cargo -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

function Check-Python {
    try {
        $null = Get-Command python -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

function Start-Dev {
    Write-Header "启动开发模式"
    
    Write-Host "请在两个终端中分别运行:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "终端 1 (后端):" -ForegroundColor Green
    Write-Host "  cd backend"
    Write-Host "  python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
    Write-Host ""
    Write-Host "终端 2 (前端):" -ForegroundColor Green
    Write-Host "  cd frontend"
    Write-Host "  pnpm dev"
    Write-Host ""
    Write-Host "然后在浏览器中访问 http://localhost:5173" -ForegroundColor Yellow
}

function Build-Backend {
    Write-Header "打包后端服务"
    
    if (-not (Check-Python)) {
        Write-Host "错误: 未找到 Python，请先安装 Python" -ForegroundColor Red
        exit 1
    }
    
    Push-Location $BackendDir
    try {
        Write-Host "正在安装依赖..." -ForegroundColor Yellow
        python -m pip install pyinstaller -q
        
        Write-Host "正在打包后端..." -ForegroundColor Yellow
        python build_backend.py
    } finally {
        Pop-Location
    }
}

function Build-App {
    Write-Header "构建桌面应用"
    
    if (-not (Check-Rust)) {
        Write-Host "错误: 未找到 Rust，请先安装 Rust" -ForegroundColor Red
        Write-Host "访问 https://rustup.rs 下载安装" -ForegroundColor Yellow
        exit 1
    }
    
    # 先打包后端
    Build-Backend
    
    # 构建 Tauri 应用
    Write-Header "构建 Tauri 应用"
    Push-Location $FrontendDir
    try {
        Write-Host "正在安装前端依赖..." -ForegroundColor Yellow
        pnpm install
        
        Write-Host "正在构建应用..." -ForegroundColor Yellow
        pnpm tauri build
        
        Write-Host ""
        Write-Host "构建完成！" -ForegroundColor Green
        Write-Host "安装包位于: src-tauri/target/release/bundle/" -ForegroundColor Yellow
    } finally {
        Pop-Location
    }
}

function Clean-Build {
    Write-Header "清理构建产物"
    
    $DirsToClean = @(
        (Join-Path $BackendDir "dist"),
        (Join-Path $BackendDir "build"),
        (Join-Path $BackendDir "__pycache__"),
        (Join-Path $FrontendDir "dist"),
        (Join-Path $FrontendDir "src-tauri" "target")
    )
    
    foreach ($dir in $DirsToClean) {
        if (Test-Path $dir) {
            Write-Host "删除: $dir" -ForegroundColor Yellow
            Remove-Item -Recurse -Force $dir
        }
    }
    
    Write-Host "清理完成！" -ForegroundColor Green
}

function Show-Help {
    Write-Host ""
    Write-Host "Document Q&A 构建脚本" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "用法: .\build.ps1 [命令]"
    Write-Host ""
    Write-Host "命令:"
    Write-Host "  dev      启动开发模式 (显示启动指南)"
    Write-Host "  build    构建桌面应用 (需要 Rust)"
    Write-Host "  backend  仅打包后端"
    Write-Host "  clean    清理构建产物"
    Write-Host "  help     显示此帮助信息"
    Write-Host ""
}

# 主逻辑
switch ($Command.ToLower()) {
    "dev" { Start-Dev }
    "build" { Build-App }
    "backend" { Build-Backend }
    "clean" { Clean-Build }
    default { Show-Help }
}
