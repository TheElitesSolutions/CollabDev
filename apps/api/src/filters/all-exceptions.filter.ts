import { ErrorDto } from '@/common/dto/error.dto';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Catch-all exception filter for unhandled errors.
 * This should be registered LAST so it catches anything not handled by other filters.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    // If it's an HttpException, let other filters handle it
    if (exception instanceof HttpException) {
      throw exception;
    }

    const status = HttpStatus.INTERNAL_SERVER_ERROR;

    // Log the full error for debugging
    this.logger.error(
      {
        message: 'Unhandled exception',
        path: request.url,
        method: request.method,
        error: exception instanceof Error ? exception.message : 'Unknown error',
        stack: exception instanceof Error ? exception.stack : undefined,
      },
      exception instanceof Error ? exception.stack : undefined,
    );

    const errorResponse: ErrorDto = {
      statusCode: status,
      error: 'Internal Server Error',
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : exception instanceof Error
            ? exception.message
            : 'Unknown error',
      errorCode: 'INTERNAL_ERROR',
    };

    // Include stack trace in development
    if (process.env.NODE_ENV !== 'production' && exception instanceof Error) {
      errorResponse.stack = exception.stack;
    }

    response.status(status).send(errorResponse);
  }
}
