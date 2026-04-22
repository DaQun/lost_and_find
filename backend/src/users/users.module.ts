import { Module } from "@nestjs/common";

import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { AuthModule } from "../auth/auth.module";

/**
 * UsersModule
 *
 * 用户模块，负责：
 *  - 查询当前用户信息（GET /users/me）
 *  - 更新用户资料（PATCH /users/me）
 *  - 注销账号（DELETE /users/me）
 *
 * 依赖说明：
 *  - PrismaService：全局注册，无需在此 imports，直接注入即可
 *  - AuthModule：导入以获取 AuthService，用于账号注销时撤销所有 Token
 */
@Module({
  imports: [
    // 导入 AuthModule 是为了让 UsersController 能注入 AuthService，
    // 在 DELETE /users/me 时调用 revokeAllUserTokens()。
    // AuthModule 不会反向依赖 UsersModule，无循环依赖风险。
    AuthModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [
    // 导出 UsersService，供其他模块（如将来的 AdminModule）复用
    UsersService,
  ],
})
export class UsersModule {}
