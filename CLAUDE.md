# Lost & Find — CLAUDE.md

> 给 AI 助手的项目上下文文件。每次开始新对话时自动读取。

---

## 项目简介

**Lost & Find** 是一个二维码失物招领 App。
用户将二维码贴在自己的物品上，当物品丢失后，拾到者扫描二维码即可通过平台联系物主，无需直接暴露物主的手机号等隐私信息。

目标平台：iOS、Android、Web H5、微信小程序（前三个优先）。

---

## 仓库结构

```
lost_and_find/
├── CLAUDE.md                  # 本文件
├── lost-finder.jsx            # 早期 React 原型（仅供 UI 参考，非生产代码）
├── backend/                   # NestJS 后端
│   ├── docker-compose.yml     # PostgreSQL 16 + Redis 7
│   ├── .env.example           # 环境变量模板
│   ├── .env                   # 本地环境变量（不提交 git）
│   ├── prisma/
│   │   ├── schema.prisma      # 数据库 Schema（4 张表）
│   │   └── migrations/        # Prisma 自动生成的迁移文件
│   └── src/
│       ├── main.ts            # 入口，Swagger / CORS / 全局管道
│       ├── app.module.ts      # 根模块
│       ├── config/
│       │   └── configuration.ts
│       ├── prisma/            # 全局 PrismaService（@Global）
│       ├── redis/             # 全局 RedisService（@Global, ioredis）
│       ├── common/
│       │   ├── decorators/current-user.decorator.ts
│       │   ├── filters/http-exception.filter.ts
│       │   ├── guards/jwt-auth.guard.ts
│       │   └── interceptors/response.interceptor.ts
│       ├── auth/              # 手机号 OTP 登录、JWT 签发
│       ├── users/             # 用户资料 CRUD
│       ├── qrcodes/           # 二维码生命周期管理
│       ├── scan/              # 扫码公开接口（无需登录）
│       └── messages/          # 物主查看拾到者留言
└── frontend/                  # uni-app 前端（Vue 3 + TypeScript）
    ├── .env                   # 开发环境变量（VITE_API_BASE_URL）
    ├── .env.production        # 生产环境变量
    ├── index.html             # H5 入口
    ├── vite.config.ts
    ├── tsconfig.json
    └── src/
        ├── main.ts            # createSSRApp 入口
        ├── App.vue            # 根组件，onLaunch 鉴权检查
        ├── pages.json         # uni-app 路由 & TabBar 配置
        ├── manifest.json      # 应用配置（App / 小程序 / H5）
        ├── uni.scss           # 全局 SCSS 变量与工具类
        ├── env.d.ts           # Vite 环境变量类型声明
        ├── types/
        │   └── index.ts       # 全局 TypeScript 类型定义
        ├── api/
        │   ├── request.ts     # uni.request 封装（401 自动刷新）
        │   ├── auth.ts
        │   ├── qrcodes.ts
        │   ├── scan.ts        # 公开接口，无需 token
        │   ├── messages.ts
        │   └── users.ts
        ├── stores/
        │   ├── auth.ts        # 用户认证状态（Pinia）
        │   ├── qrcodes.ts     # 二维码列表状态
        │   └── messages.ts    # 消息状态
        ├── pages/
        │   ├── login/index.vue      # 手机号 OTP 登录
        │   ├── index/index.vue      # 首页：我的物品列表（TabBar）
        │   ├── qrcode/create.vue    # 创建二维码
        │   ├── qrcode/detail.vue    # 二维码详情 & 管理
        │   ├── scan/index.vue       # 扫码落地页（公开，无需登录）
        │   ├── messages/index.vue   # 消息中心（TabBar）
        │   └── profile/index.vue    # 个人中心（TabBar）
        └── static/
            └── icons/               # TabBar 图标（需手动放置 PNG）
```

---

## 技术栈

### 后端（`backend/`）

| 层次 | 选型 |
|------|------|
| 框架 | NestJS 10 + TypeScript |
| 平台 | `@nestjs/platform-express`（Express 默认） |
| ORM | Prisma 5 |
| 数据库 | PostgreSQL 16 |
| 缓存 / 会话 | Redis 7（ioredis） |
| 认证 | JWT（`@nestjs/jwt` + `passport-jwt`）|
| 验证 | class-validator + class-transformer |
| API 文档 | Swagger（`@nestjs/swagger`）|
| 限流 | `@nestjs/throttler`（全局 100 req/min，留言接口 3 req/min）|
| QR 生成 | `qrcode` npm 包，生成 base64 PNG Data URL |

### 前端（`frontend/`）

| 层次 | 选型 |
|------|------|
| 框架 | uni-app 5.08 + Vue 3 + TypeScript |
| 构建 | Vite 4 + `@dcloudio/vite-plugin-uni` |
| 状态管理 | Pinia 2 |
| HTTP | uni.request 封装（支持 401 自动刷新 token） |
| 样式 | SCSS（uni.scss 全局变量） |
| 目标平台 | H5 / iOS App / Android App / 微信小程序 |

---

## 本地开发启动

### 前置条件

- Node.js 20 LTS
- Docker Desktop（用于运行 PostgreSQL 和 Redis）

### 后端启动

```bash
cd backend

# 1. 复制环境变量
cp .env.example .env

# 2. 启动数据库 + Redis
docker compose up -d

# 3. 安装依赖
npm install

# 4. 生成 Prisma Client 并建表（首次 / schema 变更后）
npx prisma migrate dev --name <migration_name>

# 5. 启动开发服务器（热重载）
npm run start:dev
```

### 前端启动

```bash
cd frontend

# 1. 安装依赖（首次）
npm install --legacy-peer-deps

# 2. 启动 H5 开发服务器
npm run dev:h5

# 3. 编译微信小程序（需要微信开发者工具）
npm run dev:mp-weixin

# 4. 编译 App（需要 HBuilderX）
npm run dev:app
```

### 服务地址

| 服务 | 地址 |
|------|------|
| 前端 H5 | `http://localhost:5173` |
| 后端 API | `http://localhost:3000/api/v1` |
| Swagger 文档 | `http://localhost:3000/api/v1/docs` |
| PostgreSQL | `localhost:5432`，db=`lost_and_find`，user/pass=`postgres` |
| Redis | `localhost:6379` |

### 后端常用命令

```bash
npm run build          # 编译到 dist/
npm run start          # 运行编译产物
npm run start:dev      # 开发模式（热重载）
npm run start:debug    # 调试模式
npx tsc --noEmit       # 仅做类型检查，不输出文件
npx prisma studio      # 可视化数据库管理界面
npx prisma migrate dev # 应用新迁移
npx prisma generate    # 仅重新生成 Prisma Client
docker compose up -d   # 启动 PostgreSQL + Redis
docker compose down    # 停止容器（保留数据卷）
docker compose down -v # 停止并删除数据卷（清空数据库）
```

### 前端常用命令

```bash
npm run dev:h5             # H5 开发模式（热重载，端口 5173）
npm run build:h5           # 构建 H5 生产包 → dist/build/h5/
npm run dev:mp-weixin      # 微信小程序开发模式 → dist/dev/mp-weixin/
npm run build:mp-weixin    # 构建微信小程序生产包
npm run type-check         # TypeScript 类型检查（不输出文件）
```

---

## 环境变量

### 后端（`backend/.env`，模板见 `.env.example`）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务监听端口 | `3000` |
| `DATABASE_URL` | PostgreSQL 连接串 | `postgresql://postgres:postgres@localhost:5432/lost_and_find` |
| `REDIS_HOST` | Redis 主机 | `localhost` |
| `REDIS_PORT` | Redis 端口 | `6379` |
| `JWT_SECRET` | JWT 签名密钥（生产必须修改） | `your-super-secret-jwt-key-change-in-production` |
| `JWT_ACCESS_EXPIRES_IN` | Access Token 有效期 | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh Token 有效期 | `7d` |
| `FRONTEND_URL` | 前端地址（CORS + QR 二维码 URL） | `http://localhost:5173` |
| `SMS_ENABLED` | 是否接入真实短信 | `false` |
| `SMS_TEST_CODE` | 开发环境固定验证码 | `123456` |

### 前端（`frontend/.env`）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_API_BASE_URL` | 后端 API 地址 | `http://localhost:3000/api/v1` |
| `VITE_APP_NAME` | 应用名称 | `Lost & Find` |

---

## 前端页面路由

| 路径 | 文件 | 说明 | 是否需要登录 |
|------|------|------|------------|
| `/pages/login/index` | `pages/login/index.vue` | 手机号 OTP 登录 | 否 |
| `/pages/index/index` | `pages/index/index.vue` | 我的物品列表（TabBar） | 是 |
| `/pages/qrcode/create` | `pages/qrcode/create.vue` | 添加新物品 / 生成二维码 | 是 |
| `/pages/qrcode/detail?id=` | `pages/qrcode/detail.vue` | 物品详情、下载 QR、启停 | 是 |
| `/pages/scan/index?token=` | `pages/scan/index.vue` | **拾到者落地页**（公开） | 否 |
| `/pages/messages/index` | `pages/messages/index.vue` | 消息中心（TabBar） | 是 |
| `/pages/profile/index` | `pages/profile/index.vue` | 个人中心（TabBar） | 是 |

> **扫码落地页说明**：后端生成的二维码 URL 格式为 `{FRONTEND_URL}/pages/scan/index?token={token}`，任何人用相机扫码都能直接打开，无需安装 App（H5 模式）。

---

## 前端核心模块说明

### `src/api/request.ts` — 请求核心
- 基于 `uni.request` 封装，自动附加 `Authorization: Bearer` 头
- **401 自动刷新**：收到 401 时用 refresh_token 换新 access_token，并发请求自动排队等待，刷新失败则清除登录态并跳转登录页
- 导出 `request.get / post / patch / del`

### `src/stores/auth.ts` — 认证 Store
- `isLoggedIn`：是否已登录
- `login(phone, code)`：调用验证码接口，存储 token 到 `uni.Storage`
- `logout()`：调用后端 logout，清除 token，跳转登录页
- `init()`：App 启动时从 Storage 恢复 token 和 user（必须在 `App.vue` onLaunch 最先调用）

### `src/stores/qrcodes.ts` — 二维码 Store
- 导出名：`useQrCodesStore`（注意大写 C）
- 管理 list / loading / currentQrCode
- create 成功后自动 navigateTo detail 页

### TabBar 图标
TabBar 使用原生图片图标，需要手动放置 PNG 文件到 `src/static/icons/`：
- `home.png` / `home-active.png`（81×81px，颜色 #9CA3AF / #3B82F6）
- `message.png` / `message-active.png`
- `profile.png` / `profile-active.png`
- 可从 [iconfont.cn](https://www.iconfont.cn) 下载

---

## 数据库 Schema

4 张表，全部使用 UUID 主键，字符串 ID。

```
users
  id            uuid PK
  phone         varchar? UNIQUE
  email         varchar? UNIQUE
  nickname      varchar?
  avatarUrl     varchar?
  pushToken     varchar?        -- FCM / APNs token
  wechatOpenId  varchar? UNIQUE
  createdAt / updatedAt

qr_codes
  id            uuid PK
  userId        uuid FK → users(id) CASCADE
  token         varchar UNIQUE  -- 10 位 base64url，构成扫码 URL
  label         varchar         -- 物品名称
  description   varchar?
  icon          varchar?        -- Emoji
  color         varchar?        -- 十六进制颜色
  rewardText    varchar?        -- 悬赏说明
  isActive      bool DEFAULT true
  qrImageUrl    varchar?        -- OSS 图片 URL（当前存 token 占位）
  scanCount     int DEFAULT 0
  createdAt / updatedAt

scan_records
  id            uuid PK
  qrCodeId      uuid FK → qr_codes(id) CASCADE
  ipAddress     varchar?
  userAgent     varchar?
  scannedAt     datetime

contact_messages
  id            uuid PK
  qrCodeId      uuid FK → qr_codes(id) CASCADE
  finderName    varchar?
  finderContact varchar?        -- 电话 / 微信 / 邮箱
  message       varchar
  isRead        bool DEFAULT false
  createdAt     datetime
```

---

## API 接口一览

所有接口以 `/api/v1` 为前缀。完整文档见 Swagger。

### 认证（无需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/send-code` | 发送手机验证码（开发环境固定为 `123456`）|
| POST | `/auth/verify-code` | 验证码登录 / 自动注册，返回 accessToken + refreshToken |
| POST | `/auth/refresh` | 用 refreshToken 换新 accessToken |
| POST | `/auth/logout` | 🔒 撤销 refreshToken |

### 用户（需要登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/users/me` | 🔒 获取当前用户信息 |
| PATCH | `/users/me` | 🔒 更新 nickname / avatarUrl / pushToken |
| DELETE | `/users/me` | 🔒 注销账号（级联删除所有数据）|

### 二维码管理（需要登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/qrcodes` | 🔒 创建二维码，返回记录 + `qrImageData`（base64 PNG）|
| GET | `/qrcodes` | 🔒 获取当前用户所有二维码列表 |
| GET | `/qrcodes/:id` | 🔒 获取单个二维码详情（含 `qrImageData`）|
| PATCH | `/qrcodes/:id` | 🔒 更新标签 / 描述 / 颜色等 |
| DELETE | `/qrcodes/:id` | 🔒 删除二维码 |
| PATCH | `/qrcodes/:id/toggle` | 🔒 启用 / 停用切换 |

### 扫码（无需登录，公开）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/scan/:token` | 获取物品公开信息，同时写入扫码记录 |
| POST | `/scan/:token/message` | 发送留言给物主（限流 3 次/分钟）|

### 消息（需要登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/messages` | 🔒 查看所有留言（支持 `?unreadOnly=true`）|
| GET | `/messages/unread-count` | 🔒 未读留言数 |
| GET | `/messages/:id` | 🔒 获取单条留言详情 |
| PATCH | `/messages/:id/read` | 🔒 标记已读 |

---

## 统一响应格式

**成功响应**（由 `ResponseInterceptor` 包装）：
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

**错误响应**（由 `HttpExceptionFilter` 捕获）：
```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": "错误说明",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "path": "/api/v1/xxx",
  "method": "POST"
}
```

---

## 认证机制

- **Access Token**：JWT，payload `{ sub: userId }`，有效期 15 分钟
- **Refresh Token**：格式 `{userId}:{tokenId}`，存储在 Redis，有效期 7 天
- **注销**：在 Redis 写入 `user_revoked:{userId}` 标记，使所有存活 Token 立即失效
- **多设备**：每次登录生成独立 tokenId，支持多设备同时在线

JWT 通过 `Authorization: Bearer <token>` 请求头传递。

### Redis Key 约定

| Key 格式 | 用途 | TTL |
|---------|------|-----|
| `sms_code:{phone}` | 短信验证码 | 5 分钟 |
| `refresh_token:{userId}:{tokenId}` | Refresh Token 记录 | 7 天 |
| `user_revoked:{userId}` | 账号注销标记 | 7 天 |

---

## 关键设计决策

### QR Code Token 生成
```typescript
// crypto.randomBytes(8).toString('base64url').slice(0, 10)
// 产生 10 位 base64url 字符串，碰撞概率极低
// 生成后循环查库确认唯一性
```

### QR Code 扫描 URL 格式
```
https://{FRONTEND_URL}/q/{token}
```
此 URL 被编码进二维码图片，前端路由负责渲染落地页。

### QR 图片存储（当前 vs 生产）
- **当前**：每次请求实时生成 base64 Data URL，`qrImageUrl` 字段存 token 占位
- **生产计划**：上传到阿里云 OSS，`qrImageUrl` 存持久化 URL

### 扫码记录写入策略
扫码记录写入包裹在 try-catch 中，失败不阻塞物品信息的正常返回，保证拾到者体验。

### 停用的二维码
GET `/scan/:token` 对停用的二维码**仍正常返回**（`isActive: false`），让前端展示"此码已停用"提示。
POST `/scan/:token/message` 对停用的码返回 400，禁止发送留言。

---

## 待实现 / TODO

### 后端
代码中标有 `TODO` 注释的功能：

1. **真实短信服务**：`auth/auth.service.ts` → `sendCode()` 方法，接入阿里云 SMS / 腾讯云 SMS
2. **推送通知**：`scan/scan.service.ts` → `sendMessage()` 方法，留言创建后通知物主（FCM / APNs / 微信模板消息）
3. **OSS 图片上传**：`qrcodes/qrcodes.service.ts` → `create()` 方法，将 base64 改为上传至 OSS

### 前端
1. **TabBar 图标**：`src/static/icons/` 目录下放置真实 PNG 图标文件
2. **微信小程序 appid**：`src/manifest.json` → `mp-weixin.appid` 填入真实小程序 appid
3. **生产 API 地址**：`frontend/.env.production` → `VITE_API_BASE_URL` 替换为真实域名
4. **下载二维码**：detail 页的"保存图片"功能在真机上需申请相册权限

---

## 代码规范

### 后端
- 所有注释和错误信息使用**中文**
- Import 路径使用**相对路径**（无 `@/` 别名，因 tsconfig paths 仅供 IDE 使用）
- DTO 必须使用 `class-validator` 装饰器，必填字段加 `!` 定义确定赋值（strict 模式）
- Service 方法抛出 NestJS 内置异常（`NotFoundException`、`ForbiddenException` 等）
- Controller 方法加 `@ApiOperation` 和 `@ApiResponse` 装饰器
- 全局 `ValidationPipe` 配置了 `whitelist: true` + `forbidNonWhitelisted: true`，DTO 之外的字段会被拒绝

### 前端
- 所有页面使用 `<script setup lang="ts">` + Composition API
- uni-app 生命周期从 `@dcloudio/uni-app` 导入（`onLoad`、`onShow`、`onPullDownRefresh` 等）
- Import 路径使用 `@/` 别名（已在 tsconfig.json 配置）
- 样式写在 `<style scoped lang="scss">` 中，尺寸使用 `rpx` 单位
- 错误处理统一用 `uni.showToast({ title: '...', icon: 'none' })`
- Pinia store 命名：`useAuthStore`、`useQrCodesStore`（注意大写 C）、`useMessagesStore`

---

## 已验证可用的测试流程

### 后端 API（curl）

```bash
# 发送验证码（开发环境，控制台打印 123456）
curl -s -X POST http://localhost:3000/api/v1/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000"}'

# 登录（使用固定验证码 123456）
curl -s -X POST http://localhost:3000/api/v1/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","code":"123456"}'

# 创建二维码（替换 <TOKEN> 为上一步返回的 accessToken）
curl -s -X POST http://localhost:3000/api/v1/qrcodes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"label":"我的背包","icon":"🎒","color":"#3B82F6","rewardText":"必有重谢"}'

# 扫码（公开，无需登录）
curl -s http://localhost:3000/api/v1/scan/<QR_TOKEN>

# 拾到者留言
curl -s -X POST http://localhost:3000/api/v1/scan/<QR_TOKEN>/message \
  -H "Content-Type: application/json" \
  -d '{"finderName":"张三","finderContact":"微信: zhangsan","message":"您好，我捡到了您的物品"}'

# 查看留言
curl -s http://localhost:3000/api/v1/messages \
  -H "Authorization: Bearer <TOKEN>"
```

### 前端（浏览器）

```
# H5 开发模式（需先启动后端）
cd frontend && npm run dev:h5

# 访问地址
http://localhost:5173                           # 自动跳转登录页
http://localhost:5173/pages/login/index         # 登录页
http://localhost:5173/pages/index/index         # 首页（需已登录）
http://localhost:5173/pages/scan/index?token=xx # 扫码落地页（无需登录）
http://localhost:3000/api/v1/docs               # Swagger API 文档
```
