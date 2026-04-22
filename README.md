# Lost & Find

一个二维码失物招领平台。用户将二维码贴在自己的物品上，当物品丢失后，拾到者扫描二维码即可通过平台联系物主，无需直接暴露物主的手机号等隐私信息。

## 功能特性

- **二维码管理**：创建、编辑、启用/停用物品二维码
- **扫码留言**：拾到者扫描二维码，填写留言联系物主
- **隐私保护**：物主与拾到者之间通过平台匿名沟通，不直接暴露手机号
- **多平台支持**：iOS、Android、Web H5、微信小程序

## 技术栈

### 后端

- **框架**：NestJS 10 + TypeScript
- **数据库**：PostgreSQL 16 + Prisma 5
- **缓存/会话**：Redis 7 (ioredis)
- **认证**：JWT + Refresh Token
- **API 文档**：Swagger

### 前端

- **框架**：uni-app 5.08 + Vue 3 + TypeScript
- **状态管理**：Pinia 2
- **构建工具**：Vite 4

## 项目结构

```
lost_and_find/
├── backend/                   # NestJS 后端
│   ├── prisma/
│   │   └── schema.prisma     # 数据库 Schema
│   └── src/
│       ├── auth/             # 手机号 OTP 登录、JWT 签发
│       ├── users/            # 用户资料 CRUD
│       ├── qrcodes/          # 二维码生命周期管理
│       ├── scan/             # 扫码公开接口
│       └── messages/         # 物主查看拾到者留言
├── frontend/                  # uni-app 前端
│   └── src/
│       ├── pages/            # 页面组件
│       ├── stores/           # Pinia 状态管理
│       └── api/              # API 请求封装
└── CLAUDE.md                 # 项目上下文文档
```

## 快速开始

### 前置条件

- Node.js 20 LTS
- Docker Desktop

### 后端启动

```bash
cd backend

# 复制环境变量
cp .env.example .env

# 启动数据库 + Redis
docker compose up -d

# 安装依赖
npm install

# 生成 Prisma Client 并建表
npx prisma migrate dev --name init

# 启动开发服务器
npm run start:dev
```

### 前端启动

```bash
cd frontend

# 安装依赖
npm install --legacy-peer-deps

# 启动 H5 开发服务器
npm run dev:h5
```

### 服务地址

| 服务 | 地址 |
|------|------|
| 前端 H5 | http://localhost:5173 |
| 后端 API | http://localhost:3000/api/v1 |
| Swagger 文档 | http://localhost:3000/api/v1/docs |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

## API 接口

### 认证接口（无需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /auth/send-code | 发送手机验证码 |
| POST | /auth/verify-code | 验证码登录/注册 |
| POST | /auth/refresh | 刷新 Access Token |
| POST | /auth/logout | 注销登录 |

### 二维码接口（需要登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /qrcodes | 创建二维码 |
| GET | /qrcodes | 获取二维码列表 |
| GET | /qrcodes/:id | 获取二维码详情 |
| PATCH | /qrcodes/:id | 更新二维码 |
| DELETE | /qrcodes/:id | 删除二维码 |
| PATCH | /qrcodes/:id/toggle | 启用/停用切换 |

### 扫码接口（公开）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /scan/:token | 获取物品信息 |
| POST | /scan/:token/message | 发送留言 |

### 消息接口（需要登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /messages | 获取留言列表 |
| GET | /messages/unread-count | 未读留言数 |
| PATCH | /messages/:id/read | 标记已读 |

## 数据库 Schema

### users（用户表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| phone | varchar | 手机号（唯一） |
| nickname | varchar | 昵称 |
| avatarUrl | varchar | 头像 URL |
| createdAt | datetime | 创建时间 |
| updatedAt | datetime | 更新时间 |

### qr_codes（二维码表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| userId | uuid | 物主 ID |
| token | varchar | 二维码 Token（唯一） |
| label | varchar | 物品名称 |
| description | varchar | 物品描述 |
| icon | varchar | Emoji 图标 |
| color | varchar | 主题颜色 |
| isActive | bool | 是否启用 |
| scanCount | int | 扫码次数 |

### contact_messages（留言表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| qrCodeId | uuid | 二维码 ID |
| finderName | varchar | 拾到者姓名 |
| finderContact | varchar | 联系方式 |
| message | varchar | 留言内容 |
| isRead | bool | 是否已读 |

## 环境变量

### 后端（backend/.env）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| PORT | 服务端口 | 3000 |
| DATABASE_URL | PostgreSQL 连接串 | postgresql://postgres:postgres@localhost:5432/lost_and_find |
| REDIS_HOST | Redis 主机 | localhost |
| REDIS_PORT | Redis 端口 | 6379 |
| JWT_SECRET | JWT 密钥 | - |
| FRONTEND_URL | 前端地址 | http://localhost:5173 |

### 前端（frontend/.env）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| VITE_API_BASE_URL | 后端 API 地址 | http://localhost:3000/api/v1 |
| VITE_APP_NAME | 应用名称 | Lost & Find |

## 开发测试

### 发送验证码

```bash
curl -X POST http://localhost:3000/api/v1/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000"}'
```

### 登录（开发环境验证码固定为 `123456`）

```bash
curl -X POST http://localhost:3000/api/v1/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","code":"123456"}'
```

## 许可证

MIT
