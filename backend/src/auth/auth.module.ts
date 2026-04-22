import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";

/**
 * AuthModule
 *
 * 认证模块，负责：
 *  - 手机验证码登录（发送验证码 → 校验 → 签发 Token）
 *  - JWT Access Token / Refresh Token 生命周期管理
 *  - Passport JWT 策略（供全局 JwtAuthGuard 使用）
 *
 * 导出 AuthService 供 UsersModule（账号注销时撤销 Token）使用。
 * 导出 JwtModule 供其他模块直接调用 JwtService（如需要）。
 */
@Module({
  imports: [
    // Passport 默认策略设置为 jwt，与 JwtStrategy 配合
    PassportModule.register({ defaultStrategy: "jwt" }),

    // 异步注册 JwtModule，从 ConfigService 读取密钥和过期时间
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>(
          "JWT_SECRET",
          "change-me-in-production",
        ),
        signOptions: {
          // Access Token 有效期，默认 15 分钟
          // 可通过环境变量 JWT_EXPIRES_IN 覆盖（如 '30m'、'1h'）
          expiresIn: configService.get<string>("JWT_EXPIRES_IN", "15m"),
        },
      }),
    }),
  ],

  controllers: [AuthController],

  providers: [
    AuthService,
    // JwtStrategy 被 Passport 自动发现并注册为 'jwt' 策略
    JwtStrategy,
  ],

  exports: [
    // UsersModule 注入 AuthService 调用 revokeAllUserTokens()
    AuthService,
    // 其他模块若需要 JwtService 可直接注入，无需重新注册 JwtModule
    JwtModule,
  ],
})
export class AuthModule {}
