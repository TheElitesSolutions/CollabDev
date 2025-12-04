import { ErrorDetailDto } from '@/common/dto/error-detail.dto';
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
 * Global HTTP exception filter that standardizes error responses
 * across the entire application.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorResponse = this.buildErrorResponse(
      status,
      exceptionResponse,
      request,
    );

    // Log error details for debugging
    this.logError(errorResponse, request, exception);

    response.status(status).send(errorResponse);
  }

  private buildErrorResponse(
    status: number,
    exceptionResponse: string | object,
    _request: FastifyRequest,
  ): ErrorDto {
    const errorDto: ErrorDto = {
      statusCode: status,
      error: this.getErrorName(status),
      message: this.extractMessage(exceptionResponse),
      errorCode: this.extractErrorCode(status, exceptionResponse),
    };

    // Handle validation errors (UnprocessableEntityException)
    if (status === HttpStatus.UNPROCESSABLE_ENTITY) {
      errorDto.details = this.extractValidationDetails(exceptionResponse);
    }

    // Include additional data if present
    if (typeof exceptionResponse === 'object' && 'data' in exceptionResponse) {
      (errorDto as any).data = (exceptionResponse as any).data;
    }

    return errorDto;
  }

  private extractMessage(exceptionResponse: string | object): string {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    const response = exceptionResponse as any;

    // Handle array of messages (validation errors)
    if (Array.isArray(response.message)) {
      return response.message[0]?.constraints
        ? (Object.values(response.message[0].constraints)[0] as string)
        : response.message[0] || 'Validation failed';
    }

    return response.message || response.error || 'An error occurred';
  }

  private extractErrorCode(
    status: number,
    exceptionResponse: string | object,
  ): string {
    if (typeof exceptionResponse === 'object') {
      const response = exceptionResponse as any;
      if (response.errorCode) {
        return response.errorCode;
      }
    }

    // Generate error code from status
    const errorCodes: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'VALIDATION_ERROR',
      [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
    };

    return errorCodes[status] || `HTTP_${status}`;
  }

  private extractValidationDetails(
    exceptionResponse: string | object,
  ): ErrorDetailDto[] {
    if (typeof exceptionResponse !== 'object') {
      return [];
    }

    const response = exceptionResponse as any;
    const message = response.message;

    if (!Array.isArray(message)) {
      return [];
    }

    return message.map((error: any) => {
      const constraints = error.constraints || {};
      const codes = Object.keys(constraints);
      const messages = Object.values(constraints);

      return {
        property: error.property || 'unknown',
        code: codes[0] || 'validation_error',
        message: (messages[0] as string) || 'Invalid value',
      };
    });
  }

  private getErrorName(status: number): string {
    const errorNames: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'Bad Request',
      [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
      [HttpStatus.FORBIDDEN]: 'Forbidden',
      [HttpStatus.NOT_FOUND]: 'Not Found',
      [HttpStatus.METHOD_NOT_ALLOWED]: 'Method Not Allowed',
      [HttpStatus.CONFLICT]: 'Conflict',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
      [HttpStatus.TOO_MANY_REQUESTS]: 'Too Many Requests',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
      [HttpStatus.BAD_GATEWAY]: 'Bad Gateway',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'Service Unavailable',
    };

    return errorNames[status] || 'Error';
  }

  private logError(
    errorResponse: ErrorDto,
    request: FastifyRequest,
    exception: HttpException,
  ): void {
    const logMessage = {
      statusCode: errorResponse.statusCode,
      errorCode: errorResponse.errorCode,
      message: errorResponse.message,
      path: request.url,
      method: request.method,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    };

    if (errorResponse.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(logMessage, exception.stack);
    } else if (errorResponse.statusCode >= HttpStatus.BAD_REQUEST) {
      this.logger.warn(logMessage);
    }
  }
}
