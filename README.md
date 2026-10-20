# TodoAll

TodoAll 是一个面向个人执行管理的多用户 Web 应用。它把长期目标、重复计划、每日任务和分次完成记录连接起来，并通过 Bark 提醒用户完成当天任务。

## 产品定位

TodoAll 不是普通的待办清单，而是一个“目标驱动的计划执行器”：

```text
目标 -> 计划 -> 每日任务 -> 分次执行记录 -> 统计与复盘
```

第一版采用响应式、移动端优先的 Web 设计，并支持 PWA，方便从 iPhone 主屏幕直接使用。

## 第一版范围

- 管理员创建、禁用和重置用户账号
- 用户登录、首次登录修改密码、自助修改密码
- 用户数据严格隔离
- 创建目标并设置截止日期
- 创建单日、每日、每周指定星期的计划
- 支持勾选、次数、时长、距离和自定义数量任务
- 将计划生成每日任务，并支持分次记录进度
- 今日任务、历史记录和基础统计
- Bark 每日未完成汇总与时间点任务提醒

## 文档

- [MVP 产品需求](docs/product-requirements.md)
- [核心数据模型](docs/data-model.md)
- [实施路线图](docs/implementation-plan.md)

## 已实现

第一版完整主链路已经实现：账号与管理员、目标、重复计划、每日任务快照、分次进度、历史纠错、统计、Bark 通知设置与后台调度、PWA 安装及 Docker 部署。

## 本地启动

项目使用 Node.js 24。首次运行：

```bash
cp .env.example .env
# 编辑 .env，为 BARK_ENCRYPTION_KEY 设置一段长期不变的随机值
npm install
npm run db:deploy
ADMIN_LOGIN=admin ADMIN_NAME=管理员 ADMIN_PASSWORD='请替换为安全临时密码' npm run admin:create
npm run dev
```

管理员第一次登录时必须修改临时密码。不要把真实密码写进 `.env`、提交记录或部署日志。

数据库迁移命令会自动创建 SQLite 文件，并在迁移完成后启用 WAL 模式。生产环境使用 `npm run db:deploy` 应用已提交的迁移。

另开一个终端运行 Bark 调度进程：

```bash
npm run worker
```

## Docker 部署

准备 `.env` 后运行：

```bash
docker compose up -d --build
docker compose run --rm web env ADMIN_LOGIN=admin ADMIN_NAME=管理员 ADMIN_PASSWORD='请替换为安全临时密码' npm run admin:create
```

Web 服务和通知 worker 共享同一个 SQLite 数据卷。生产环境应通过 HTTPS 反向代理暴露 Web 服务，并妥善保存 `.env` 中的加密密钥；密钥改变后，已保存的 Bark 地址将无法解密。

## 备份与恢复

运行一致性在线备份：

```bash
npm run db:backup
```

备份默认写入 `backups/`。恢复前先停止 Web 与 worker，保留现有数据库副本，再用所选备份替换 `data/todoall.db`，运行 `npm run db:deploy` 后重启。Docker 数据卷可用临时容器挂载后执行同样的 `sqlite3 .backup` 流程。

## iPhone 安装

用 Safari 打开已启用 HTTPS 的站点，选择“分享”→“添加到主屏幕”。PWA 不缓存登录后的页面或用户数据，只缓存版本化静态资源。
