import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import configuration from "./config/configuration";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { QrCodesModule } from "./qrcodes/qrcodes.module";
import { ScanModule } from "./scan/scan.module";
import { MessagesModule } from "./messages/messages.module";

/**
 * AppModule
 *
 * Root module of the Lost & Find backend application.
 *
 * Module loading order matters for global providers:
 *  1. ConfigModule   – must be first so all other modules can read env vars
 *  2. ThrottlerModule – rate-limiting guard registered globally via APP_GUARD
 *  3. PrismaModule   – global DB client (@Global, no re-import needed)
 *  4. RedisModule    – global Redis client (@Global, no re-import needed)
 *  5. Feature modules (Auth, Users, QrCodes, Scan, Messages)
 */
@Module({
  imports: [
    // ------------------------------------------------------------------
    // Configuration — loaded first so all modules can inject ConfigService
    // ------------------------------------------------------------------
    ConfigModule.forRoot({
      /** Make ConfigService injectable everywhere without re-importing. */
      isGlobal: true,
      /** Our typed configuration factory. */
      load: [configuration],
      /**
       * Cache the parsed config object so subsequent `get()` calls are O(1).
       * Disable in test environments if you need to override values per-test.
       */
      cache: true,
      /**
       * Expand variables in .env, e.g. DATABASE_URL can reference $PG_HOST.
       * Requires the `dotenv-expand` package (bundled with @nestjs/config).
       */
      expandVariables: true,
    }),

    // ------------------------------------------------------------------
    // Rate limiting — applied globally via APP_GUARD below
    // ------------------------------------------------------------------
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      /**
       * Returns an array of throttler "tiers".
       * Multiple tiers can be defined for different routes via decorators.
       *
       * Default tier:
       *  - ttl   : 60 000 ms (1 minute sliding window)
       *  - limit : 100 requests per window per IP
       */
      useFactory: () => [
        {
          ttl: 60_000,
          limit: 100,
        },
      ],
    }),

    // ------------------------------------------------------------------
    // Infrastructure — global modules (no need to import in feature modules)
    // ------------------------------------------------------------------
    PrismaModule,
    RedisModule,

    // ------------------------------------------------------------------
    // Feature modules
    // ------------------------------------------------------------------
    AuthModule,
    UsersModule,
    QrCodesModule,
    ScanModule,
    MessagesModule,
  ],

  providers: [
    // ------------------------------------------------------------------
    // Global throttler guard
    // Registering via APP_GUARD applies the guard to every route in the
    // application.  Individual routes can opt-out with @SkipThrottle() or
    // use a different tier with @Throttle({ default: { ttl, limit } }).
    // ------------------------------------------------------------------
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
