/**
 * @file configuration.ts
 * @description NestJS configuration factory.
 *
 * Loaded via `ConfigModule.forRoot({ load: [configuration] })`.
 * Access values with `ConfigService.get<T>('section.key')`.
 *
 * @example
 *   constructor(private readonly config: ConfigService) {}
 *   const port = this.config.get<number>('app.port');
 */

/** Shape of the entire application configuration object. */
export interface AppConfiguration {
  app: {
    /** Current runtime environment */
    nodeEnv: 'development' | 'production' | 'test';
    /** TCP port the HTTP server listens on */
    port: number;
    /** Allowed CORS origin (frontend URL) */
    frontendUrl: string;
  };
  database: {
    /** Full PostgreSQL connection URL used by Prisma */
    url: string;
  };
  redis: {
    host: string;
    port: number;
    /** Leave undefined when Redis has no password */
    password: string | undefined;
  };
  jwt: {
    /** Signing secret – must be long & random in production */
    secret: string;
    /** Access token TTL, e.g. "15m" */
    accessExpiresIn: string;
    /** Refresh token TTL, e.g. "7d" */
    refreshExpiresIn: string;
  };
  sms: {
    /** When false, the SMS provider is bypassed and testCode is used */
    enabled: boolean;
    /** Fixed OTP returned in development / test mode */
    testCode: string;
  };
}

/**
 * Configuration factory registered with NestJS `ConfigModule`.
 *
 * All values are read from `process.env` with sensible defaults so
 * the application can start in development without a `.env` file.
 */
export default (): AppConfiguration => ({
  app: {
    nodeEnv: (process.env['NODE_ENV'] as AppConfiguration['app']['nodeEnv']) ?? 'development',
    port: parseInt(process.env['PORT'] ?? '3000', 10),
    frontendUrl: process.env['FRONTEND_URL'] ?? 'http://localhost:5173',
  },

  database: {
    // Prisma reads DATABASE_URL itself; we keep it here so other
    // parts of the app can reference it via ConfigService if needed.
    url:
      process.env['DATABASE_URL'] ??
      'postgresql://postgres:postgres@localhost:5432/lost_and_find',
  },

  redis: {
    host: process.env['REDIS_HOST'] ?? 'localhost',
    port: parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
    // Convert empty string to undefined so ioredis skips AUTH command
    password:
      process.env['REDIS_PASSWORD'] !== undefined &&
      process.env['REDIS_PASSWORD'] !== ''
        ? process.env['REDIS_PASSWORD']
        : undefined,
  },

  jwt: {
    secret:
      process.env['JWT_SECRET'] ?? 'CHANGE_ME_IN_PRODUCTION_USE_OPENSSL_RAND',
    accessExpiresIn: process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m',
    refreshExpiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d',
  },

  sms: {
    enabled: process.env['SMS_ENABLED'] === 'true',
    testCode: process.env['SMS_TEST_CODE'] ?? '123456',
  },
});
