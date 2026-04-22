import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUrl, MaxLength } from "class-validator";

/**
 * 更新用户信息 DTO
 * 所有字段均为可选，客户端只需传入需要更新的字段
 */
export class UpdateUserDto {
  @ApiPropertyOptional({
    description: "用户昵称（最多 50 个字符）",
    example: "小明",
  })
  @IsOptional()
  @IsString({ message: "昵称必须是字符串" })
  @MaxLength(50, { message: "昵称最多 50 个字符" })
  nickname?: string;

  @ApiPropertyOptional({
    description: "头像图片 URL",
    example: "https://example.com/avatars/user123.jpg",
  })
  @IsOptional()
  @IsUrl(
    {
      protocols: ["http", "https"],
      require_protocol: true,
    },
    { message: "请提供有效的头像 URL（需包含 http/https 协议）" },
  )
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: "设备推送 Token（用于消息推送，如 Expo Push Token）",
    example: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  })
  @IsOptional()
  @IsString({ message: "推送 Token 必须是字符串" })
  pushToken?: string;
}
