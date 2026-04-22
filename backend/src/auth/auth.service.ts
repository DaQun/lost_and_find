import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

// ─── Redis 键前缀 ─────────────────────────────────────────────────────────────
const SMS_CODE_PREFIX = 'sms_code:';
const REFRESH_TOKEN_PREFIX = 'refresh_token:';
const USER_REVOKED_PREFIX = 'user_revoked:';

// ─── TTL 常量（秒） ───────────────────────────────────────────────────────────
/** 验证码有效期：5 分钟 */
const SMS_CODE_TTL = 5 * 60;
/** Refresh Token 有效期：7 天 */
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60;

/** 返回给客户端的安全用户对象（去除 wechatOpenId 等敏感字段） */
type SafeUser = Omit<User, 'wechatOpenId'>;

/** Token 对 */
interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. 发送验证码
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 向指定手机号发送短信验证码。
   *
   * - SMS_ENABLED=true  → 调用真实短信服务商（需自行接入）
   * - SMS_ENABLED=false → 使用 SMS_TEST_CODE（默认 "123456"），仅打印到控制台
   *
   * 验证码存入 Redis key `sms_code:{phone}`，TTL 5 分钟。
   */
  async sendCode(phone: string): Promise<{ message: string }> {
    const smsEnabled =
      this.configService.get<string>('SMS_ENABLED', 'false') === 'true';

    let code: string;

    if (smsEnabled) {
      // ── 生产环境：随机 6 位数字 ──────────────────────────────────────────
      code = Math.floor(100000 + Math.random() * 900000).toString();

      // TODO: 替换为真实短信服务商 SDK，例如：
      //   await this.smsProvider.sendVerifyCode(phone, code);
      // 推荐：阿里云短信、腾讯云 SMS、云片等
      this.logger.warn(
        `SMS_ENABLED=true 但未接入真实短信服务商，验证码：${code}`,
      );
    } else {
      // ── 开发 / 测试环境：使用固定测试验证码 ─────────────────────────────
      code = this.configService.get<string>('SMS_TEST_CODE', '123456');
      this.logger.log(
        `[DEV] 手机号 ${phone} 的验证码（测试）：${code}`,
      );
    }

    // 写入 Redis，5 分钟后自动过期
    await this.redis.set(`${SMS_CODE_PREFIX}${phone}`, code, SMS_CODE_TTL);

    return { message: '验证码已发送，请在 5 分钟内完成验证' };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. 验证码登录 / 注册
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 验证短信验证码并完成登录或自动注册。
   *
   * 验证通过后：
   * 1. 从 Redis 删除验证码（一次性使用）
   * 2. Upsert 用户记录（不存在则自动创建）
   * 3. 生成 accessToken + refreshToken 并返回
   *
   * @throws UnauthorizedException 验证码过期或错误
   */
  async verifyCode(
    phone: string,
    code: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: SafeUser }> {
    // ── 1. 从 Redis 取出存储的验证码 ─────────────────────────────────────────
    const storedCode = await this.redis.get(`${SMS_CODE_PREFIX}${phone}`);

    if (!storedCode) {
      throw new UnauthorizedException('验证码已过期，请重新获取');
    }

    if (storedCode !== code) {
      throw new UnauthorizedException('验证码错误，请检查后重试');
    }

    // ── 2. 验证通过，立即删除验证码（防止重放攻击） ────────────────────────
    await this.redis.del(`${SMS_CODE_PREFIX}${phone}`);

    // ── 3. Upsert 用户（首次登录自动注册） ───────────────────────────────────
    const user = await this.prisma.user.upsert({
      where: { phone },
      update: {
        // 登录时不覆盖用户已填写的资料，只更新 updatedAt
        updatedAt: new Date(),
      },
      create: {
        phone,
        // nickname / avatarUrl 等留空，用户后续可在 /users/me 完善
      },
    });

    // ── 4. 生成 Token 对 ──────────────────────────────────────────────────────
    const { accessToken, refreshToken } = await this.generateTokenPair(user.id);

    // ── 5. 返回脱敏用户信息（去除 wechatOpenId） ──────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { wechatOpenId: _removed, ...safeUser } = user;

    return { accessToken, refreshToken, user: safeUser };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. 刷新 Access Token
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 用 Refresh Token 换取新的 Access Token。
   *
   * Refresh Token 格式：`{userId}:{tokenId}`
   * 验证逻辑：
   * 1. 解析 userId 与 tokenId
   * 2. 检查用户是否已注销
   * 3. 验证 Redis 中该 token 记录是否存在且一致
   * 4. 签发新的 Access Token（不轮换 Refresh Token，简化客户端逻辑）
   *
   * @throws UnauthorizedException token 格式错误、已失效或用户已注销
   */
  async refreshToken(token: string): Promise<{ accessToken: string }> {
    // ── 1. 解析 token 格式 ────────────────────────────────────────────────────
    // 格式严格要求：恰好一个冒号，切分出两段非空字符串
    const colonIndex = token.indexOf(':');
    if (colonIndex <= 0 || colonIndex === token.length - 1) {
      throw new UnauthorizedException('无效的 Refresh Token 格式');
    }

    const userId = token.substring(0, colonIndex);
    const tokenId = token.substring(colonIndex + 1);

    // ── 2. 检查用户是否已注销 ─────────────────────────────────────────────────
    const isRevoked = await this.redis.exists(
      `${USER_REVOKED_PREFIX}${userId}`,
    );
    if (isRevoked) {
      throw new UnauthorizedException('账号已注销，请重新注册');
    }

    // ── 3. 验证 Redis 中的 Refresh Token 记录 ─────────────────────────────────
    const redisKey = `${REFRESH_TOKEN_PREFIX}${userId}:${tokenId}`;
    const storedUserId = await this.redis.get(redisKey);

    if (!storedUserId) {
      throw new UnauthorizedException(
        'Refresh Token 已失效或不存在，请重新登录',
      );
    }

    // 防篡改：存储值应与 token 中的 userId 一致
    if (storedUserId !== userId) {
      throw new UnauthorizedException('Refresh Token 校验失败');
    }

    // ── 4. 签发新 Access Token ────────────────────────────────────────────────
    const accessToken = this.jwtService.sign({ sub: userId });

    return { accessToken };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. 登出
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 撤销指定的 Refresh Token（从 Redis 删除）。
   *
   * @param userId       来自 JWT payload 的用户 ID（已由 JwtAuthGuard 验证）
   * @param refreshToken 客户端传入的 Refresh Token（格式：userId:tokenId）
   */
  async logout(userId: string, refreshToken: string): Promise<{ message: string }> {
    // 解析 tokenId
    const colonIndex = refreshToken.indexOf(':');

    if (colonIndex <= 0 || colonIndex === refreshToken.length - 1) {
      // token 格式不合法，但登出属于幂等操作，不抛异常，直接返回成功
      this.logger.warn(
        `logout: 用户 ${userId} 传入了格式异常的 refreshToken，已忽略`,
      );
      return { message: '已登出' };
    }

    const tokenUserId = refreshToken.substring(0, colonIndex);
    const tokenId = refreshToken.substring(colonIndex + 1);

    // 安全校验：token 中的 userId 应与 JWT 中的 userId 一致，防止越权删除他人 token
    if (tokenUserId !== userId) {
      this.logger.warn(
        `logout: JWT userId(${userId}) 与 refreshToken 中的 userId(${tokenUserId}) 不一致`,
      );
      // 同样不抛异常，幂等返回成功（攻击者得不到有效信息）
      return { message: '已登出' };
    }

    const redisKey = `${REFRESH_TOKEN_PREFIX}${userId}:${tokenId}`;
    await this.redis.del(redisKey);

    this.logger.log(`用户 ${userId} 已登出，Token ${tokenId} 已撤销`);

    return { message: '已登出' };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. 撤销用户所有 Token（账号注销专用）
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 立即使该用户的所有 JWT 和 Refresh Token 失效。
   *
   * 实现方式：在 Redis 写入撤销标记 `user_revoked:{userId}`，TTL 与
   * Refresh Token 保持一致（7 天）。
   *
   * JwtStrategy.validate() 和 refreshToken() 都会检查此标记：
   * - 有效的 Access Token 在下次请求时将被拒绝（401）
   * - Refresh Token 无法再换取新的 Access Token
   *
   * 调用方：UsersService.delete() 在删除账号前调用此方法
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.redis.set(
      `${USER_REVOKED_PREFIX}${userId}`,
      '1',
      REFRESH_TOKEN_TTL, // 覆盖所有可能存活的 refresh token 周期
    );

    this.logger.log(`用户 ${userId} 的所有 Token 已被撤销`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 私有工具方法
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 生成 Access Token + Refresh Token 对，并将 Refresh Token 存入 Redis。
   *
   * - Access Token：JWT，payload `{ sub: userId }`，过期时间由 JwtModule 配置（15m）
   * - Refresh Token：`{userId}:{tokenId}`，tokenId 为 UUID v4
   * - Redis key：`refresh_token:{userId}:{tokenId}` → value：userId，TTL：7 天
   *
   * 每次登录生成独立的 tokenId，支持多设备同时在线。
   */
  private async generateTokenPair(userId: string): Promise<TokenPair> {
    // Access Token
    const accessToken = this.jwtService.sign({ sub: userId });

    // Refresh Token：UUID 作为 tokenId，与 userId 拼接后返回给客户端
    const tokenId = uuidv4();
    const refreshToken = `${userId}:${tokenId}`;

    // 将 Refresh Token 写入 Redis，value 存 userId 便于后续校验
    await this.redis.set(
      `${REFRESH_TOKEN_PREFIX}${userId}:${tokenId}`,
      userId,
      REFRESH_TOKEN_TTL,
    );

    return { accessToken, refreshToken };
  }
}
