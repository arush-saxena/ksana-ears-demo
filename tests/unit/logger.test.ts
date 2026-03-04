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

  describe('edge cases', () => {
    it('should redact multiple PHI fields in a single log entry', () => {
      logger.info('Multiple PHI test', {
        participantId: 'PART-123',
        deviceId: 'DEVICE-456',
        email: 'test@example.com',
        studyId: 'study-999', // Non-PHI
      });

      const logOutput = consoleSpy.mock.calls[0][0];
      expect(logOutput).not.toContain('PART-123');
      expect(logOutput).not.toContain('DEVICE-456');
      expect(logOutput).not.toContain('test@example.com');
      expect(logOutput).toContain('study-999'); // Non-PHI preserved
      // Should have 3 [REDACTED] entries for the 3 PHI fields
      const redactedCount = (logOutput.match(/\[REDACTED\]/g) || []).length;
      expect(redactedCount).toBe(3);
    });

    it('should handle PHI in message string (not just metadata)', () => {
      // This is a risky pattern but the message itself is just a string
      // Logger doesn't scrub message strings, only metadata
      logger.info('User PATIENT-123 logged in', {});

      const logOutput = consoleSpy.mock.calls[0][0];
      // Message strings are NOT scrubbed - this test documents current behavior
      expect(logOutput).toContain('User PATIENT-123 logged in');
    });

    it('should handle nested objects with PHI fields', () => {
      logger.info('Nested PHI test', {
        user: {
          participantId: 'NESTED-123',
        },
        studyId: 'study-001',
      });

      const logOutput = consoleSpy.mock.calls[0][0];
      // Note: Current implementation only scrubs top-level fields
      // This test documents the limitation
      expect(logOutput).toContain('NESTED-123'); // NOT redacted (limitation)
      expect(logOutput).toContain('study-001');
    });

    it('should handle arrays with PHI', () => {
      logger.info('Array PHI test', {
        answers: [
          { questionId: 'q1', response: 'yes' },
          { questionId: 'q2', response: 'no' },
        ],
      });

      const logOutput = consoleSpy.mock.calls[0][0];
      // 'answers' is a PHI field and should be redacted
      expect(logOutput).toContain('[REDACTED]');
      expect(logOutput).not.toContain('questionId');
    });

    it('should use warn level correctly', () => {
      logger.warn('Warning message', { participantId: 'WARN-123' });

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      const logOutput = consoleSpy.mock.calls[0][0];
      expect(logOutput).toContain('[REDACTED]');
      expect(logOutput).not.toContain('WARN-123');
    });

    it('should handle empty metadata', () => {
      logger.info('No metadata');

      const logOutput = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(logOutput);
      expect(parsed.message).toBe('No metadata');
      expect(parsed.level).toBe('INFO');
    });

    it('should handle null and undefined PHI values', () => {
      logger.info('Null PHI test', {
        participantId: null,
        deviceId: undefined,
        studyId: 'study-001',
      });

      const logOutput = consoleSpy.mock.calls[0][0];
      // Null/undefined should still be redacted for safety
      expect(logOutput).toContain('[REDACTED]');
      expect(logOutput).toContain('study-001');
    });

    it('should handle all PHI field types at once', () => {
      logger.info('Comprehensive PHI test', {
        participantId: 'P123',
        deviceId: 'D456',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
        ssn: '123-45-6789',
        dateOfBirth: '1990-01-01',
        address: '123 Main St',
        gpsCoordinates: '40.7128,-74.0060',
        latitude: 40.7128,
        longitude: -74.0060,
        surveyResponses: [{ q: 'a' }],
        answers: [{ q: 'b' }],
        studyId: 'STUDY-XYZ', // Non-PHI
      });

      const logOutput = consoleSpy.mock.calls[0][0];
      // All PHI should be redacted
      expect(logOutput).not.toContain('P123');
      expect(logOutput).not.toContain('D456');
      expect(logOutput).not.toContain('John Doe');
      expect(logOutput).not.toContain('john@example.com');
      expect(logOutput).not.toContain('555-1234');
      expect(logOutput).not.toContain('123-45-6789');
      expect(logOutput).not.toContain('1990-01-01');
      expect(logOutput).not.toContain('123 Main St');
      expect(logOutput).not.toContain('40.7128,-74.0060');
      expect(logOutput).not.toContain('40.7128');
      expect(logOutput).not.toContain('-74.0060');
      // Non-PHI should be preserved
      expect(logOutput).toContain('STUDY-XYZ');
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
