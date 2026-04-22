import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';

import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

/**
 * UsersController
 *
 * 基路由：/users
 * 所有接口均需通过 JwtAuthGuard 认证（Bearer Token）。
 *
 * 路由设计遵循"当前用户操作自身资源"的原则：
 *   GET    /users/me  → 获取当前用户信息
 *   PATCH  /users/me  → 更新当前用户信息
 *   DELETE /users/me  → 注销当前账号
 *
 * 当前登录用户的 ID 通过 @CurrentUser() 从 JWT payload 中提取，
 * 无需在 URL 中暴露用户 ID，避免越权访问风险。
 */
@ApiTags('用户')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    /**
     * 注入 AuthService 以便在账号注销时调用 revokeAllUserTokens()，
     * 确保所有在途 Token（Access + Refresh）立即失效。
     */
    private readonly authService: AuthService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /users/me
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 获取当前登录用户的个人信息。
   *
   * 返回字段不包含 wechatOpenId 等敏感数据。
   * 若数据库中找不到该用户（极少数情况，如账号已被后台删除），
   * 则返回 404，客户端应清除本地 Token 并引导重新登录。
   */
  @Get('me')
  @ApiOperation({
    summary: '获取当前用户信息',
    description:
      '返回当前登录用户的个人资料，不包含 wechatOpenId 等敏感字段。',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回用户信息',
    schema: {
      example: {
        success: true,
        data: {
          id: 'a1b2c3d4-uuid',
          phone: '13812345678',
          email: null,
          nickname: '小明',
          avatarUrl: 'https://example.com/avatars/user.jpg',
          pushToken: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: '未携带有效的 Access Token' })
  @ApiResponse({
    status: 404,
    description: '用户不存在（Token 有效但账号已被删除）',
  })
  async getMe(
    @CurrentUser() user: { id: string },
  ) {
    const found = await this.usersService.findById(user.id);

    if (!found) {
      // JWT 合法但数据库中找不到对应用户，说明账号已被删除
      // 客户端收到 404 后应清除本地 Token，引导用户重新注册
      throw new NotFoundException('用户不存在，请重新登录');
    }

    return found;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PATCH /users/me
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 更新当前用户的个人资料。
   *
   * 支持局部更新（Partial Update）：客户端只需传入需要修改的字段，
   * 不传的字段保持原值不变。
   * 可更新的字段：nickname、avatarUrl、pushToken。
   */
  @Patch('me')
  @ApiOperation({
    summary: '更新当前用户信息',
    description:
      '支持局部更新，只需传入需要修改的字段。' +
      '可更新：nickname（昵称）、avatarUrl（头像 URL）、pushToken（推送令牌）。',
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: '更新成功，返回更新后的用户信息',
    schema: {
      example: {
        success: true,
        data: {
          id: 'a1b2c3d4-uuid',
          phone: '13812345678',
          email: null,
          nickname: '新昵称',
          avatarUrl: 'https://example.com/new-avatar.jpg',
          pushToken: 'ExponentPushToken[xxxxx]',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-06-01T12:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '请求参数校验失败' })
  @ApiResponse({ status: 401, description: '未携带有效的 Access Token' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  updateMe(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(user.id, dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE /users/me
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 注销当前账号。
   *
   * 操作顺序（重要，不可颠倒）：
   * 1. 在 Redis 写入用户撤销标记，使所有 Token 立即失效
   *    （包括当前 Access Token 和所有 Refresh Token）
   * 2. 从数据库中永久删除用户记录
   *    （若 Prisma schema 配置了 onDelete: Cascade，QrCode 等关联记录会一并删除）
   *
   * 注意：此操作不可逆。客户端在调用前应向用户二次确认。
   * 调用成功后客户端应清除本地存储的所有 Token 及用户数据。
   *
   * 返回 204 No Content，body 为空。
   */
  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '注销当前账号（不可逆）',
    description:
      '永久删除当前用户账号及所有关联数据。' +
      '操作前会先撤销所有 Token，确保立即失效。' +
      '此操作不可逆，请客户端在调用前向用户二次确认。',
  })
  @ApiResponse({
    status: 204,
    description: '账号已成功注销，无响应体',
  })
  @ApiResponse({ status: 401, description: '未携带有效的 Access Token' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async deleteMe(
    @CurrentUser() user: { id: string },
  ): Promise<void> {
    // ── Step 1：撤销所有 Token ────────────────────────────────────────────────
    // 必须先撤销再删除：删除后 DB 查不到用户，JwtStrategy 虽然也会拒绝请求，
    // 但 refresh 接口只校验 Redis，不查 DB，因此必须显式写入撤销标记。
    await this.authService.revokeAllUserTokens(user.id);

    // ── Step 2：删除数据库记录 ─────────────────────────────────────────────────
    await this.usersService.delete(user.id);

    // 返回 undefined，框架配合 @HttpCode(204) 返回空响应体
  }
}
