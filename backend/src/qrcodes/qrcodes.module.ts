import { Module } from '@nestjs/common';
import { QrCodesService } from './qrcodes.service';
import { QrCodesController } from './qrcodes.controller';

@Module({
  controllers: [QrCodesController],
  providers: [QrCodesService],
  exports: [QrCodesService],
})
export class QrCodesModule {}
