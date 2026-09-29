/**
 * GoogleDriveErrorTranslator
 * 
 * Translates low-level Google Drive API errors, HTTP statuses, and OAuth failures
 * into sanitized SaaS application-level errors.
 * 
 * Ensures:
 * 1. Customers NEVER see Google API endpoints, Google error JSON, internal account emails,
 *    OAuth tokens, or stack traces.
 * 2. Operators receive detailed, structured internal logs for auditing and monitoring.
 */

export class StorageOperationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly internalDetails?: string;

  constructor(message: string, code = 'STORAGE_ERROR', statusCode = 500, internalDetails?: string) {
    super(message);
    this.name = 'StorageOperationError';
    this.code = code;
    this.statusCode = statusCode;
    this.internalDetails = internalDetails;
  }
}

export class StorageBackendUnavailableError extends StorageOperationError {
  constructor(internalDetails?: string) {
    super(
      'The storage backend is temporarily unavailable. Please retry in a few moments.',
      'STORAGE_BACKEND_UNAVAILABLE',
      503,
      internalDetails
    );
    this.name = 'StorageBackendUnavailableError';
  }
}

export class StorageAccountCapacityExceededError extends StorageOperationError {
  constructor(internalDetails?: string) {
    super(
      'Storage capacity limit reached on underlying storage node. Please contact support.',
      'STORAGE_ACCOUNT_CAPACITY_EXCEEDED',
      507,
      internalDetails
    );
    this.name = 'StorageAccountCapacityExceededError';
  }
}

export class StorageRateLimitError extends StorageOperationError {
  public readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds = 5, internalDetails?: string) {
    super(
      'Storage throughput limit reached. Request has been queued or rate-limited. Please retry shortly.',
      'STORAGE_RATE_LIMITED',
      429,
      internalDetails
    );
    this.name = 'StorageRateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class StorageAuthenticationError extends StorageOperationError {
  constructor(internalDetails?: string) {
    super(
      'Storage node authentication failed. Physical credentials need refresh or re-authorization.',
      'STORAGE_AUTH_FAILURE',
      500,
      internalDetails
    );
    this.name = 'StorageAuthenticationError';
  }
}

export class PhysicalObjectNotFoundError extends StorageOperationError {
  constructor(internalDetails?: string) {
    super(
      'Requested file object was not found in physical storage.',
      'PHYSICAL_OBJECT_NOT_FOUND',
      404,
      internalDetails
    );
    this.name = 'PhysicalObjectNotFoundError';
  }
}

export class GoogleDriveErrorTranslator {
  /**
   * Translates an HTTP response or Error from Google Drive into a clean SaaS error.
   */
  static async translateResponse(
    response: Response,
    context: { operation: string; accountId?: string; fileId?: string }
  ): Promise<StorageOperationError> {
    let errorBody = '';
    let parsedGoogleError: any = null;

    try {
      errorBody = await response.text();
      parsedGoogleError = JSON.parse(errorBody);
    } catch {
      // Body was not JSON
    }

    const status = response.status;
    const reason = parsedGoogleError?.error?.errors?.[0]?.reason || '';
    const message = parsedGoogleError?.error?.message || errorBody || response.statusText;

    // Redacted internal diagnostic log
    const internalLog = `[GoogleDrive API Error] op=${context.operation} account=${context.accountId || 'unknown'} status=${status} reason=${reason} msg=${message}`;
    console.error(internalLog);

    // 1. Quota & Capacity Limits
    if (
      status === 403 &&
      (reason === 'storageQuotaExceeded' ||
        message.toLowerCase().includes('quota') ||
        message.toLowerCase().includes('storage space'))
    ) {
      return new StorageAccountCapacityExceededError(internalLog);
    }

    // 2. Rate Limits & Throttling
    if (
      status === 429 ||
      (status === 403 &&
        (reason === 'userRateLimitExceeded' ||
          reason === 'rateLimitExceeded' ||
          reason === 'dailyLimitExceeded'))
    ) {
      const retryAfter = Number(response.headers.get('Retry-After') || '5');
      return new StorageRateLimitError(retryAfter, internalLog);
    }

    // 3. Authentication & OAuth Token Expiry
    if (status === 401 || (status === 400 && reason === 'invalid_grant')) {
      return new StorageAuthenticationError(internalLog);
    }

    // 4. Object Not Found
    if (status === 404 || reason === 'fileNotFound') {
      return new PhysicalObjectNotFoundError(internalLog);
    }

    // 5. Google Internal Server Errors / Network Outage
    if (status >= 500) {
      return new StorageBackendUnavailableError(internalLog);
    }

    // Fallback Generic Storage Error
    return new StorageOperationError(
      'Storage operation could not be completed.',
      'STORAGE_OP_FAILED',
      status >= 400 && status < 500 ? status : 500,
      internalLog
    );
  }

  /**
   * Sanitizes thrown JavaScript/Node exceptions (e.g. fetch network failures).
   */
  static translateError(
    err: any,
    context: { operation: string; accountId?: string; fileId?: string }
  ): StorageOperationError {
    if (err instanceof StorageOperationError) {
      return err;
    }

    const msg = String(err?.message || err);
    const internalLog = `[GoogleDrive Network/System Error] op=${context.operation} account=${context.accountId || 'unknown'} err=${msg}`;
    console.error(internalLog);

    if (msg.includes('fetch failed') || msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT')) {
      return new StorageBackendUnavailableError(internalLog);
    }

    return new StorageOperationError(
      'A storage backend communication error occurred.',
      'STORAGE_COMMUNICATION_ERROR',
      500,
      internalLog
    );
  }
}
