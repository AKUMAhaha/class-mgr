# 班主任班级管理系统（class-mgr）

面向大一新生班主任的多终端班级管理系统，参考机械制图作业系统的架构（Cloudflare Pages + D1 + Pages Functions）。

## 功能概览

| 终端 | 入口 | 功能 |
|------|------|------|
| **教师端** | `/teacher.html` | 账号密码登录（默认 `teacher123`，建议部署后修改 wrangler.toml 的 `ADMIN`）；录入花名册（仅花名册内学生可登录系统）；统揽全部学生；查看花名册 / 课表 / 期末成绩上传 / 每月学习情况总览；为每个学生生成**专属学生码 + 家长码** |
| **学生端** | `/student.html` | 学号 = 初始账号密码，首次登录强制改密；填个人信息（学习 / 家庭 / 心理）；每月记录（学习状态 / 疑惑 / 心情 / 恋爱 / 生活），**仅自己可见**；查看自己课表与成绩 |
| **家长端** | `/parent.html` | 扫专属家长码进入，只读查看自己孩子的学习 / 家庭 / 心理 / 课表 / 成绩 |

权限隔离在服务端强制实现：学生只能看自己、家长只能看自己孩子、教师看全部。

## 部署（连 GitHub 仓库自动部署，无需本地装工具）

> 前置：一个 Cloudflare 账号（免费）。整个过程都在网页端完成，不需要在电脑上装 Node / wrangler。

1. **建 D1 数据库**：登录 Cloudflare 控制台 → 左侧 `Storage` → `D1` → `Create database`，名称填 **`mec-class-db`**（须与此仓库 `wrangler.toml` 的 `database_name` 一致）。创建后复制它的 **`database_id`**（一串 uuid）。
2. **填 database_id**：在本 GitHub 仓库网页里打开 `wrangler.toml`，把第 8 行
   `database_id = "REPLACE_WITH_YOUR_D1_ID"` 的占位符**替换成第 1 步复制的 uuid**，提交（Commit）。
3. **建表**：回到 Cloudflare 控制台 D1 → 选中 `mec-class-db` → `Query` 标签 → 把本仓库 `schema.sql` 的全部内容粘贴进去执行（创建 students / profiles / schedules / scores / records 五张表）。
4. **连仓库部署**：Cloudflare 控制台 → `Workers & Pages` → `Create` → `Pages` → `Connect to Git` → 选本仓库 `class-mgr` → 构建命令**留空**，构建输出目录填 **`.`**（一个点，表示仓库根）→ `Save and Deploy`。
5. **拿到域名**：部署完成后 Pages 会给出形如 `https://class-mgr.pages.dev` 的地址。
6. **重生成二维码**（可选）：把 `_gen_qr.py` 顶部的 `BASE_URL` 改成你的实网域名，本地跑 `python _gen_qr.py entry` 生成指向线上的三端入口码（仓库里的 `qr/` 是占位参考，需重生成）。

> 若你更习惯命令行，仓库根目录已附 `_deploy.bat` 一键脚本（需本地装 Node + wrangler）。

## 数据表

- `students`（sid, name, pwd, parent_token, created_at）：花名册 + 登录凭证
- `profiles`（sid, family, psych, updated_at）：学生家庭 / 心理档案
- `schedules`（sid, term, data JSON）：每学期课表
- `scores`（sid, term, data JSON）：期末成绩
- `records`（sid, month, learning_status, doubts, mood, relationship, life, updated_at）：每月学习情况

## 文件结构

```
class-mgr/
├── functions/api/[...route].js   # 后端（catch-all，D1 绑定 DB）
├── teacher.html  student.html  parent.html   # 三端前端
├── schema.sql                    # 建表 SQL
├── wrangler.toml                 # 部署配置（含 ADMIN 密码、D1 绑定）
├── _gen_qr.py                    # 二维码生成（部署后改 BASE_URL 重跑）
├── _gen_docx.py                  # Word 使用说明生成
├── _deploy.bat                   # 本地一键部署脚本
├── qr/entry_*.png                # 三端入口二维码（占位，需重生成）
└── 使用说明_班主任班级管理系统.docx  # Word 版使用说明
```

> Deployed 2026-08-15 with D1 binding
