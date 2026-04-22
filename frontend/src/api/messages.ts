// ============================================================
// Lost & Find — 消息相关 API
// 封装：获取列表、未读数、单条详情、标记已读
// 所有接口均需要登录（Bearer token 由 request.ts 自动附加）
// ============================================================

import request from "./request";
import type { ContactMessage, UnreadCountResult } from "../types";

export const messagesApi = {
  /**
   * 获取当前登录用户的所有留言列表
   * GET /messages
   * GET /messages?unreadOnly=true
   *
   * @param unreadOnly 为 true 时只返回未读留言，默认返回全部
   */
  getAll(unreadOnly?: boolean): Promise<ContactMessage[]> {
    const params: Record<string, unknown> = {};
    // 仅在需要过滤时传递参数，避免多余的 query string
    if (unreadOnly === true) {
      params.unreadOnly = true;
    }
    return request.get<ContactMessage[]>("/messages", params);
  },

  /**
   * 获取未读留言数量
   * GET /messages/unread-count
   *
   * 通常在 App 启动时或消息页面挂载时调用，用于展示角标。
   */
  getUnreadCount(): Promise<UnreadCountResult> {
    return request.get<UnreadCountResult>("/messages/unread-count");
  },

  /**
   * 获取单条留言详情
   * GET /messages/:id
   *
   * @param id 留言 UUID
   */
  getOne(id: string): Promise<ContactMessage> {
    return request.get<ContactMessage>(`/messages/${id}`);
  },

  /**
   * 将指定留言标记为已读
   * PATCH /messages/:id/read
   *
   * 后端会将 isRead 置为 true 并返回更新后的留言对象。
   * Store 层调用此方法后应同步更新本地 unreadCount。
   *
   * @param id 留言 UUID
   */
  markAsRead(id: string): Promise<ContactMessage> {
    return request.patch<ContactMessage>(`/messages/${id}/read`);
  },
};
