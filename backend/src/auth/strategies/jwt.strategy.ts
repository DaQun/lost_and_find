import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

/** Access Token 的 payload 结构 */
interface JwtPayload {
  /** 用户 ID（即 User.id） */
  sub: string;
  iat?: number;
  exp?: number;
}

/** 挂载到 request.user 的最小用户对象 */
export interface AuthUser {
  id: string;
  phone: string | null;
  email: string | null;
}

/**
 * JWT Passport 策略
 *
 * 验证流程：
 * 1. 从 Authorization: Bearer <token> 中提取 JWT
 * 2. 用 JWT_SECRET 验证签名与有效期
 * 3. 检查 Redis 中是否存在用户撤销标记（账号注销场景）
 * 4. 查询数据库确认用户仍然存在
 * 5. 将 { id, phone, email } 挂载到 request.user
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    super({
      // 从请求头 Authorization: Bearer <token> 中提取
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // 不忽略过期时间，过期的 token 直接拒绝
      ignoreExpiration: false,
      // 从环境变量读取密钥，开发时提供回退值（生产必须配置）
      secretOrKey: configService.get<string>(
        'JWT_SECRET',
        'change-me-in-production',
      ),
    });
  }

  /**
   * Passport 在 JWT 签名验证通过后自动调用此方法。
   * 返回值会被挂载到 request.user，供 @CurrentUser() 装饰器读取。
   * 抛出异常则返回 401。
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const userId = payload.sub;

    // ── 1. 检查用户撤销标记 ──────────────────────────────────────────────────
    // 当用户注销账号时，AuthService 会在 Redis 写入 user_revoked:{userId}
    // 即使 JWT 尚未过期，也应立即拒绝
    const isRevoked = await this.redis.exists(`user_revoked:${userId}`);
    if (isRevoked) {
      throw new UnauthorizedException('账号已注销，请重新注册');
    }

    // ── 2. 查询数据库确认用户存在 ────────────────────────────────────────────
    // 仅 select 必要字段，减少传输量；wechatOpenId 等敏感字段不暴露到 request
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        email: true,
      },
    });

    if (!user) {
      // 用户被直接从数据库删除，或 token 对应的 userId 根本不存在
      throw new UnauthorizedException('用户不存在或 Token 已失效');
    }

    // ── 3. 返回用户对象，挂载到 request.user ─────────────────────────────────
    return user;
  }
}
