import { Logger } from '../../src/utils/logger';

describe('Logger', () => {
  let logger: Logger;
  let consoleSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new Logger('TestContext');
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('PHI scrubbing', () => {
    it('should redact participantId from log output', () => {
      logger.info('Test message', { participantId: 'REAL-PARTICIPANT-123' });

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const logOutput = consoleSpy.mock.calls[0][0];
      expect(logOutput).not.toContain('REAL-PARTICIPANT-123');
      expect(logOutput).toContain('[REDACTED]');
    });

    it('should redact deviceId from log output', () => {
      logger.info('Test message', { deviceId: 'device-secret-456' });

      const logOutput = consoleSpy.mock.calls[0][0];
      expect(logOutput).not.toContain('device-secret-456');
      expect(logOutput).toContain('[REDACTED]');
    });

    it('should redact GPS coordinates from log output', () => {
      logger.info('Test message', {
        latitude: 44.04505,
        longitude: -123.07246,
      });

      const logOutput = consoleSpy.mock.calls[0][0];
      expect(logOutput).not.toContain('44.04505');
      expect(logOutput).not.toContain('-123.07246');
    });

    it('should redact email and phone from log output', () => {
      logger.info('Test message', {
        email: 'patient@example.com',
        phone: '555-0123',
      });

      const logOutput = consoleSpy.mock.calls[0][0];
      expect(logOutput).not.toContain('patient@example.com');
      expect(logOutput).not.toContain('555-0123');
    });

    it('should NOT redact non-PHI fields', () => {
      logger.info('Test message', {
        studyId: 'study-001',
        sensorType: 'accelerometer',
        count: 42,
      });

      const logOutput = consoleSpy.mock.calls[0][0];
      expect(logOutput).toContain('study-001');
      expect(logOutput).toContain('accelerometer');
      expect(logOutput).toContain('42');
    });
  });

  describe('survey response logging', () => {
    it('should redact participantId when logging survey response submission', () => {
      // Simulate the logging pattern from surveys.ts POST /api/surveys/:surveyId/responses
      const participantId = 'PARTICIPANT-PHI-12345';
      const surveyId = 'survey-001';

      // This is how we now log (PHI is in metadata and gets scrubbed)
      logger.info('Survey response submitted', { surveyId, participantId });

      const logOutput = consoleSpy.mock.calls[0][0];
      expect(logOutput).not.toContain(participantId);
      expect(logOutput).toContain('[REDACTED]');
      expect(logOutput).toContain(surveyId); // Non-PHI should still be logged
    });
  });

  describe('log levels', () => {
    it('should use console.log for info level', () => {
      logger.info('Info message');
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should use console.error for error level', () => {
      logger.error('Error message');
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should include context in log output', () => {
      logger.info('Test message');
      const logOutput = consoleSpy.mock.calls[0][0];
      expect(logOutput).toContain('TestContext');
    });

    it('should include timestamp in log output', () => {
      logger.info('Test message');
      const logOutput = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(logOutput);
      expect(parsed.timestamp).toBeDefined();
      expect(new Date(parsed.timestamp).getTime()).not.toBeNaN();
    });
  });
});
