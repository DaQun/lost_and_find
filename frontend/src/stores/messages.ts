// ============================================================
// Lost & Find — 消息 Pinia Store
// 管理拾到者留言列表、未读计数，以及标记已读后的联动更新
// ============================================================

import { defineStore } from "pinia";
import { ref } from "vue";
import { messagesApi } from "../api/messages";
import type { ContactMessage } from "../types";

export const useMessagesStore = defineStore("messages", () => {
  // ==========================================================
  // State
  // ==========================================================

  /** 留言列表（fetchList 拉取后缓存在此，避免重复请求） */
  const list = ref<ContactMessage[]>([]);

  /** 未读留言数量，用于 TabBar 角标展示 */
  const unreadCount = ref(0);

  /** 列表加载中标志，控制骨架屏 / 下拉刷新动画 */
  const loading = ref(false);

  // ==========================================================
  // 内部辅助
  // ==========================================================

  /** 从错误对象中提取可读的提示文字 */
  function _extractMessage(err: unknown, fallback: string): string {
    if (err && typeof err === "object" && "message" in err) {
      const msg = (err as { message: string | string[] }).message;
      return Array.isArray(msg) ? msg.join("；") : (msg ?? fallback);
    }
    return fallback;
  }

  // ==========================================================
  // Actions
  // ==========================================================

  /**
   * 拉取留言列表
   * 成功后替换本地 list 缓存
   *
   * @param unreadOnly 为 true 时只返回未读留言；默认返回全部
   */
  async function fetchList(unreadOnly?: boolean): Promise<void> {
    loading.value = true;
    try {
      const data = await messagesApi.getAll(unreadOnly);
      list.value = data;
    } catch (err: unknown) {
      const msg = _extractMessage(err, "获取留言列表失败");
      uni.showToast({ title: msg, icon: "none" });
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 拉取未读留言数量
   * 通常在 App 启动（App.vue onLaunch）或消息页挂载时调用，
   * 用于更新 TabBar 角标。
   */
  async function fetchUnreadCount(): Promise<void> {
    try {
      const result = await messagesApi.getUnreadCount();
      unreadCount.value = result.count;
    } catch (err: unknown) {
      // 未读数拉取失败静默处理，不干扰主流程
      console.warn("[MessagesStore] 获取未读数失败：", err);
    }
  }

  /**
   * 将指定留言标记为已读
   * 成功后：
   *  1. 更新 list 缓存中对应条目的 isRead 字段
   *  2. 重新计算本地 unreadCount（避免额外请求）
   *
   * @param id 留言 UUID
   */
  async function markAsRead(id: string): Promise<ContactMessage> {
    try {
      const updated = await messagesApi.markAsRead(id);

      // 同步更新列表中对应条目
      const idx = list.value.findIndex((item) => item.id === id);
      if (idx !== -1) {
        // 保留原有字段，仅更新后端返回的变更部分
        list.value.splice(idx, 1, { ...list.value[idx], ...updated });
      }

      // 根据列表重新计算未读数，保持与实际数据一致
      // 若列表不完整（如只拉取了未读子集），则直接 max(0, count - 1)
      const localUnread = list.value.filter((item) => !item.isRead).length;
      if (list.value.length > 0) {
        // 列表有数据时以列表为准（最准确）
        unreadCount.value = localUnread;
      } else {
        // 列表为空（未曾拉取）时保守递减，最低为 0
        unreadCount.value = Math.max(0, unreadCount.value - 1);
      }

      return updated;
    } catch (err: unknown) {
      const msg = _extractMessage(err, "标记已读失败");
      uni.showToast({ title: msg, icon: "none" });
      throw err;
    }
  }

  /**
   * 清空 Store 状态（用户退出登录时调用，防止数据泄漏到下一个账号）
   */
  function reset(): void {
    list.value = [];
    unreadCount.value = 0;
    loading.value = false;
  }

  // ==========================================================
  // 导出
  // ==========================================================

  return {
    // State
    list,
    unreadCount,
    loading,
    // Actions
    fetchList,
    fetchUnreadCount,
    markAsRead,
    reset,
  };
});
