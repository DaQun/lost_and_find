import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContactMessage, QrCode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type MessageWithQrCode = ContactMessage & {
  qrCode: Pick<QrCode, 'id' | 'label' | 'icon' | 'color' | 'token'>;
};

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取当前用户所有 QrCode 下收到的留言列表
   * @param userId 当前登录用户 ID
   * @param unreadOnly 为 true 时只返回未读留言
   */
  async findAll(
    userId: string,
    unreadOnly = false,
  ): Promise<MessageWithQrCode[]> {
    const messages = await this.prisma.contactMessage.findMany({
      where: {
        qrCode: {
          userId,
        },
        ...(unreadOnly ? { isRead: false } : {}),
      },
      include: {
        qrCode: {
          select: {
            id: true,
            label: true,
            icon: true,
            color: true,
            token: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return messages;
  }

  /**
   * 获取单条留言详情，并校验归属
   * @param id 留言 ID
   * @param userId 当前登录用户 ID
   */
  async findOne(id: string, userId: string): Promise<MessageWithQrCode> {
    const message = await this.prisma.contactMessage.findUnique({
      where: { id },
      include: {
        qrCode: {
          select: {
            id: true,
            label: true,
            icon: true,
            color: true,
            token: true,
            userId: true,
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('留言不存在');
    }

    if (message.qrCode.userId !== userId) {
      throw new ForbiddenException('无权访问此留言');
    }

    // 移除返回值中的 userId，不暴露给客户端
    const { qrCode } = message;
    const { userId: _ownerId, ...qrCodePublic } = qrCode;
    void _ownerId;

    return {
      ...message,
      qrCode: qrCodePublic,
    } as MessageWithQrCode;
  }

  /**
   * 将指定留言标记为已读
   * @param id 留言 ID
   * @param userId 当前登录用户 ID
   */
  async markAsRead(id: string, userId: string): Promise<ContactMessage> {
    // 先校验归属
    await this.findOne(id, userId);

    const updated = await this.prisma.contactMessage.update({
      where: { id },
      data: { isRead: true },
    });

    return updated;
  }

  /**
   * 统计当前用户所有未读留言数量
   * @param userId 当前登录用户 ID
   */
  async getUnreadCount(userId: string): Promise<number> {
    const count = await this.prisma.contactMessage.count({
      where: {
        isRead: false,
        qrCode: {
          userId,
        },
      },
    });

    return count;
  }
}
