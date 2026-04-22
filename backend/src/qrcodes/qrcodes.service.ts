import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import * as QRCode from "qrcode";
import { QrCode } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { CreateQrCodeDto } from "./dto/create-qrcode.dto";
import { UpdateQrCodeDto } from "./dto/update-qrcode.dto";

export type QrCodeWithImage = QrCode & { qrImageData: string };

@Injectable()
export class QrCodesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ─── Token Generation ────────────────────────────────────────────────────────

  /**
   * 生成唯一的 10 位 base64url token。
   * 循环查询数据库，直到确认不重复为止。
   */
  async generateToken(): Promise<string> {
    let token: string;
    let found: { id: string } | null;

    do {
      token = crypto.randomBytes(8).toString("base64url").slice(0, 10);
      found = await this.prisma.qrCode.findUnique({
        where: { token },
        select: { id: true },
      });
    } while (found !== null);

    return token;
  }

  // ─── QR Image Generation ─────────────────────────────────────────────────────

  /**
   * 使用 qrcode 包将 token 对应的扫码 URL 生成为 base64 PNG Data URL。
   */
  async generateQrCodeImage(token: string): Promise<string> {
    const frontendUrl = this.config.get<string>(
      "FRONTEND_URL",
      "http://localhost:3000",
    );
    const url = `${frontendUrl}/pages/scan/index?token=${token}`;

    const dataUrl = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: "#0f0f11",
        light: "#ffffff",
      },
    });

    return dataUrl;
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────────

  /**
   * 创建新二维码。
   * 返回数据库记录 + 实时生成的 qrImageData（base64 PNG）。
   */
  async create(userId: string, dto: CreateQrCodeDto): Promise<QrCodeWithImage> {
    const token = await this.generateToken();
    const qrImageData = await this.generateQrCodeImage(token);

    const qrCode = await this.prisma.qrCode.create({
      data: {
        userId,
        token,
        label: dto.label,
        description: dto.description ?? null,
        icon: dto.icon ?? null,
        color: dto.color ?? null,
        rewardText: dto.rewardText ?? null,
        // 生产环境应上传到 OSS 后替换为真实 URL；
        // 此处暂存 token 作为占位标识。
        qrImageUrl: token,
      },
    });

    return { ...qrCode, qrImageData };
  }

  /**
   * 获取指定用户的全部二维码，按创建时间倒序。
   */
  async findAll(userId: string): Promise<QrCode[]> {
    return this.prisma.qrCode.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * 获取单个二维码详情（附带实时生成的 qrImageData）。
   * 若记录不存在或不属于当前用户，抛出对应异常。
   */
  async findOne(id: string, userId: string): Promise<QrCodeWithImage> {
    const qrCode = await this.prisma.qrCode.findUnique({ where: { id } });

    if (!qrCode) {
      throw new NotFoundException("二维码不存在");
    }

    if (qrCode.userId !== userId) {
      throw new ForbiddenException("无权访问该二维码");
    }

    const qrImageData = await this.generateQrCodeImage(qrCode.token);
    return { ...qrCode, qrImageData };
  }

  /**
   * 更新二维码信息（仅允许物主操作）。
   */
  async update(
    id: string,
    userId: string,
    dto: UpdateQrCodeDto,
  ): Promise<QrCode> {
    await this.verifyOwnership(id, userId);

    return this.prisma.qrCode.update({
      where: { id },
      data: {
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.rewardText !== undefined && { rewardText: dto.rewardText }),
      },
    });
  }

  /**
   * 删除二维码（级联删除扫码记录与留言）。
   */
  async delete(id: string, userId: string): Promise<void> {
    await this.verifyOwnership(id, userId);
    await this.prisma.qrCode.delete({ where: { id } });
  }

  /**
   * 切换二维码的启用 / 停用状态。
   */
  async toggle(id: string, userId: string): Promise<QrCode> {
    const qrCode = await this.verifyOwnership(id, userId);

    return this.prisma.qrCode.update({
      where: { id },
      data: { isActive: !qrCode.isActive },
    });
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  /**
   * 校验记录存在且归属于当前用户，返回记录本身以便复用。
   */
  private async verifyOwnership(id: string, userId: string): Promise<QrCode> {
    const qrCode = await this.prisma.qrCode.findUnique({ where: { id } });

    if (!qrCode) {
      throw new NotFoundException("二维码不存在");
    }

    if (qrCode.userId !== userId) {
      throw new ForbiddenException("无权操作该二维码");
    }

    return qrCode;
  }
}
