// ============================================================
// Lost & Find — 二维码 Pinia Store
// 管理当前用户的二维码列表缓存、单条详情、增删改查与启停
// ============================================================

import { defineStore } from "pinia";
import { ref } from "vue";
import { qrcodesApi } from "../api/qrcodes";
import type {
  QrCode,
  QrCodeWithImage,
  CreateQrCodeDto,
  UpdateQrCodeDto,
} from "../types";

export const useQrCodesStore = defineStore("qrcodes", () => {
  // ==========================================================
  // State
  // ==========================================================

  /** 当前用户的二维码列表（不含 qrImageData，节省内存） */
  const list = ref<QrCode[]>([]);

  /** 列表加载中标志 */
  const loading = ref(false);

  /** 当前查看的二维码详情（含 base64 图片数据） */
  const currentQrCode = ref<QrCodeWithImage | null>(null);

  // ==========================================================
  // 内部辅助
  // ==========================================================

  /** 提取错误 message，兼容后端数组格式与普通字符串 */
  function _extractMessage(err: unknown, fallback: string): string {
    if (err && typeof err === "object" && "message" in err) {
      const msg = (err as { message: string | string[] }).message;
      return Array.isArray(msg) ? msg.join("；") : (msg ?? fallback);
    }
    return fallback;
  }

  /** 用更新后的记录替换列表中对应项（按 id 匹配） */
  function _syncToList(updated: QrCode): void {
    const idx = list.value.findIndex((item) => item.id === updated.id);
    if (idx !== -1) {
      list.value.splice(idx, 1, updated);
    }
  }

  // ==========================================================
  // Actions
  // ==========================================================

  /**
   * 拉取当前用户的二维码列表
   * 成功后替换本地 list 缓存
   */
  async function fetchList(): Promise<void> {
    loading.value = true;
    try {
      const data = await qrcodesApi.getList();
      list.value = data;
    } catch (err: unknown) {
      const msg = _extractMessage(err, "获取二维码列表失败");
      uni.showToast({ title: msg, icon: "none" });
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 获取单个二维码详情（含实时生成的 base64 图片）
   * 结果写入 currentQrCode，页面可直接读取
   *
   * @param id 二维码 UUID
   */
  async function fetchOne(id: string): Promise<QrCodeWithImage> {
    loading.value = true;
    try {
      const data = await qrcodesApi.getOne(id);
      currentQrCode.value = data;
      return data;
    } catch (err: unknown) {
      const msg = _extractMessage(err, "获取二维码详情失败");
      uni.showToast({ title: msg, icon: "none" });
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 创建新二维码
   * 成功后将新记录追加到列表头部，并更新 currentQrCode
   *
   * @param dto 创建参数（label 必填，其余可选）
   */
  async function create(dto: CreateQrCodeDto): Promise<QrCodeWithImage> {
    try {
      const data = await qrcodesApi.create(dto);
      // 将新二维码插入列表最前（最新的优先展示）
      list.value.unshift(data);
      currentQrCode.value = data;
      uni.showToast({ title: "创建成功", icon: "success" });
      return data;
    } catch (err: unknown) {
      const msg = _extractMessage(err, "创建二维码失败");
      uni.showToast({ title: msg, icon: "none" });
      throw err;
    }
  }

  /**
   * 更新二维码信息（局部更新）
   * 成功后同步更新列表缓存和 currentQrCode（如果匹配）
   *
   * @param id  二维码 UUID
   * @param dto 需要更新的字段
   */
  async function update(id: string, dto: UpdateQrCodeDto): Promise<QrCode> {
    try {
      const updated = await qrcodesApi.update(id, dto);
      _syncToList(updated);
      // 如果当前详情页正在查看同一张码，同步更新详情
      if (currentQrCode.value?.id === id) {
        currentQrCode.value = { ...currentQrCode.value, ...updated };
      }
      uni.showToast({ title: "更新成功", icon: "success" });
      return updated;
    } catch (err: unknown) {
      const msg = _extractMessage(err, "更新二维码失败");
      uni.showToast({ title: msg, icon: "none" });
      throw err;
    }
  }

  /**
   * 删除二维码
   * 成功后从本地列表移除，并清空 currentQrCode（如果匹配）
   *
   * @param id 二维码 UUID
   */
  async function remove(id: string): Promise<void> {
    try {
      await qrcodesApi.remove(id);
      list.value = list.value.filter((item) => item.id !== id);
      if (currentQrCode.value?.id === id) {
        currentQrCode.value = null;
      }
      uni.showToast({ title: "删除成功", icon: "success" });
    } catch (err: unknown) {
      const msg = _extractMessage(err, "删除二维码失败");
      uni.showToast({ title: msg, icon: "none" });
      throw err;
    }
  }

  /**
   * 切换二维码启用 / 停用状态
   * 成功后同步更新列表缓存和 currentQrCode（如果匹配）
   *
   * @param id 二维码 UUID
   */
  async function toggle(id: string): Promise<QrCode> {
    try {
      const updated = await qrcodesApi.toggle(id);
      _syncToList(updated);
      if (currentQrCode.value?.id === id) {
        currentQrCode.value = { ...currentQrCode.value, ...updated };
      }
      const statusText = updated.isActive ? "已启用" : "已停用";
      uni.showToast({ title: statusText, icon: "success" });
      return updated;
    } catch (err: unknown) {
      const msg = _extractMessage(err, "切换状态失败");
      uni.showToast({ title: msg, icon: "none" });
      throw err;
    }
  }

  /**
   * 清空 Store 状态（用户退出登录时调用）
   */
  function reset(): void {
    list.value = [];
    currentQrCode.value = null;
    loading.value = false;
  }

  // ==========================================================
  // 导出
  // ==========================================================

  return {
    // State
    list,
    loading,
    currentQrCode,
    // Actions
    fetchList,
    fetchOne,
    create,
    update,
    remove,
    toggle,
    reset,
  };
});
