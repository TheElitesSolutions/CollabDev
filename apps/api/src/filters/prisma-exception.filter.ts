import { ErrorDto } from '@/common/dto/error.dto';
import { constraintErrors } from '@/constants/constraint-errors';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Exception filter for Prisma database errors.
 * Converts Prisma-specific errors to user-friendly HTTP responses.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const errorResponse = this.buildErrorResponse(exception, request);

    this.logger.warn({
      code: exception.code,
      message: errorResponse.message,
      path: request.url,
      method: request.method,
      meta: exception.meta,
    });

    response.status(errorResponse.statusCode).send(errorResponse);
  }

  private buildErrorResponse(
    exception: Prisma.PrismaClientKnownRequestError,
    _request: FastifyRequest,
  ): ErrorDto {
    const { statusCode, error, message, errorCode } =
      this.mapPrismaError(exception);

    return {
      statusCode,
      error,
      message,
      errorCode,
    };
  }

  private mapPrismaError(exception: Prisma.PrismaClientKnownRequestError): {
    statusCode: number;
    error: string;
    message: string;
    errorCode: string;
  } {
    const meta = exception.meta as Record<string, any> | undefined;

    switch (exception.code) {
      // Unique constraint violation
      case 'P2002': {
        const target = meta?.target as string[] | undefined;
        const field = target?.[0] || 'field';
        const constraintName = meta?.constraint as string | undefined;
        const customMessage = constraintName
          ? constraintErrors[constraintName]
          : undefined;

        return {
          statusCode: HttpStatus.CONFLICT,
          error: 'Conflict',
          message:
            customMessage || `A record with this ${field} already exists`,
          errorCode: 'DUPLICATE_ENTRY',
        };
      }

      // Foreign key constraint violation
      case 'P2003': {
        const field = meta?.field_name as string | undefined;
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: `Invalid reference: ${field || 'related record'} does not exist`,
          errorCode: 'INVALID_REFERENCE',
        };
      }

      // Record not found
      case 'P2025': {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          error: 'Not Found',
          message: 'The requested record was not found',
          errorCode: 'RECORD_NOT_FOUND',
        };
      }

      // Required field missing
      case 'P2011': {
        const constraint = meta?.constraint as string | undefined;
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: `Required field ${constraint || 'value'} is missing`,
          errorCode: 'REQUIRED_FIELD_MISSING',
        };
      }

      // Invalid field value
      case 'P2006': {
        const field = meta?.field_name as string | undefined;
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: `Invalid value provided for ${field || 'field'}`,
          errorCode: 'INVALID_FIELD_VALUE',
        };
      }

      // Value too long
      case 'P2000': {
        const column = meta?.column_name as string | undefined;
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: `Value too long for ${column || 'field'}`,
          errorCode: 'VALUE_TOO_LONG',
        };
      }

      // Table does not exist
      case 'P2021': {
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Internal Server Error',
          message: 'Database configuration error',
          errorCode: 'DATABASE_ERROR',
        };
      }

      // Column does not exist
      case 'P2022': {
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Internal Server Error',
          message: 'Database configuration error',
          errorCode: 'DATABASE_ERROR',
        };
      }

      // Connection error
      case 'P1001':
      case 'P1002': {
        return {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          error: 'Service Unavailable',
          message: 'Database connection error. Please try again later.',
          errorCode: 'DATABASE_UNAVAILABLE',
        };
      }

      // Default fallback
      default: {
        this.logger.error(
          `Unhandled Prisma error code: ${exception.code}`,
          exception.message,
        );
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Internal Server Error',
          message: 'An unexpected database error occurred',
          errorCode: 'DATABASE_ERROR',
        };
      }
    }
  }
}

/**
 * Filter for Prisma validation errors (e.g., invalid query arguments)
 */
@Catch(Prisma.PrismaClientValidationError)
export class PrismaValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaValidationExceptionFilter.name);

  catch(exception: Prisma.PrismaClientValidationError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    this.logger.error({
      message: 'Prisma validation error',
      path: request.url,
      method: request.method,
      error: exception.message,
    });

    const errorResponse: ErrorDto = {
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      message: 'Invalid request data',
      errorCode: 'VALIDATION_ERROR',
    };

    response.status(HttpStatus.BAD_REQUEST).send(errorResponse);
  }
}
