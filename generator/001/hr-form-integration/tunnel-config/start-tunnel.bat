@echo off
REM HR Form Service - Cloudflare Tunnel 启动脚本
REM 用于创建外网访问链接，让候选人可以访问表单页面

echo ============================================
echo   HR Form Service - Cloudflare Tunnel
echo ============================================
echo.

REM 检查 cloudflared 是否安装
where cloudflared >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] cloudflared 未安装
    echo.
    echo 安装方法:
    echo   1. 访问 https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
    echo   2. 或使用 npm: npm install -g cloudflared
    echo.
    pause
    exit /b 1
)

REM 设置目标端口（默认代理服务器端口）
set TARGET_PORT=5173

REM 如果直接穿透 Flask 服务，使用端口 5000
REM set TARGET_PORT=5000

echo [信息] 目标端口: %TARGET_PORT%
echo [信息] 正在启动 Cloudflare Tunnel...
echo.
echo [提示] 外网链接会在几秒后显示，格式如:
echo        https://xxx-xxx-xxx-xxx.trycloudflare.com
echo.
echo [提示] 按 Ctrl+C 可停止隧道
echo --------------------------------------------

cloudflared tunnel --url http://localhost:%TARGET_PORT%