# Tianjin Exam Radar

手机优先的 Web 页面，用来跟踪天津市公务员、事业单位、选调/遴选等考试公告。

## 目录结构

```text
.
├─ public/              # 前端页面、样式和交互
├─ src/                 # Node.js 后端服务
├─ scripts/             # 本地辅助运行脚本
├─ tests/               # Node 测试
├─ deploy/              # 部署示例配置
├─ logs/                # 本地运行日志，已忽略
├─ Dockerfile
├─ package.json
└─ README.md
```

## 数据来源

- 天津人事考试网通知公告
- 天津市事业单位公开招聘

服务端会抓取官方公开页面，解析公告标题、日期、来源和原文链接。服务启动时会自动抓取一次，之后每隔 1 小时自动刷新一次。

## 本地运行

推荐安装 Node.js 18+ 后运行：

```bash
npm start
```

当前 Windows 机器如果暂时没有 Node.js，也可以用 PowerShell 版本地服务：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-local.ps1
```

打开：

```text
http://localhost:3000
```

## 部署

部署到服务器请看：

```text
deploy/README.md
```

推荐方式：

- 有 Docker：用 `Dockerfile` 构建并运行。
- 普通 Linux 服务器：用 Node.js + `deploy/gongwuxinxi-spider.service` 托管进程。
- 有域名：用 Nginx 反向代理到 `127.0.0.1:3000`。

## 接口

```text
GET /api/exams
GET /api/exams?refresh=1
```

`refresh=1` 会跳过缓存，立即重新拉取官方页面。普通请求会读取最近一次自动抓取的缓存结果。
