/**
 * @file main.ts
 * @description Application entry point.
 *
 * Bootstraps the NestJS application with:
 *  - CORS restricted to the configured frontend origin
 *  - Global ValidationPipe (whitelist + transform + forbidNonWhitelisted)
 *  - Global HttpExceptionFilter for uniform error responses
 *  - Global ResponseInterceptor for uniform success responses
 *  - Swagger / OpenAPI documentation at /api/docs
 */

import { NestFactory } from "@nestjs/core";
import { ValidationPipe, VersioningType, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";

/** Global API prefix applied to every route. */
const GLOBAL_PREFIX = "api/v1";

async function bootstrap(): Promise<void> {
  const logger = new Logger("Bootstrap");

  // -----------------------------------------------------------------------
  // 1. Create application instance
  // -----------------------------------------------------------------------
  const app = await NestFactory.create(AppModule, {
    // Suppress NestJS's default logger during startup; we use our own below.
    bufferLogs: false,
  });

  const configService = app.get(ConfigService);

  const port = configService.get<number>("app.port", 3000);
  const nodeEnv = configService.get<string>("app.nodeEnv", "development");
  const frontendUrl = configService.get<string>(
    "app.frontendUrl",
    "http://localhost:5173",
  );

  // 支持逗号分隔的多个 origin，例如：
  // FRONTEND_URL=http://localhost:5173,http://192.168.100.219:5173
  const allowedOrigins = frontendUrl
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  // -----------------------------------------------------------------------
  // 2. CORS
  //    Allow credentials so the browser can send the Authorization header.
  //    In production, lock `origin` down to the exact frontend domain.
  // -----------------------------------------------------------------------
  app.enableCors({
    origin: (requestOrigin, callback) => {
      // 开发环境：放行所有来源（方便局域网调试）
      if (nodeEnv !== "production") {
        return callback(null, true);
      }
      // 生产环境：只放行白名单中的 origin
      if (!requestOrigin || allowedOrigins.includes(requestOrigin)) {
        callback(null, true);
      } else {
        callback(
          new Error(`CORS policy: origin ${requestOrigin} is not allowed`),
        );
      }
    },
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    exposedHeaders: ["X-Total-Count"],
  });

  // -----------------------------------------------------------------------
  // 3. Global API prefix  (e.g. /api/v1/users)
  // -----------------------------------------------------------------------
  app.setGlobalPrefix(GLOBAL_PREFIX);

  // -----------------------------------------------------------------------
  // 4. Global ValidationPipe
  //    - whitelist:            strips properties not declared in the DTO
  //    - transform:            coerces primitives (e.g. "3" → 3) and
  //                            instantiates DTO classes
  //    - forbidNonWhitelisted: throws 400 instead of silently stripping
  //    - transformOptions:     enables implicit type conversion for
  //                            @Type()-less decorators
  // -----------------------------------------------------------------------
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // -----------------------------------------------------------------------
  // 5. Global exception filter
  //    Must be registered BEFORE the interceptor so it can intercept errors
  //    that originate inside the interceptor chain.
  // -----------------------------------------------------------------------
  app.useGlobalFilters(new HttpExceptionFilter());

  // -----------------------------------------------------------------------
  // 6. Global response interceptor
  //    Wraps every successful response in { success, data, timestamp }.
  // -----------------------------------------------------------------------
  app.useGlobalInterceptors(new ResponseInterceptor());

  // -----------------------------------------------------------------------
  // 7. Swagger / OpenAPI
  //    Available only in non-production environments by default.
  //    Set SWAGGER_ENABLED=true in production if you need it there.
  // -----------------------------------------------------------------------
  if (nodeEnv !== "production") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Lost & Find API")
      .setDescription(
        `REST API for the **Lost & Find** QR-code application.\n\n` +
          `Attach your access token via the 🔒 Authorize button below.`,
      )
      .setVersion("1.0")
      .addBearerAuth(
        {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            'Enter your **access token** (without the "Bearer " prefix)',
          in: "header",
        },
        // Security scheme name referenced by @ApiBearerAuth() decorators
        "access-token",
      )
      .addTag("auth", "Authentication — OTP login & token management")
      .addTag("users", "User profile management")
      .addTag("qr-codes", "QR code lifecycle (create, update, generate image)")
      .addTag("scan", "QR code scan recording & analytics")
      .addTag("messages", "Finder → owner contact messages")
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup(`${GLOBAL_PREFIX}/docs`, app, document, {
      swaggerOptions: {
        // Persist the auth token across page refreshes
        persistAuthorization: true,
        // Collapse all endpoints by default for a cleaner first view
        docExpansion: "none",
        filter: true,
        showRequestDuration: true,
      },
      customSiteTitle: "Lost & Find API Docs",
    });

    logger.log(
      `📚 Swagger docs → http://localhost:${port}/${GLOBAL_PREFIX}/docs`,
    );
  }

  // -----------------------------------------------------------------------
  // 8. Graceful shutdown hooks
  //    Required for PrismaService.$disconnect() and RedisService.quit()
  //    to fire correctly on SIGTERM / SIGINT.
  // -----------------------------------------------------------------------
  app.enableShutdownHooks();

  // -----------------------------------------------------------------------
  // 9. Start listening
  // -----------------------------------------------------------------------
  await app.listen(port);

  logger.log(`🚀 Application is running in [${nodeEnv}] mode`);
  logger.log(
    `🌐 HTTP server        → http://localhost:${port}/${GLOBAL_PREFIX}`,
  );
  logger.log(`🔗 Allowed origin     → ${frontendUrl}`);
}

bootstrap().catch((err: unknown) => {
  const logger = new Logger("Bootstrap");
  logger.error(
    "Fatal error during application bootstrap",
    err instanceof Error ? err.stack : String(err),
  );
  process.exit(1);
});
