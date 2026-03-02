/**
 * Time service for consistent timestamp generation.
 * Always use TimeService.utcNow() instead of Date.now() for testability.
 */
export class TimeService {
  private static mockNow: string | null = null;

  /** Get current UTC timestamp in ISO 8601 format */
  static utcNow(): string {
    if (this.mockNow) return this.mockNow;
    return new Date().toISOString();
  }

  /** Get current UTC timestamp as epoch milliseconds */
  static utcNowMs(): number {
    if (this.mockNow) return new Date(this.mockNow).getTime();
    return Date.now();
  }

  /** Set a mock time (for testing) */
  static setMock(isoString: string): void {
    this.mockNow = isoString;
  }

  /** Clear mock time (for testing) */
  static clearMock(): void {
    this.mockNow = null;
  }
}
