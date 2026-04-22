import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';

export interface ScanResultDto {
  label: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  rewardText: string | null;
  ownerNickname: string | null;
  isActive: boolean;
}

@Injectable()
export class ScanService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 根据 token 获取物品公开信息。
   * 若二维码不存在则抛出 NotFoundException。
   */
  async getItemInfo(token: string): Promise<ScanResultDto> {
    const qrCode = await this.prisma.qrCode.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            nickname: true,
          },
        },
      },
    });

    if (!qrCode) {
      throw new NotFoundException('二维码不存在');
    }

    return {
      label: qrCode.label,
      description: qrCode.description,
      icon: qrCode.icon,
      color: qrCode.color,
      rewardText: qrCode.rewardText,
      ownerNickname: qrCode.user.nickname,
      isActive: qrCode.isActive,
    };
  }

  /**
   * 记录扫码行为：写入 ScanRecord 并将 QrCode.scanCount +1。
   * 若二维码不存在则静默忽略（调用方已做 try-catch）。
   */
  async recordScan(
    token: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const qrCode = await this.prisma.qrCode.findUnique({
      where: { token },
    });

    if (!qrCode) {
      return;
    }

    await this.prisma.$transaction([
      this.prisma.scanRecord.create({
        data: {
          qrCodeId: qrCode.id,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      }),
      this.prisma.qrCode.update({
        where: { id: qrCode.id },
        data: {
          scanCount: {
            increment: 1,
          },
        },
      }),
    ]);
  }

  /**
   * 向物主发送留言。
   * 若二维码已停用则抛出 BadRequestException。
   * TODO: 留言创建后，触发推送通知给物主（Push Notification / WebSocket）。
   */
  async sendMessage(token: string, dto: SendMessageDto): Promise<void> {
    const qrCode = await this.prisma.qrCode.findUnique({
      where: { token },
    });

    if (!qrCode) {
      throw new NotFoundException('二维码不存在');
    }

    if (!qrCode.isActive) {
      throw new BadRequestException('该二维码已停用');
    }

    await this.prisma.contactMessage.create({
      data: {
        qrCodeId: qrCode.id,
        finderName: dto.finderName ?? null,
        finderContact: dto.finderContact ?? null,
        message: dto.message,
      },
    });

    // TODO: 触发推送通知给物主（例如：FCM / APNs / WebSocket）
    // await this.notificationService.pushToUser(qrCode.userId, { ... });
  }
}
