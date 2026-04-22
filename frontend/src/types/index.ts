// ============================================================
// Lost & Find — 前端全局类型定义
// ============================================================

// ------------------------------------------------------------
// 用户
// ------------------------------------------------------------

/** 用户信息 */
export interface User {
  id: string
  phone: string | null
  email: string | null
  nickname: string | null
  avatarUrl: string | null
  pushToken: string | null
  wechatOpenId?: string | null
  createdAt: string
  updatedAt: string
}

/** 更新用户信息请求体 */
export interface UpdateUserDto {
  nickname?: string
  avatarUrl?: string
  pushToken?: string
}

// ------------------------------------------------------------
// 二维码
// ------------------------------------------------------------

/** 二维码基础信息 */
export interface QrCode {
  id: string
  userId: string
  token: string
  label: string
  description: string | null
  icon: string | null
  color: string | null
  rewardText: string | null
  isActive: boolean
  qrImageUrl: string | null
  scanCount: number
  createdAt: string
  updatedAt: string
}

/** 包含实时生成 base64 图片数据的二维码详情 */
export interface QrCodeWithImage extends QrCode {
  /** base64 PNG data URL，格式：data:image/png;base64,... */
  qrImageData: string
}

/** 创建二维码请求体 */
export interface CreateQrCodeDto {
  label: string
  description?: string
  icon?: string
  color?: string
  rewardText?: string
}

/** 更新二维码请求体 */
export interface UpdateQrCodeDto {
  label?: string
  description?: string
  icon?: string
  color?: string
  rewardText?: string
}

// ------------------------------------------------------------
// 扫码（公开接口，无需登录）
// ------------------------------------------------------------

/** 扫码后返回的物品公开信息 */
export interface ScanResult {
  label: string
  description: string | null
  icon: string | null
  color: string | null
  rewardText: string | null
  ownerNickname: string | null
  isActive: boolean
}

/** 拾到者发送留言请求体 */
export interface SendMessageDto {
  finderName?: string
  finderContact?: string
  message: string
}

// ------------------------------------------------------------
// 留言
// ------------------------------------------------------------

/** 联系留言 */
export interface ContactMessage {
  id: string
  qrCodeId: string
  finderName: string | null
  finderContact: string | null
  message: string
  isRead: boolean
  createdAt: string
  /** 关联的二维码简要信息（后端按需返回） */
  qrCode?: {
    id: string
    label: string
    icon: string | null
    color: string | null
    token: string
  }
}

// ------------------------------------------------------------
// 认证
// ------------------------------------------------------------

/** 登录成功后返回的 token + 用户信息 */
export interface AuthTokens {
  accessToken: string
  refreshToken: string
  user: User
}

// ------------------------------------------------------------
// API 统一响应格式
// ------------------------------------------------------------

/** 成功响应包装 */
export interface ApiResponse<T> {
  success: true
  data: T
  timestamp: string
}

/** 失败响应结构 */
export interface ApiError {
  success: false
  statusCode: number
  /** 后端可能返回字符串或字符串数组（class-validator 校验错误） */
  message: string | string[]
  error: string
  timestamp: string
  path: string
}

// ------------------------------------------------------------
// 通用工具类型
// ------------------------------------------------------------

/** 分页参数 */
export interface PaginationParams {
  page?: number
  limit?: number
}

/** 未读消息数响应 */
export interface UnreadCountResult {
  count: number
}
