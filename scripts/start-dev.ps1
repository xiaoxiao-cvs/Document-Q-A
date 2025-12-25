# 开发模式启动脚本
# 使用说明: .\start-dev.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Document Q&A 开发模式启动助手" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$BackendDir = "d:\Repo\Document-Q-A\backend"
$FrontendDir = "d:\Repo\Document-Q-A\frontend"

# 检查是否已经有后端在运行
$BackendProcess = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($BackendProcess) {
    Write-Host "✓ 检测到后端已在端口 8000 运行" -ForegroundColor Green
} else {
    Write-Host "启动后端服务..." -ForegroundColor Yellow
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$BackendDir' ; python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
    Write-Host "✓ 后端服务已在新窗口启动" -ForegroundColor Green
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "启动前端开发服务器..." -ForegroundColor Yellow
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$FrontendDir' ; pnpm dev"
Write-Host "✓ 前端服务已在新窗口启动" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  开发环境已启动!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "前端地址: http://localhost:5173" -ForegroundColor Yellow
Write-Host "后端地址: http://localhost:8000" -ForegroundColor Yellow
Write-Host "API 文档: http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host ""
Write-Host "提示: 点击界面右上角 ⚙️ 图标配置 LLM 模型" -ForegroundColor Cyan
Write-Host ""
