@echo off
chcp 936 > nul
title Tag Master Dev Launcher
echo ==========================================
echo       Tag Master 自动打标助手启动器
echo ==========================================
echo.
echo [提示] 正在为您启动本地开发服务，并自动打开浏览器...
echo.
call npm run dev -- --open
if %errorlevel% neq 0 (
    echo.
    echo [错误] 启动失败。请确保您已经安装了项目依赖 (运行 npm install)。
    echo.
    pause
)