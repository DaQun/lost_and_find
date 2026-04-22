// ============================================================
// Lost & Find — 用户相关 API
// 封装：获取当前用户、更新资料、注销账号
// 所有接口均需要登录（Bearer token 由 request.ts 自动附加）
// ============================================================

import request from "./request";
import type { User, UpdateUserDto } from "../types";

export const usersApi = {
  /**
   * 获取当前登录用户的详细信息
   * GET /users/me
   */
  getMe(): Promise<User> {
    return request.get<User>("/users/me");
  },

  /**
   * 更新当前用户资料（局部更新，仅传需要修改的字段）
   * PATCH /users/me
   *
   * @param dto 需要更新的字段：nickname / avatarUrl / pushToken
   */
  updateMe(dto: UpdateUserDto): Promise<User> {
    return request.patch<User>(
      "/users/me",
      dto as unknown as Record<string, unknown>,
    );
  },

  /**
   * 注销账号
   * DELETE /users/me
   *
   * 后端会级联删除该用户的所有数据（二维码、扫码记录、留言）。
   * 调用方（auth store 的 logout）负责清除本地状态并跳转登录页。
   */
  deleteMe(): Promise<void> {
    return request.del<void>("/users/me");
  },
};
