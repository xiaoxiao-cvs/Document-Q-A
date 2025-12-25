# 快速测试脚本 - 在有 Rust 环境的新 PowerShell 窗口中运行

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Document Q&A 功能测试" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. 检查环境
Write-Host "1. 检查环境..." -ForegroundColor Yellow
Write-Host "   Python: $(python --version)" -ForegroundColor Gray
Write-Host "   Cargo: $(cargo --version)" -ForegroundColor Gray
Write-Host "   Node: $(node --version)" -ForegroundColor Gray
Write-Host ""

# 2. 测试后端
Write-Host "2. 测试后端服务..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/settings/llm" -Method GET -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✓ 后端 API 正常" -ForegroundColor Green
        $config = $response.Content | ConvertFrom-Json
        Write-Host "   模型: $($config.model)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ✗ 后端未运行，请先启动: .\scripts\start-dev.ps1" -ForegroundColor Red
}
Write-Host ""

# 3. 检查后端打包文件
Write-Host "3. 检查后端打包..." -ForegroundColor Yellow
$backendExe = "d:\Repo\Document-Q-A\frontend\src-tauri\binaries\backend-x86_64-pc-windows-msvc.exe"
if (Test-Path $backendExe) {
    $size = (Get-Item $backendExe).Length / 1MB
    Write-Host "   ✓ 后端可执行文件存在 (大小: $([math]::Round($size, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host "   ✗ 后端可执行文件不存在" -ForegroundColor Red
}
Write-Host ""

# 4. 测试前端构建
Write-Host "4. 检查前端构建..." -ForegroundColor Yellow
$distDir = "d:\Repo\Document-Q-A\frontend\dist"
if (Test-Path "$distDir\index.html") {
    Write-Host "   ✓ 前端已构建" -ForegroundColor Green
} else {
    Write-Host "   ✗ 前端未构建，请运行: pnpm build" -ForegroundColor Red
}
Write-Host ""

# 5. Tauri 构建选项
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "准备就绪！你可以选择:" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "A. 开发模式测试 (推荐):" -ForegroundColor Yellow
Write-Host "   cd d:\Repo\Document-Q-A\frontend" -ForegroundColor Gray
Write-Host "   pnpm tauri dev" -ForegroundColor Gray
Write-Host "   (会打开桌面窗口，前端连接到 localhost:5173)" -ForegroundColor Gray
Write-Host ""
Write-Host "B. 构建生产版本:" -ForegroundColor Yellow
Write-Host "   cd d:\Repo\Document-Q-A\frontend" -ForegroundColor Gray
Write-Host "   pnpm tauri build" -ForegroundColor Gray
Write-Host "   (需要 10-30 分钟，首次会下载大量依赖)" -ForegroundColor Gray
Write-Host ""
Write-Host "C. 继续使用 Web 版本:" -ForegroundColor Yellow
Write-Host "   访问 http://localhost:5173" -ForegroundColor Gray
Write-Host "   (无需打包，功能完整)" -ForegroundColor Gray
Write-Host ""

Write-Host "按任意键退出..." -ForegroundColor Gray
$null = Read-Host
