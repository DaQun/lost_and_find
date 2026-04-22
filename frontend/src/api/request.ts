// ============================================================
// Lost & Find — 核心 HTTP 请求封装
// 基于 uni.request，支持 JWT 自动刷新与防并发队列
// ============================================================

import type { ApiResponse, ApiError } from '../types'

// 后端 API 基础地址，通过 .env 文件中的 VITE_API_BASE_URL 配置
const BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3000/api/v1'

// ============================================================
// 错误类型定义
// ============================================================

/** 请求错误结构，页面可直接用 message 字段做 uni.showToast 提示 */
export interface RequestError {
  statusCode: number
  message: string
  error: string
}

/** 将后端 ApiError 或未知错误格式化为统一的 RequestError */
function formatError(body: unknown, statusCode: number): RequestError {
  const errBody = body as ApiError | null
  if (errBody && errBody.success === false) {
    const msg = Array.isArray(errBody.message)
      ? errBody.message.join('；')
      : (errBody.message ?? '请求失败')
    return { statusCode, message: msg, error: errBody.error ?? '请求失败' }
  }

  // 对常见 HTTP 状态码给出友好提示
  const defaultMessages: Record<number, string> = {
    400: '请求参数有误',
    401: '登录已过期，请重新登录',
    403: '无权限访问',
    404: '资源不存在',
    429: '操作过于频繁，请稍后再试',
    500: '服务器内部错误，请稍后重试',
    502: '服务暂时不可用',
    503: '服务维护中，请稍后再试',
  }
  return {
    statusCode,
    message: defaultMessages[statusCode] ?? `请求失败（${statusCode}）`,
    error: 'Request Error',
  }
}

// ============================================================
// Token 刷新并发控制
// ============================================================

/** 是否正在进行 token 刷新（防止多个 401 同时触发多次刷新） */
let isRefreshing = false

/** 等待 token 刷新完成后被执行的请求队列 */
interface QueueItem {
  /** token 刷新成功后的回调（newToken 已写入 storage，此参数供参考） */
  onSuccess: (newToken: string) => void
  /** token 刷新失败后的回调 */
  onFailure: (err: RequestError) => void
}
let refreshQueue: QueueItem[] = []

/** 将一个请求挂起到队列 */
function enqueueRequest(item: QueueItem): void {
  refreshQueue.push(item)
}

/** token 刷新成功：将新 token 广播给所有排队中的请求 */
function flushQueue(newToken: string): void {
  const queue = refreshQueue.slice()
  refreshQueue = []
  queue.forEach(({ onSuccess }) => onSuccess(newToken))
}

/** token 刷新失败：通知所有排队中的请求放弃 */
function rejectQueue(err: RequestError): void {
  const queue = refreshQueue.slice()
  refreshQueue = []
  queue.forEach(({ onFailure }) => onFailure(err))
}

// ============================================================
// 清除本地登录状态并强制跳转登录页
// ============================================================

function redirectToLogin(): void {
  uni.removeStorageSync('access_token')
  uni.removeStorageSync('refresh_token')
  uni.removeStorageSync('user')
  uni.reLaunch({ url: '/pages/login/index' })
}

// ============================================================
// 刷新 Access Token
// 直接使用原生 uni.request，避免与封装层循环调用
// ============================================================

function doRefreshToken(): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const refreshToken = uni.getStorageSync('refresh_token') as string
    if (!refreshToken) {
      reject({
        statusCode: 401,
        message: '本地无 refresh_token，请重新登录',
        error: 'No Refresh Token',
      } as RequestError)
      return
    }

    uni.request({
      url: `${BASE_URL}/auth/refresh`,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: { refreshToken },
      success(res) {
        const body = res.data as ApiResponse<{ accessToken: string }> | ApiError

        if (
          res.statusCode === 200 &&
          body &&
          (body as ApiResponse<{ accessToken: string }>).success === true
        ) {
          const newToken = (body as ApiResponse<{ accessToken: string }>).data.accessToken
          // 将新 token 写入本地存储，后续请求从 storage 读取
          uni.setStorageSync('access_token', newToken)
          resolve(newToken)
        } else {
          reject(formatError(body, res.statusCode))
        }
      },
      fail(err) {
        reject({
          statusCode: 0,
          message: err.errMsg || '网络连接失败，token 刷新请求未送达',
          error: 'Network Error',
        } as RequestError)
      },
    })
  })
}

// ============================================================
// 核心请求函数（内部）
// ============================================================

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * 内部请求实现，isRetry 为 true 表示已经是 token 刷新后的重试，
 * 不再触发新一轮刷新，防止死循环。
 */
function rawRequest<T>(
  method: HttpMethod,
  path: string,
  data: Record<string, unknown> | null,
  isRetry: boolean,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const accessToken = uni.getStorageSync('access_token') as string | undefined

    const header: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (accessToken) {
      header['Authorization'] = `Bearer ${accessToken}`
    }

    uni.request({
      url: `${BASE_URL}${path}`,
      method,
      header,
      // GET 请求时 data 会被序列化为 query string；POST/PATCH 时作为 JSON body
      data: data ?? undefined,
      success(res) {
        const statusCode = res.statusCode
        const body = res.data as ApiResponse<T> | ApiError | null

        // ── 2xx 成功响应 ──────────────────────────────────
        if (statusCode >= 200 && statusCode < 300) {
          if (body && (body as ApiResponse<T>).success === true) {
            resolve((body as ApiResponse<T>).data)
          } else {
            // DELETE 等接口成功时 body 为空，resolve undefined
            resolve(undefined as unknown as T)
          }
          return
        }

        // ── 401：Token 过期，尝试无感刷新 ─────────────────
        if (statusCode === 401 && !isRetry) {
          if (isRefreshing) {
            // 已有刷新请求在途中，当前请求入队等待
            enqueueRequest({
              onSuccess() {
                // 新 token 已写入 storage，直接重试即可
                rawRequest<T>(method, path, data, true).then(resolve).catch(reject)
              },
              onFailure(err) {
                reject(err)
              },
            })
          } else {
            // 由当前请求发起刷新
            isRefreshing = true
            doRefreshToken()
              .then((newToken) => {
                isRefreshing = false
                flushQueue(newToken)
                // 刷新成功，用新 token 重试原请求
                rawRequest<T>(method, path, data, true).then(resolve).catch(reject)
              })
              .catch((err: RequestError) => {
                isRefreshing = false
                rejectQueue(err)
                // 刷新彻底失败，清除本地状态并跳转登录
                redirectToLogin()
                reject(err)
              })
          }
          return
        }

        // ── 其他错误（400 / 403 / 404 / 429 / 5xx 等） ───
        reject(formatError(body, statusCode))
      },
      fail(err) {
        // 网络层错误：离线、DNS 解析失败、连接超时等
        reject({
          statusCode: 0,
          message: err.errMsg || '网络连接失败，请检查网络设置后重试',
          error: 'Network Error',
        } as RequestError)
      },
    })
  })
}

// ============================================================
// 对外暴露的语义化请求方法
// ============================================================

/**
 * GET 请求
 * @param path   接口路径（以 / 开头，自动拼接 BASE_URL）
 * @param params query 参数对象，uni.request 自动序列化为 ?key=value
 *
 * @example
 *   get<ContactMessage[]>('/messages', { unreadOnly: true })
 */
function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  return rawRequest<T>('GET', path, params ?? null, false)
}

/**
 * POST 请求
 * @param path 接口路径
 * @param body JSON 请求体
 *
 * @example
 *   post<AuthTokens>('/auth/verify-code', { phone, code })
 */
function post<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  return rawRequest<T>('POST', path, body ?? null, false)
}

/**
 * PATCH 请求（局部更新）
 * @param path 接口路径
 * @param body 需要更新的字段
 *
 * @example
 *   patch<User>('/users/me', { nickname: '新昵称' })
 */
function patch<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  return rawRequest<T>('PATCH', path, body ?? null, false)
}

/**
 * DELETE 请求
 * @param path 接口路径
 *
 * @example
 *   del('/qrcodes/abc123')
 */
function del<T = void>(path: string): Promise<T> {
  return rawRequest<T>('DELETE', path, null, false)
}

// ============================================================
// 统一导出
// ============================================================

export const request = { get, post, patch, del }
export default request
