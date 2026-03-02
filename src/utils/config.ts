/**
 * Centralized configuration service.
 * Always use ConfigService.get() instead of process.env directly.
 */
export class ConfigService {
  private static config: Record<string, string> = {};

  /** Get a config value with an optional default */
  static get<T = string>(key: string, defaultValue?: T): T {
    const value = process.env[key] || this.config[key];
    if (value === undefined && defaultValue !== undefined) {
      return defaultValue;
    }
    if (value === undefined) {
      throw new Error(`Missing required configuration: ${key}`);
    }
    return value as unknown as T;
  }

  /** Set a config value (used in tests) */
  static set(key: string, value: string): void {
    this.config[key] = value;
  }
}
