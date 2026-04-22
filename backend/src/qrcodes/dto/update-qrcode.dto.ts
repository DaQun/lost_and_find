import { PartialType } from '@nestjs/swagger';
import { CreateQrCodeDto } from './create-qrcode.dto';

export class UpdateQrCodeDto extends PartialType(CreateQrCodeDto) {}
