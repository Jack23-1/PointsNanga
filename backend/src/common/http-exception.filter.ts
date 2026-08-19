import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";

@Catch()
export class SafeHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SafeHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const requestId = response.getHeader("X-Request-Id");

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.originalUrl} -> ${status} [${String(requestId ?? "-")}]`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const message = typeof body === "string"
        ? body
        : (body as { message?: string | string[] }).message ?? exception.message;
      response.status(status).json({ statusCode: status, message, requestId });
      return;
    }

    response.status(status).json({
      statusCode: status,
      message: "Une erreur interne est survenue.",
      requestId,
    });
  }
}
