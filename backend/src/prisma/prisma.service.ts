import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService wraps the generated PrismaClient and integrates it with
 * the NestJS module lifecycle so the database connection is properly
 * opened when the application starts and closed when it shuts down.
 *
 * Because PrismaModule is decorated with `@Global()`, this service can be
 * injected anywhere in the application without re-importing PrismaModule.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });
  }

  /**
   * Called automatically by NestJS when the host module has been initialised.
   * Opens the database connection pool.
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Connecting to the database…');
    await this.$connect();
    this.logger.log('Database connection established.');
  }

  /**
   * Called automatically by NestJS just before the host module is destroyed
   * (e.g. on graceful shutdown). Closes all open connections.
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Disconnecting from the database…');
    await this.$disconnect();
    this.logger.log('Database connection closed.');
  }
}
