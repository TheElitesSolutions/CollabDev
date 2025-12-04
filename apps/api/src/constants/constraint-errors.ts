/**
 * Mapping of database constraint names to user-friendly error messages.
 * Used by PrismaExceptionFilter to provide meaningful error responses.
 */
export const constraintErrors: Record<string, string> = Object.freeze({
  // User constraints
  UQ_user_username: 'A user with this username already exists',
  UQ_user_email: 'A user with this email already exists',

  // Project constraints
  UQ_project_name_owner: 'You already have a project with this name',
  UQ_project_slug: 'This project slug is already taken',

  // Project member constraints
  UQ_project_member: 'This user is already a member of the project',
  UQ_project_member_user_project: 'User is already a member of this project',

  // Project file constraints
  UQ_project_file_path: 'A file with this path already exists in the project',
  UQ_project_file_name_parent:
    'A file with this name already exists in this folder',

  // Session constraints
  UQ_session_token: 'Session token already exists',

  // Generic constraints (fallbacks)
  UQ_: 'This record already exists',
});

/**
 * Error codes that can be used across the application.
 * These provide a stable reference for client applications.
 */
export const ErrorCodes = Object.freeze({
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',

  // Authorization errors
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  NOT_PROJECT_MEMBER: 'NOT_PROJECT_MEMBER',
  NOT_PROJECT_OWNER: 'NOT_PROJECT_OWNER',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',

  // Conflict errors
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  CONFLICT: 'CONFLICT',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  USERNAME_ALREADY_EXISTS: 'USERNAME_ALREADY_EXISTS',

  // Database errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  DATABASE_UNAVAILABLE: 'DATABASE_UNAVAILABLE',
  INVALID_REFERENCE: 'INVALID_REFERENCE',

  // Rate limiting
  RATE_LIMITED: 'RATE_LIMITED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // File errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
});

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
