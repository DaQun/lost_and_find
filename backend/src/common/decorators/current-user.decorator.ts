import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 从 JWT 验证后的 request.user 中提取当前登录用户信息。
 *
 * 使用示例：
 *   @Get('me')
 *   getMe(@CurrentUser() user: { id: string; phone?: string; email?: string }) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): { id: string; phone?: string | null; email?: string | null } => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
