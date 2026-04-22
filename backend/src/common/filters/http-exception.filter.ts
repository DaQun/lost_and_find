import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

/**
 * Shape of every error response body returned by this application.
 */
export interface ErrorResponseBody {
  /** Always `false` for error responses — mirrors the success envelope. */
  success: false;
  /** HTTP status code echoed in the body for client convenience. */
  statusCode: number;
  /** Human-readable error category, e.g. "Not Found". */
  error: string;
  /**
   * One or more error messages.
   * `class-validator` produces an array; other exceptions produce a single string.
   */
  message: string | string[];
  /** ISO-8601 timestamp of when the error occurred. */
  timestamp: string;
  /** The request path that triggered the error. */
  path: string;
  /** HTTP method of the offending request. */
  method: string;
}

/**
 * HttpExceptionFilter
 *
 * Catches **every** exception thrown anywhere in the application and
 * serialises it into a consistent JSON envelope so clients always receive
 * the same error shape regardless of where the exception originated.
 *
 * - `HttpException` subclasses → status code from the exception
 * - Unexpected runtime errors  → 500 Internal Server Error (stack traces
 *   are logged server-side but never sent to the client)
 *
 * Register globally in `main.ts`:
 * ```ts
 * app.useGlobalFilters(new HttpExceptionFilter());
 * ```
 *
 * @example Error response for a 400 from class-validator:
 * ```json
 * {
 *   "success": false,
 *   "statusCode": 400,
 *   "error": "Bad Request",
 *   "message": ["phone must be a valid phone number"],
 *   "timestamp": "2024-03-01T12:00:00.000Z",
 *   "path": "/api/v1/qr-codes",
 *   "method": "POST"
 * }
 * ```
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // ------------------------------------------------------------------
    // 1. Determine HTTP status code
    // ------------------------------------------------------------------
    const isHttpException = exception instanceof HttpException;
    const statusCode: number = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // ------------------------------------------------------------------
    // 2. Extract message(s) and a human-readable error name
    // ------------------------------------------------------------------
    let message: string | string[];
    let errorLabel: string;

    if (isHttpException) {
      const responseBody = exception.getResponse();

      if (typeof responseBody === "string") {
        // e.g. throw new NotFoundException('Resource not found')
        message = responseBody;
      } else if (typeof responseBody === "object" && responseBody !== null) {
        const body = responseBody as Record<string, unknown>;

        // class-validator validation errors → { message: string[], error: string }
        if (Array.isArray(body["message"])) {
          message = body["message"] as string[];
        } else if (typeof body["message"] === "string") {
          message = body["message"];
        } else {
          message = exception.message;
        }
      } else {
        message = exception.message;
      }

      // Map numeric status to a readable label (e.g. 404 → "Not Found")
      errorLabel = httpStatusToLabel(statusCode);
    } else {
      // Non-HTTP exception — never expose internals to the client
      message = "An unexpected internal server error occurred.";
      errorLabel = "Internal Server Error";

      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    // ------------------------------------------------------------------
    // 3. Log HTTP exceptions at the appropriate severity level
    // ------------------------------------------------------------------
    if (isHttpException) {
      const summary =
        `${request.method} ${request.url} → ${statusCode} ` +
        (Array.isArray(message) ? message.join(" | ") : message);

      if (statusCode >= 500) {
        this.logger.error(summary, (exception as HttpException).stack);
      } else if (statusCode >= 400) {
        this.logger.warn(summary);
      } else {
        this.logger.log(summary);
      }
    }

    // ------------------------------------------------------------------
    // 4. Send the unified error response
    // ------------------------------------------------------------------
    const body: ErrorResponseBody = {
      success: false,
      statusCode,
      error: errorLabel,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    response.status(statusCode).json(body);
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns a human-readable label for common HTTP status codes.
 * Falls back to the `HttpStatus` enum name (converted to Title Case) for
 * less common codes.
 */
function httpStatusToLabel(status: number): string {
  const map: Record<number, string> = {
    400: "Bad Request",
    401: "Unauthorized",
    402: "Payment Required",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    406: "Not Acceptable",
    408: "Request Timeout",
    409: "Conflict",
    410: "Gone",
    413: "Payload Too Large",
    415: "Unsupported Media Type",
    422: "Unprocessable Entity",
    429: "Too Many Requests",
    500: "Internal Server Error",
    501: "Not Implemented",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
  };

  if (map[status]) return map[status];

  // Fallback: look up the HttpStatus enum and convert UPPER_SNAKE to Title Case
  const enumName = (HttpStatus as Record<number, string>)[status];
  if (typeof enumName === "string") {
    return enumName
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/(?:^|\s)\w/g, (c: string) => c.toUpperCase());
  }

  return `HTTP Error ${status}`;
}
