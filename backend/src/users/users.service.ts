import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

/**
 * 安全用户类型：去除 wechatOpenId 等不对外暴露的敏感字段
 */
export type SafeUser = Omit<User, 'wechatOpenId'>;

/**
 * Prisma select 对象：明确列出所有需要返回的字段，不包含 wechatOpenId
 * 集中管理，避免在多个方法中重复书写
 */
const SAFE_USER_SELECT = {
  id: true,
  phone: true,
  email: true,
  nickname: true,
  avatarUrl: true,
  pushToken: true,
  createdAt: true,
  updatedAt: true,
  // wechatOpenId 故意不包含，永远不对外暴露
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // 查询
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 根据 ID 查找用户，返回安全字段（不含 wechatOpenId）。
   *
   * 注意：返回 null 而不是抛出异常，调用方自行决定如何处理不存在的情况。
   * 例如：Controller 中查到 null 后抛 NotFoundException；
   *       JWT Strategy 中查到 null 抛 UnauthorizedException。
   *
   * @param id 用户 UUID
   * @returns 用户对象（SafeUser）或 null
   */
  async findById(id: string): Promise<SafeUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: SAFE_USER_SELECT,
    });

    // Prisma 未找到时返回 null，直接透传给调用方
    return user as SafeUser | null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 更新
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 更新用户的可编辑字段（nickname / avatarUrl / pushToken）。
   *
   * 只更新 DTO 中实际传入的字段（undefined 的字段 Prisma 会忽略），
   * 因此客户端可以只传需要修改的字段，不传的字段保持原值。
   *
   * @param id  用户 UUID
   * @param dto 更新数据（所有字段均为可选）
   * @returns 更新后的安全用户对象
   * @throws NotFoundException 用户不存在
   */
  async update(id: string, dto: UpdateUserDto): Promise<SafeUser> {
    // 先验证用户存在，给出更友好的错误信息
    // （Prisma update 在记录不存在时会抛 P2025，但错误信息不够直观）
    await this.ensureExists(id);

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        // 只传 DTO 中有值的字段；undefined 字段 Prisma 不会写入
        ...(dto.nickname !== undefined && { nickname: dto.nickname }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
        ...(dto.pushToken !== undefined && { pushToken: dto.pushToken }),
      },
      select: SAFE_USER_SELECT,
    });

    return updated as SafeUser;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 删除
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 删除用户账号及其关联的 QrCode 记录。
   *
   * Prisma schema 中 QrCode 通过外键关联 User，若 schema 配置了
   * onDelete: Cascade，数据库会自动级联删除；否则 Prisma 会在事务中
   * 先删除关联记录再删除用户（取决于 schema 设置）。
   *
   * 重要：调用此方法前，Controller 层应先调用
   *       AuthService.revokeAllUserTokens(userId) 撤销所有 Token，
   *       确保被删用户的 JWT 立即失效。
   *
   * @param id 用户 UUID
   * @throws NotFoundException 用户不存在
   */
  async delete(id: string): Promise<void> {
    // 先确认用户存在
    await this.ensureExists(id);

    // 删除用户；若 schema 配置了 onDelete: Cascade，
    // 关联的 QrCode 记录会由数据库自动清理
    await this.prisma.user.delete({
      where: { id },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 私有工具方法
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 确认用户存在，不存在则抛出 NotFoundException。
   * 只 select id 字段，最小化查询开销。
   */
  private async ensureExists(id: string): Promise<void> {
    const exists = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException(`用户 ${id} 不存在`);
    }
  }
}
