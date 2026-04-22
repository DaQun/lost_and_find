import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { SendCodeDto } from './dto/send-code.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /auth/send-code
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 发送短信验证码
   *
   * 限流：每个 IP 每分钟最多 5 次，防止短信轰炸。
   * 开发环境（SMS_ENABLED=false）不发真实短信，验证码打印到控制台。
   */
  @Post('send-code')
  @HttpCode(HttpStatus.OK)
  // @nestjs/throttler v5 语法（ttl 单位为毫秒）
  // 若使用 v4，请改为 @Throttle({ default: { limit: 5, ttl: 60 } })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: '发送短信验证码',
    description:
      '向指定手机号发送 6 位数字验证码，验证码 5 分钟内有效。' +
      '同一 IP 每分钟最多请求 5 次。',
  })
  @ApiBody({ type: SendCodeDto })
  @ApiResponse({
    status: 200,
    description: '验证码已发送',
    schema: {
      example: { success: true, data: { message: '验证码已发送，请在 5 分钟内完成验证' } },
    },
  })
  @ApiResponse({ status: 400, description: '手机号格式错误' })
  @ApiResponse({ status: 429, description: '请求过于频繁，请稍后再试' })
  sendCode(@Body() dto: SendCodeDto) {
    return this.authService.sendCode(dto.phone);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /auth/verify-code
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 验证码登录 / 注册
   *
   * 验证通过后自动 upsert 用户（首次登录即注册），
   * 返回 accessToken、refreshToken 及用户基本信息。
   */
  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '验证码登录 / 注册',
    description:
      '提交手机号与验证码完成登录。若用户不存在则自动注册。' +
      '返回 Access Token（15 分钟）和 Refresh Token（7 天）。',
  })
  @ApiBody({ type: VerifyCodeDto })
  @ApiResponse({
    status: 200,
    description: '登录成功',
    schema: {
      example: {
        success: true,
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'a1b2c3d4-uuid-userId:e5f6g7h8-uuid-tokenId',
          user: {
            id: 'a1b2c3d4-...',
            phone: '13812345678',
            email: null,
            nickname: null,
            avatarUrl: null,
            pushToken: null,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '验证码错误或已过期' })
  verifyCode(@Body() dto: VerifyCodeDto) {
    return this.authService.verifyCode(dto.phone, dto.code);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /auth/refresh
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 刷新 Access Token
   *
   * 客户端在 Access Token 即将过期时调用此接口，
   * 用 Refresh Token 换取新的 Access Token，无需重新登录。
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '刷新 Access Token',
    description:
      '使用有效的 Refresh Token 获取新的 Access Token。' +
      'Refresh Token 本身不会轮换（仍可继续使用，直至过期或主动登出）。',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: '刷新成功，返回新的 Access Token',
    schema: {
      example: {
        success: true,
        data: { accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
      },
    },
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: 'Refresh Token 无效、已过期或用户已注销' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /auth/logout
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 登出
   *
   * 需要携带有效的 Access Token（Bearer）及 Refresh Token（body）。
   * 成功后指定的 Refresh Token 将从 Redis 中删除，无法再用于刷新。
   * Access Token 本身将在自然过期（15 分钟）后失效。
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '登出（撤销 Refresh Token）',
    description:
      '将当前设备的 Refresh Token 从 Redis 中删除。' +
      '需在 Authorization 头携带有效的 Access Token，并在 body 中提供 Refresh Token。',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: '登出成功',
    schema: {
      example: { success: true, data: { message: '已登出' } },
    },
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未提供有效的 Access Token' })
  logout(
    @CurrentUser() user: { id: string },
    @Body() dto: RefreshTokenDto,
  ) {
    return this.authService.logout(user.id, dto.refreshToken);
  }
}
