import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT 认证守卫
 * 在需要登录保护的路由上使用 @UseGuards(JwtAuthGuard)
 * 内部使用 passport-jwt 策略验证 Bearer Token
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
