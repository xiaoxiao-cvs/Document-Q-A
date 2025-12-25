# Tauri 构建脚本
# 请在新的 PowerShell 窗口中运行此脚本

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Document Q&A Tauri 构建脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Rust
Write-Host "检查 Rust 环境..." -ForegroundColor Yellow
try {
    $cargoVersion = cargo --version
    Write-Host "✓ Rust 已安装: $cargoVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ 错误: 未找到 Rust" -ForegroundColor Red
    Write-Host "  请访问 https://rustup.rs 安装 Rust" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "开始构建 Tauri 应用..." -ForegroundColor Yellow
Write-Host "这可能需要 10-30 分钟（首次构建会下载依赖）" -ForegroundColor Cyan
Write-Host ""

cd "d:\Repo\Document-Q-A\frontend"

# 构建
pnpm tauri build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  构建成功！" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "安装包位置:" -ForegroundColor Yellow
    Write-Host "  src-tauri\target\release\bundle\msi\" -ForegroundColor Cyan
    Write-Host "  或" -ForegroundColor Yellow
    Write-Host "  src-tauri\target\release\bundle\nsis\" -ForegroundColor Cyan
    Write-Host ""
    
    # 打开文件夹
    $bundleDir = "d:\Repo\Document-Q-A\frontend\src-tauri\target\release\bundle"
    if (Test-Path $bundleDir) {
        explorer $bundleDir
    }
} else {
    Write-Host ""
    Write-Host "构建失败！请检查错误信息" -ForegroundColor Red
}

Write-Host ""
Write-Host "按任意键退出..." -ForegroundColor Gray
$null = Read-Host
