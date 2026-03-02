/**
 * Structured logger that ensures PHI is never logged.
 * All log output goes through this service.
 */
export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.log('INFO', message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.log('WARN', message, metadata);
  }

  error(message: string, metadata?: Record<string, any>): void {
    this.log('ERROR', message, metadata);
  }

  private log(level: string, message: string, metadata?: Record<string, any>): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      ...metadata,
    };

    // SECURITY: Scrub known PHI fields before logging
    const sanitized = this.scrubPHI(entry);

    if (level === 'ERROR') {
      console.error(JSON.stringify(sanitized));
    } else {
      console.log(JSON.stringify(sanitized));
    }
  }

  /**
   * Remove known PHI fields from log entries.
   * ⚠️  This is a safety net — developers should never pass PHI to the logger.
   */
  private scrubPHI(entry: Record<string, any>): Record<string, any> {
    const phiFields = [
      'participantId', 'deviceId', 'name', 'email', 'phone',
      'ssn', 'dateOfBirth', 'address', 'gpsCoordinates',
      'surveyResponses', 'answers', 'latitude', 'longitude',
    ];

    const sanitized = { ...entry };
    for (const field of phiFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }
    return sanitized;
  }
}
