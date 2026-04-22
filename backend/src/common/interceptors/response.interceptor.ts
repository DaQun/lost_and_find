import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

/**
 * Unified API response envelope returned for every successful HTTP response.
 *
 * @template T The type of the actual payload (`data` field).
 *
 * @example
 * // A successful GET /users/:id response looks like:
 * {
 *   "success": true,
 *   "data": { "id": "...", "nickname": "Alice" },
 *   "timestamp": "2024-03-01T12:00:00.000Z"
 * }
 */
export interface ApiResponse<T> {
  /** Always `true` for responses that pass through this interceptor. */
  success: true;
  /** The actual payload returned by the route handler. */
  data: T;
  /** ISO-8601 timestamp of when the response was serialised. */
  timestamp: string;
}

/**
 * ResponseInterceptor
 *
 * Globally wraps every successful controller response in an {@link ApiResponse}
 * envelope so clients receive a consistent JSON shape regardless of which
 * endpoint they call.
 *
 * Error responses are **not** handled here — they are shaped by
 * `HttpExceptionFilter` instead.
 *
 * Register globally in `main.ts`:
 * ```ts
 * app.useGlobalInterceptors(new ResponseInterceptor());
 * ```
 *
 * @template T The raw type returned by the route handler.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map(
        (data): ApiResponse<T> => ({
          success: true,
          data,
          timestamp: new Date().toISOString(),
        }),
      ),
    );
  }
}
