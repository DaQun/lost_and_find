import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class RefreshTokenDto {
  @ApiProperty({
    description: "刷新令牌（格式：userId:tokenId）",
    example: "a1b2c3d4-...:e5f6g7h8-...",
  })
  @IsString({ message: "refreshToken 必须是字符串" })
  @IsNotEmpty({ message: "refreshToken 不能为空" })
  refreshToken!: string;
}
