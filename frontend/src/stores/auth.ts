// ============================================================
// Lost & Find — 认证 Pinia Store
// 管理用户登录状态、双 Token 持久化、App 启动时恢复会话
// ============================================================

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { authApi } from "../api/auth";
import type { User } from "../types";

// ── 本地存储 Key 常量 ──────────────────────────────────────
const KEY_ACCESS_TOKEN = "access_token";
const KEY_REFRESH_TOKEN = "refresh_token";
const KEY_USER = "user";

export const useAuthStore = defineStore("auth", () => {
  // ==========================================================
  // State
  // ==========================================================

  /** 当前登录用户信息，null 表示未登录 */
  const user = ref<User | null>(null);

  /** JWT Access Token（有效期 15 分钟），null 表示未登录 */
  const accessToken = ref<string | null>(null);

  /** Refresh Token（有效期 7 天），null 表示未登录 */
  const refreshToken = ref<string | null>(null);

  // ==========================================================
  // Getters
  // ==========================================================

  /** 是否已登录（以 accessToken 是否存在为准） */
  const isLoggedIn = computed(() => !!accessToken.value);

  /**
   * 展示名称：优先昵称，其次手机号末四位，最后显示默认文字
   * 方便各页面直接使用，无需重复判断
   */
  const displayName = computed(() => {
    if (user.value?.nickname) return user.value.nickname;
    if (user.value?.phone) return `用户${user.value.phone.slice(-4)}`;
    return "未命名用户";
  });

  // ==========================================================
  // 内部工具函数
  // ==========================================================

  /** 将 token 和用户信息同步写入本地存储 */
  function _persistAll(access: string, refresh: string, userInfo: User): void {
    uni.setStorageSync(KEY_ACCESS_TOKEN, access);
    uni.setStorageSync(KEY_REFRESH_TOKEN, refresh);
    uni.setStorageSync(KEY_USER, JSON.stringify(userInfo));
  }

  /** 清除本地存储中的所有认证数据 */
  function _clearStorage(): void {
    uni.removeStorageSync(KEY_ACCESS_TOKEN);
    uni.removeStorageSync(KEY_REFRESH_TOKEN);
    uni.removeStorageSync(KEY_USER);
  }

  // ==========================================================
  // Actions
  // ==========================================================

  /**
   * 发送手机验证码
   * 开发环境无需真实短信，后端固定返回 123456
   *
   * @param phone 手机号
   */
  async function sendCode(phone: string): Promise<void> {
    try {
      await authApi.sendCode(phone);
      // 提示用户验证码已发送，避免页面感知后端是否真实发送
      uni.showToast({ title: "验证码已发送", icon: "success" });
    } catch (err: unknown) {
      const msg = _extractMessage(err, "发送验证码失败");
      uni.showToast({ title: msg, icon: "none" });
      // 向调用方重新抛出，供页面决定是否阻止按钮冷却计时器启动
      throw err;
    }
  }

  /**
   * 验证码登录（首次使用自动注册）
   * 成功后：
   *  1. 将 token 和用户信息写入 state
   *  2. 持久化到 uni.storage
   *
   * @param phone 手机号
   * @param code  6 位数字验证码
   */
  async function login(phone: string, code: string): Promise<void> {
    try {
      const result = await authApi.verifyCode(phone, code);

      // 写入 state
      accessToken.value = result.accessToken;
      refreshToken.value = result.refreshToken;
      user.value = result.user;

      // 持久化到本地存储
      _persistAll(result.accessToken, result.refreshToken, result.user);

      uni.showToast({ title: "登录成功", icon: "success" });
    } catch (err: unknown) {
      const msg = _extractMessage(err, "登录失败，请检查验证码");
      uni.showToast({ title: msg, icon: "none" });
      throw err;
    }
  }

  /**
   * 退出登录
   * 1. 调用后端撤销 refreshToken（Redis 中删除记录）
   * 2. 清除本地 state 和 storage
   * 3. 跳转到登录页
   *
   * 即使后端接口失败，仍会执行本地清除和跳转，保证用户能退出。
   */
  async function logout(): Promise<void> {
    // 尽力通知后端撤销 token，失败不阻塞本地清除
    if (refreshToken.value) {
      try {
        await authApi.logout(refreshToken.value);
      } catch {
        // 静默忽略：网络问题不应阻止用户退出
      }
    }

    // 清除内存状态
    user.value = null;
    accessToken.value = null;
    refreshToken.value = null;

    // 清除本地存储
    _clearStorage();

    // 跳转登录页（清空路由栈）
    uni.reLaunch({ url: "/pages/login/index" });
  }

  /**
   * 更新 token（供 request.ts 无感刷新成功后调用）
   * 仅更新 accessToken；如果同时获得新的 refreshToken 也可一并更新。
   *
   * @param newAccessToken  新的 Access Token
   * @param newRefreshToken 新的 Refresh Token（可选，通常刷新接口只返回 accessToken）
   */
  function setTokens(newAccessToken: string, newRefreshToken?: string): void {
    accessToken.value = newAccessToken;
    uni.setStorageSync(KEY_ACCESS_TOKEN, newAccessToken);

    if (newRefreshToken) {
      refreshToken.value = newRefreshToken;
      uni.setStorageSync(KEY_REFRESH_TOKEN, newRefreshToken);
    }
  }

  /**
   * 从本地存储恢复登录状态（App.vue onLaunch 时调用）
   * 若本地存有 token，则无需重新登录即可继续使用。
   * user 数据从缓存中读取，首次打开有网络时页面可自行刷新最新数据。
   */
  function init(): void {
    const storedAccess = uni.getStorageSync(KEY_ACCESS_TOKEN) as
      | string
      | undefined;
    const storedRefresh = uni.getStorageSync(KEY_REFRESH_TOKEN) as
      | string
      | undefined;
    const storedUser = uni.getStorageSync(KEY_USER) as string | undefined;

    if (storedAccess) {
      accessToken.value = storedAccess;
    }
    if (storedRefresh) {
      refreshToken.value = storedRefresh;
    }
    if (storedUser) {
      try {
        user.value = JSON.parse(storedUser) as User;
      } catch {
        // JSON 解析失败（数据损坏），忽略，保持 user 为 null
        uni.removeStorageSync(KEY_USER);
      }
    }
  }

  /**
   * 更新当前用户信息缓存（用户资料页 PATCH 成功后调用）
   * 同步更新 state 和 storage，无需重新登录。
   *
   * @param partial 需要更新的字段（局部更新）
   */
  function updateUser(partial: Partial<User>): void {
    if (!user.value) return;
    user.value = { ...user.value, ...partial };
    uni.setStorageSync(KEY_USER, JSON.stringify(user.value));
  }

  // ==========================================================
  // 内部辅助：提取错误消息
  // ==========================================================

  function _extractMessage(err: unknown, fallback: string): string {
    if (err && typeof err === "object" && "message" in err) {
      const msg = (err as { message: string | string[] }).message;
      return Array.isArray(msg) ? msg.join("；") : (msg ?? fallback);
    }
    return fallback;
  }

  // ==========================================================
  // 导出
  // ==========================================================

  return {
    // State
    user,
    accessToken,
    refreshToken,
    // Getters
    isLoggedIn,
    displayName,
    // Actions
    sendCode,
    login,
    logout,
    setTokens,
    init,
    updateUser,
  };
});
