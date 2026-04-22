import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  Matches,
} from "class-validator";

export class CreateQrCodeDto {
  @ApiProperty({
    description: "二维码标签名称，用于标识物品",
    example: "我的背包",
    maxLength: 100,
  })
  @IsString({ message: "label 必须是字符串" })
  @IsNotEmpty({ message: "label 不能为空" })
  @MaxLength(100, { message: "label 最多 100 个字符" })
  label!: string;

  @ApiPropertyOptional({
    description: "物品描述信息",
    example: "黑色双肩包，内有笔记本电脑",
    maxLength: 500,
  })
  @IsString({ message: "description 必须是字符串" })
  @IsOptional()
  @MaxLength(500, { message: "description 最多 500 个字符" })
  description?: string;

  @ApiPropertyOptional({
    description: "物品图标（Emoji）",
    example: "🎒",
    maxLength: 10,
  })
  @IsString({ message: "icon 必须是字符串" })
  @IsOptional()
  @MaxLength(10, { message: "icon 最多 10 个字符" })
  icon?: string;

  @ApiPropertyOptional({
    description: "二维码主题色，十六进制颜色值",
    example: "#3B82F6",
    pattern: "^#[0-9A-Fa-f]{6}$",
  })
  @IsString({ message: "color 必须是字符串" })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: "color 必须是合法的十六进制颜色值，例如 #3B82F6",
  })
  color?: string;

  @ApiPropertyOptional({
    description: "拾到物品后的悬赏说明",
    example: "拾到请联系失主，必有重谢！",
    maxLength: 200,
  })
  @IsString({ message: "rewardText 必须是字符串" })
  @IsOptional()
  @MaxLength(200, { message: "rewardText 最多 200 个字符" })
  rewardText?: string;
}
