import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, IsNotEmpty } from "class-validator";

export class SendMessageDto {
  @ApiPropertyOptional({
    description: "发现者姓名",
    example: "张三",
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: "姓名最多 50 个字符" })
  finderName?: string;

  @ApiPropertyOptional({
    description: "发现者联系方式（电话 / 微信 / 邮箱）",
    example: "138xxxx8888",
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: "联系方式最多 100 个字符" })
  finderContact?: string;

  @ApiProperty({
    description: "留言内容",
    example: "您的物品我已捡到，请联系我。",
    maxLength: 500,
  })
  @IsNotEmpty({ message: "留言内容不能为空" })
  @IsString()
  @MaxLength(500, { message: "留言内容最多 500 个字符" })
  message!: string;
}
