import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * PrismaModule — globally available database access layer.
 *
 * Decorated with `@Global()` so that `PrismaService` can be injected
 * anywhere in the application without needing to re-import this module.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
