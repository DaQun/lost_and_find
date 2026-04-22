import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches } from "class-validator";

export class SendCodeDto {
  @ApiProperty({
    description: "手机号（中国大陆，1 开头 11 位）",
    example: "13812345678",
  })
  @IsString({ message: "手机号必须是字符串" })
  @Matches(/^1[3-9]\d{9}$/, { message: "请输入有效的中国大陆手机号" })
  phone!: string;
}
