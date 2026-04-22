// ============================================================
// Lost & Find — 二维码相关 API
// 封装：创建、列表、详情、更新、删除、启用/停用切换
// 所有接口均需要登录（Bearer token 由 request.ts 自动附加）
// ============================================================

import request from "./request";
import type {
  QrCode,
  QrCodeWithImage,
  CreateQrCodeDto,
  UpdateQrCodeDto,
} from "../types";

export const qrcodesApi = {
  /**
   * 创建二维码
   * 成功后返回二维码记录，并附带实时生成的 base64 PNG 图片数据（qrImageData）
   * @param dto 创建参数：label 必填，其余可选
   */
  create(dto: CreateQrCodeDto): Promise<QrCodeWithImage> {
    return request.post<QrCodeWithImage>(
      "/qrcodes",
      dto as unknown as Record<string, unknown>,
    );
  },

  /**
   * 获取当前登录用户的所有二维码列表
   * 列表不含 qrImageData，如需图片请调用 getOne
   */
  getList(): Promise<QrCode[]> {
    return request.get<QrCode[]>("/qrcodes");
  },

  /**
   * 获取单个二维码详情，含实时生成的 base64 PNG 图片数据
   * @param id 二维码 UUID
   */
  getOne(id: string): Promise<QrCodeWithImage> {
    return request.get<QrCodeWithImage>(`/qrcodes/${id}`);
  },

  /**
   * 更新二维码信息（局部更新，仅传需要修改的字段）
   * @param id  二维码 UUID
   * @param dto 需要更新的字段
   */
  update(id: string, dto: UpdateQrCodeDto): Promise<QrCode> {
    return request.patch<QrCode>(
      `/qrcodes/${id}`,
      dto as unknown as Record<string, unknown>,
    );
  },

  /**
   * 删除二维码（同时级联删除扫码记录和留言）
   * @param id 二维码 UUID
   */
  remove(id: string): Promise<void> {
    return request.del<void>(`/qrcodes/${id}`);
  },

  /**
   * 切换二维码启用/停用状态
   * 停用后公开扫码页仍可访问，但禁止留言
   * @param id 二维码 UUID
   */
  toggle(id: string): Promise<QrCode> {
    return request.patch<QrCode>(`/qrcodes/${id}/toggle`);
  },
};
