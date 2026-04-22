// ============================================================
// Lost & Find — 公开扫码接口 API
// 无需登录，拾到者扫码后可访问物品信息并留言
// ============================================================

import request from "./request";
import type { ScanResult, SendMessageDto } from "../types";

export const scanApi = {
  /**
   * 获取物品公开信息
   * GET /scan/:token
   * 无需登录，同时触发后端写入扫码记录（失败不阻塞返回）
   *
   * 注意：即使二维码已停用（isActive: false），后端仍会正常返回数据，
   * 前端根据 isActive 字段决定是否展示"此码已停用"提示。
   *
   * @param token 二维码上的 10 位 base64url token
   */
  getItemInfo(token: string): Promise<ScanResult> {
    return request.get<ScanResult>(`/scan/${token}`);
  },

  /**
   * 拾到者向物主发送留言
   * POST /scan/:token/message
   * 无需登录；后端对此接口做了限流（3 次/分钟）
   * 若二维码已停用，后端返回 400，request.ts 会将其转换为 RequestError 抛出。
   *
   * @param token 二维码上的 10 位 base64url token
   * @param dto   留言内容（message 必填，finderName / finderContact 可选）
   */
  sendMessage(token: string, dto: SendMessageDto): Promise<void> {
    return request.post<void>(
      `/scan/${token}/message`,
      dto as unknown as Record<string, unknown>,
    );
  },
};
