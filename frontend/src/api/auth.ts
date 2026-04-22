// ============================================================
// Lost & Find — 认证相关 API
// 封装：发送验证码、验证码登录、刷新 token、登出
// ============================================================

import request from "./request";
import type { AuthTokens } from "../types";

export const authApi = {
  /**
   * 发送手机验证码
   * 开发环境固定验证码为 123456（后端控制台输出）
   * @param phone 手机号
   */
  sendCode(phone: string): Promise<{ message: string }> {
    return request.post<{ message: string }>("/auth/send-code", { phone });
  },

  /**
   * 验证码登录 / 自动注册
   * 成功后返回 accessToken、refreshToken 和用户信息
   * @param phone 手机号
   * @param code  6 位数字验证码
   */
  verifyCode(phone: string, code: string): Promise<AuthTokens> {
    return request.post<AuthTokens>("/auth/verify-code", { phone, code });
  },

  /**
   * 用 refreshToken 换取新的 accessToken
   * 该方法主要供 request.ts 内部的 401 自动刷新逻辑调用，
   * 一般不需要在业务代码中直接使用。
   * @param refreshToken 本地存储的刷新令牌
   */
  refresh(refreshToken: string): Promise<{ accessToken: string }> {
    return request.post<{ accessToken: string }>("/auth/refresh", {
      refreshToken,
    });
  },

  /**
   * 登出
   * 后端会将 refreshToken 从 Redis 中撤销，使所有设备的 token 立即失效
   * @param refreshToken 当前设备的刷新令牌
   */
  logout(refreshToken: string): Promise<{ message: string }> {
    return request.post<{ message: string }>("/auth/logout", { refreshToken });
  },
};
