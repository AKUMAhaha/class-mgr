@echo off
chcp 65001 >nul
REM ============================================================
REM  班主任班级管理系统 — 一键部署脚本 (Windows)
REM  只需在「自己电脑」上跑一次（需 Node.js + Cloudflare 账号）
REM ------------------------------------------------------------
REM  准备工作：
REM   1) 安装 Node.js (含 npm)：https://nodejs.org  (LTS 版)
REM   2) 登录 Cloudflare 控制台 → 右上角头像 → My Profile
REM      → API Tokens → Create Token
REM      → 选 "Edit Cloudflare Workers" 模板（含 D1 + Pages 权限）
REM      → 复制生成的 token
REM   3) 在本文件所在目录打开终端，先设置 token（仅当前窗口有效）：
REM        set CLOUDFLARE_API_TOKEN=粘贴你的token
REM   4) 双击本脚本（或在终端运行 _deploy.bat）
REM ============================================================
setlocal EnableDelayedExpansion

REM --- 1. 确保 wrangler 已安装 ---
where wrangler >nul 2>nul
if errorlevel 1 (
  echo [1/6] 未检测到 wrangler，正在全局安装...
  call npm i -g wrangler
) else (
  echo [1/6] wrangler 已存在，跳过安装
)

REM --- 2. 检查 token ---
if "%CLOUDFLARE_API_TOKEN%"=="" (
  echo.
  echo [错误] 未设置 CLOUDFLARE_API_TOKEN 环境变量！
  echo   请先执行： set CLOUDFLARE_API_TOKEN=你的token
  echo   然后重新运行本脚本。
  pause
  exit /b 1
)
echo [2/6] 已检测到 CLOUDFLARE_API_TOKEN，开始部署

REM --- 3. 创建 D1 数据库，提取 uuid 写回 wrangler.toml ---
echo [3/6] 创建 D1 数据库 mec-class-db ...
for /f "delims=" %%i in ('wrangler d1 create mec-class-db --output^=json 2^>nul ^| python -c "import sys,json;d=json.load(sys.stdin);print(d.get('uuid') or d.get('id') or '')"') do set DBID=%%i

if "!DBID!"=="" (
  echo [警告] 无法自动解析 D1 uuid，可能数据库已存在或 token 权限不足。
  echo   请手动到 Cloudflare 控制台 D1 页面查看 mec-class-db 的 uuid，
  echo   并填入 wrangler.toml 第 8 行的 database_id，然后继续。
  set /p DBID=请输入 D1 database_id(uuid) 后回车：
)

REM 写回 wrangler.toml（替换占位符）
python -c "import io;p='wrangler.toml';s=io.open(p,encoding='utf-8').read();s=s.replace('REPLACE_WITH_YOUR_D1_ID','%DBID%');io.open(p,'w',encoding='utf-8').write(s)"
echo       wrangler.toml 已写入 database_id=%DBID%

REM --- 4. 执行建表 ---
echo [4/6] 在 D1 中执行 schema.sql 建表...
wrangler d1 execute mec-class-db --file=./schema.sql
if errorlevel 1 (
  echo [错误] 建表失败，请检查 token 权限与 schema.sql。
  pause
  exit /b 1
)

REM --- 5. 部署到 Cloudflare Pages ---
echo [5/6] 部署站点到 Cloudflare Pages...
wrangler deploy
if errorlevel 1 (
  echo [错误] 部署失败，请查看上方报错。
  pause
  exit /b 1
)

REM --- 6. 提示重生成二维码 ---
echo [6/6] 部署完成！
echo.
echo   请记下你的实网地址，通常为： https://mec-class.pages.dev
echo   然后把 _gen_qr.py 第 19 行的 BASE_URL 改成该地址，运行：
echo       python _gen_qr.py entry
echo   即可生成指向线上、可扫码使用的三端入口二维码。
echo   （每生专属的学生/家长二维码请在教师端花名册录入后由系统生成）
echo.
echo   ============================================================
echo   使用入口：
echo     教师端 : https://mec-class.pages.dev/teacher.html
echo     学生端 : https://mec-class.pages.dev/student.html
echo     家长端 : https://mec-class.pages.dev/parent.html
echo   ============================================================
pause
