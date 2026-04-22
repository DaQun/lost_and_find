import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches } from "class-validator";

export class VerifyCodeDto {
  @ApiProperty({
    description: "手机号（中国大陆）",
    example: "13812345678",
  })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: "请输入有效的中国大陆手机号" })
  phone!: string;

  @ApiProperty({
    description: "6 位数字验证码",
    example: "123456",
  })
  @IsString()
  @Matches(/^\d{6}$/, { message: "验证码必须为 6 位数字" })
  code!: string;
}
