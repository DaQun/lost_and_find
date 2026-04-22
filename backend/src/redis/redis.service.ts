import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

/**
 * RedisService
 *
 * Thin wrapper around ioredis that:
 *  - reads connection settings from ConfigService (via `configuration.ts`)
 *  - exposes a small, strongly-typed helper API used across the application
 *  - handles graceful connect / disconnect via NestJS lifecycle hooks
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);
    const password = this.configService.get<string | undefined>(
      'redis.password',
    );

    const options: RedisOptions = {
      host,
      port,
      // Only pass the password field when it's a non-empty string so that
      // ioredis doesn't send AUTH to a password-less Redis instance.
      ...(password ? { password } : {}),
      /**
       * Reconnection strategy: exponential-ish back-off capped at 2 seconds.
       * Returning `null` stops retrying (we don't do that here so the service
       * keeps trying to reconnect on transient network failures).
       */
      retryStrategy: (times: number): number => {
        const delay = Math.min(times * 100, 2000);
        this.logger.warn(
          `Redis reconnect attempt #${times} — next try in ${delay} ms`,
        );
        return delay;
      },
      /** Avoid crashing the process on unhandled connection errors. */
      lazyConnect: true,
      enableReadyCheck: true,
    };

    this.client = new Redis(options);

    /* ---- event wiring ---- */
    this.client.on('connect', () =>
      this.logger.log(`Redis connected → ${host}:${port}`),
    );
    this.client.on('ready', () => this.logger.log('Redis client ready'));
    this.client.on('error', (err: Error) =>
      this.logger.error(`Redis error: ${err.message}`, err.stack),
    );
    this.client.on('close', () => this.logger.warn('Redis connection closed'));
    this.client.on('reconnecting', () =>
      this.logger.log('Redis reconnecting…'),
    );
    this.client.on('end', () =>
      this.logger.log('Redis connection ended (no more retries)'),
    );
  }

  // ------------------------------------------------------------------
  // Lifecycle hooks
  // ------------------------------------------------------------------

  /** Explicitly open the connection when the module is initialised. */
  async onModuleInit(): Promise<void> {
    await this.client.connect();
  }

  /**
   * Gracefully quit (sends QUIT command, waits for in-flight commands) when
   * the application is shutting down.
   */
  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
    this.logger.log('Redis client disconnected');
  }

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------

  /**
   * Store a string value under `key`.
   *
   * @param key        Redis key
   * @param value      String value to store
   * @param ttlSeconds Optional TTL in **seconds**; omit for no expiry
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds !== undefined && ttlSeconds > 0) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Retrieve the string value stored at `key`.
   *
   * @returns The stored string, or `null` if the key does not exist / has expired.
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * Delete one or more keys.
   *
   * @param key Redis key to delete
   */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Check whether `key` exists in Redis.
   *
   * @returns `true` if the key exists and has not expired, `false` otherwise.
   */
  async exists(key: string): Promise<boolean> {
    const count = await this.client.exists(key);
    return count > 0;
  }

  /**
   * Set the TTL (time-to-live) on an existing key.
   *
   * @param key        Redis key
   * @param ttlSeconds New TTL in **seconds**
   * @returns `true` if the timeout was set, `false` if the key does not exist.
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.client.expire(key, ttlSeconds);
    return result === 1;
  }

  /**
   * Atomically increment a counter stored at `key` by 1.
   * If the key does not exist it is initialised to 0 before incrementing.
   *
   * @returns The new integer value after incrementing.
   */
  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  /**
   * Set a key **only if it does not already exist** (SET NX EX pattern).
   * Useful for distributed locks / idempotency tokens.
   *
   * @param key        Redis key
   * @param value      Value to set
   * @param ttlSeconds Mandatory TTL — the lock should always expire
   * @returns `true` if the key was set (lock acquired), `false` if it already existed.
   */
  async setNx(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  /**
   * Returns a reference to the raw ioredis client.
   * Prefer the typed helpers above; only use this for advanced operations.
   */
  getClient(): Redis {
    return this.client;
  }
}
