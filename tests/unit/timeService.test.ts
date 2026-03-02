import { TimeService } from '../../src/utils/timeService';

describe('TimeService', () => {
  afterEach(() => {
    TimeService.clearMock();
  });

  describe('utcNow()', () => {
    it('should return an ISO 8601 UTC timestamp', () => {
      const now = TimeService.utcNow();
      expect(now).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(now).toContain('Z');
    });

    it('should return mock time when set', () => {
      const mockTime = '2026-03-01T12:00:00.000Z';
      TimeService.setMock(mockTime);

      expect(TimeService.utcNow()).toBe(mockTime);
    });

    it('should return real time after clearing mock', () => {
      TimeService.setMock('2026-01-01T00:00:00.000Z');
      TimeService.clearMock();

      const now = TimeService.utcNow();
      expect(now).not.toBe('2026-01-01T00:00:00.000Z');
    });
  });

  describe('utcNowMs()', () => {
    it('should return epoch milliseconds', () => {
      const ms = TimeService.utcNowMs();
      expect(typeof ms).toBe('number');
      expect(ms).toBeGreaterThan(0);
    });

    it('should return mock time in ms when set', () => {
      const mockTime = '2026-03-01T12:00:00.000Z';
      TimeService.setMock(mockTime);

      const expected = new Date(mockTime).getTime();
      expect(TimeService.utcNowMs()).toBe(expected);
    });
  });
});
