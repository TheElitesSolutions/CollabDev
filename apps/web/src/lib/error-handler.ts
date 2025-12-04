import { toast } from '@/hooks/use-toast';
import { ApiError } from './api-client';

/**
 * Error codes returned by the API.
 * Keep in sync with backend ErrorCodes.
 */
export const ErrorCodes = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',

  // Authorization errors
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  NOT_PROJECT_MEMBER: 'NOT_PROJECT_MEMBER',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',

  // Conflict errors
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',

  // Rate limiting
  RATE_LIMITED: 'RATE_LIMITED',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

/**
 * User-friendly error messages for common error codes.
 */
const errorMessages: Record<string, string> = {
  [ErrorCodes.UNAUTHORIZED]: 'Please sign in to continue',
  [ErrorCodes.INVALID_CREDENTIALS]: 'Invalid email or password',
  [ErrorCodes.SESSION_EXPIRED]: 'Your session has expired. Please sign in again',
  [ErrorCodes.EMAIL_NOT_VERIFIED]: 'Please verify your email address',
  [ErrorCodes.FORBIDDEN]: 'You do not have permission to perform this action',
  [ErrorCodes.INSUFFICIENT_PERMISSIONS]: 'You do not have sufficient permissions',
  [ErrorCodes.NOT_PROJECT_MEMBER]: 'You are not a member of this project',
  [ErrorCodes.VALIDATION_ERROR]: 'Please check your input and try again',
  [ErrorCodes.NOT_FOUND]: 'The requested resource was not found',
  [ErrorCodes.USER_NOT_FOUND]: 'User not found',
  [ErrorCodes.PROJECT_NOT_FOUND]: 'Project not found',
  [ErrorCodes.DUPLICATE_ENTRY]: 'This record already exists',
  [ErrorCodes.EMAIL_ALREADY_EXISTS]: 'An account with this email already exists',
  [ErrorCodes.RATE_LIMITED]: 'Too many requests. Please try again later',
  [ErrorCodes.INTERNAL_ERROR]: 'An unexpected error occurred. Please try again',
  [ErrorCodes.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable. Please try again later',
};

/**
 * Options for error handling.
 */
export interface ErrorHandlerOptions {
  /** Whether to show a toast notification (default: true) */
  showToast?: boolean;
  /** Custom error messages by error code */
  customMessages?: Record<string, string>;
  /** Callback when error occurs */
  onError?: (error: ApiError) => void;
  /** Actions for specific error codes (e.g., redirect on 401) */
  actions?: Record<string, () => void>;
}

/**
 * Get a user-friendly error message from an error.
 */
export function getErrorMessage(
  error: unknown,
  customMessages?: Record<string, string>
): string {
  if (error instanceof ApiError) {
    const errorCode = error.data?.errorCode;

    // Check custom messages first
    if (customMessages && errorCode && customMessages[errorCode]) {
      return customMessages[errorCode];
    }

    // Check default messages
    if (errorCode && errorMessages[errorCode]) {
      return errorMessages[errorCode];
    }

    // Use API message
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Handle an API error with optional toast notification.
 */
export function handleApiError(
  error: unknown,
  options: ErrorHandlerOptions = {}
): void {
  const { showToast = true, customMessages, onError, actions } = options;

  if (error instanceof ApiError) {
    const errorCode = error.data?.errorCode;

    // Execute action for specific error code
    if (actions && errorCode && actions[errorCode]) {
      actions[errorCode]();
    }

    // Call error callback
    if (onError) {
      onError(error);
    }

    // Show toast notification
    if (showToast) {
      const message = getErrorMessage(error, customMessages);
      showErrorToast(message, getErrorTitle(error.status));
    }
  } else {
    // Handle non-API errors
    if (showToast) {
      showErrorToast(getErrorMessage(error));
    }
  }
}

/**
 * Get error title based on status code.
 */
function getErrorTitle(status: number): string {
  if (status === 401) return 'Authentication Required';
  if (status === 403) return 'Access Denied';
  if (status === 404) return 'Not Found';
  if (status === 409) return 'Conflict';
  if (status === 422) return 'Validation Error';
  if (status === 429) return 'Too Many Requests';
  if (status >= 500) return 'Server Error';
  return 'Error';
}

/**
 * Show an error toast notification.
 */
export function showErrorToast(message: string, title = 'Error'): void {
  toast({
    variant: 'destructive',
    title,
    description: message,
  });
}

/**
 * Show a success toast notification.
 */
export function showSuccessToast(message: string, title = 'Success'): void {
  toast({
    title,
    description: message,
  });
}

/**
 * Show an info toast notification.
 */
export function showInfoToast(message: string, title = 'Info'): void {
  toast({
    title,
    description: message,
  });
}

/**
 * Create an error handler with predefined options.
 * Useful for consistent error handling across a component or page.
 */
export function createErrorHandler(defaultOptions: ErrorHandlerOptions = {}) {
  return (error: unknown, options?: ErrorHandlerOptions) => {
    handleApiError(error, { ...defaultOptions, ...options });
  };
}

/**
 * Higher-order function that wraps an async function with error handling.
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: ErrorHandlerOptions = {}
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleApiError(error, options);
      throw error;
    }
  }) as T;
}
