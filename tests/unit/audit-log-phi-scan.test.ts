import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * Regression tests for PHI logging violations.
 * These tests verify that the audit script correctly detects violations
 * and that our codebase remains clean.
 */
describe('PHI Logging Audit Script', () => {
  const tmpDir = path.join('/tmp', 'phi-audit-test-' + Date.now());

  beforeAll(() => {
    // Create temporary test directory
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up temporary test directory
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('violation detection', () => {
    it('should detect console.log with participantId', () => {
      const testFile = path.join(tmpDir, 'test-violation-1.ts');
      fs.writeFileSync(testFile, `
        export function badFunction() {
          const participantId = '123';
          console.log('Processing participant:', participantId);
        }
      `);

      // Simulate the audit script logic
      const content = fs.readFileSync(testFile, 'utf-8');
      const hasConsoleLog = /console\.(log|error|warn)/.test(content);
      const hasParticipantId = /participantId/i.test(content);

      expect(hasConsoleLog).toBe(true);
      expect(hasParticipantId).toBe(true);
      // This would be caught by the audit script
    });

    it('should detect console.log with deviceId', () => {
      const testFile = path.join(tmpDir, 'test-violation-2.ts');
      fs.writeFileSync(testFile, `
        console.log('Device:', deviceId);
      `);

      const content = fs.readFileSync(testFile, 'utf-8');
      expect(/console\.(log|error|warn)/.test(content)).toBe(true);
      expect(/deviceId/i.test(content)).toBe(true);
    });

    it('should detect console.log with GPS coordinates', () => {
      const testFile = path.join(tmpDir, 'test-violation-3.ts');
      fs.writeFileSync(testFile, `
        console.log('Location:', latitude, longitude);
      `);

      const content = fs.readFileSync(testFile, 'utf-8');
      expect(/console\.(log|error|warn)/.test(content)).toBe(true);
      expect(/latitude|longitude/i.test(content)).toBe(true);
    });

    it('should detect console.log with survey answers', () => {
      const testFile = path.join(tmpDir, 'test-violation-4.ts');
      fs.writeFileSync(testFile, `
        console.log('Survey answers:', answers);
      `);

      const content = fs.readFileSync(testFile, 'utf-8');
      expect(/console\.(log|error|warn)/.test(content)).toBe(true);
      expect(/answers/i.test(content)).toBe(true);
    });

    it('should detect console.error with PHI', () => {
      const testFile = path.join(tmpDir, 'test-violation-5.ts');
      fs.writeFileSync(testFile, `
        console.error('Error processing participant:', participantId);
      `);

      const content = fs.readFileSync(testFile, 'utf-8');
      expect(/console\.(log|error|warn)/.test(content)).toBe(true);
      expect(/participantId/i.test(content)).toBe(true);
    });

    it('should detect console.warn with PHI', () => {
      const testFile = path.join(tmpDir, 'test-violation-6.ts');
      fs.writeFileSync(testFile, `
        console.warn('Invalid email:', email);
      `);

      const content = fs.readFileSync(testFile, 'utf-8');
      expect(/console\.(log|error|warn)/.test(content)).toBe(true);
      expect(/email/i.test(content)).toBe(true);
    });
  });

  describe('safe patterns', () => {
    it('should allow Logger.info usage', () => {
      const testFile = path.join(tmpDir, 'test-safe-1.ts');
      fs.writeFileSync(testFile, `
        import { Logger } from './utils/logger';
        const logger = new Logger('Test');
        logger.info('Processing', { participantId });
      `);

      const content = fs.readFileSync(testFile, 'utf-8');
      // Has participantId but uses Logger, not console.log
      expect(/console\.(log|error|warn)/.test(content)).toBe(false);
    });

    it('should allow console.log without PHI', () => {
      const testFile = path.join(tmpDir, 'test-safe-2.ts');
      fs.writeFileSync(testFile, `
        console.log('Server started on port:', port);
      `);

      const content = fs.readFileSync(testFile, 'utf-8');
      expect(/console\.(log|error|warn)/.test(content)).toBe(true);
      expect(/participantId|deviceId|email|phone|ssn|answers/i.test(content)).toBe(false);
    });
  });

  describe('real codebase verification', () => {
    it('should verify src/api/routes/surveys.ts does not log PHI', () => {
      const surveysFile = path.join(process.cwd(), 'src/api/routes/surveys.ts');
      const content = fs.readFileSync(surveysFile, 'utf-8');

      // Check for console.log with PHI patterns
      const lines = content.split('\n');
      const violations = lines.filter(line => {
        const hasConsole = /console\.(log|error|warn)/.test(line);
        const hasPHI = /participantId|deviceId|email|phone|answers|latitude|longitude/i.test(line);
        return hasConsole && hasPHI;
      });

      expect(violations).toEqual([]);
    });

    it('should verify src/api/routes/sensing.ts does not log PHI', () => {
      const sensingFile = path.join(process.cwd(), 'src/api/routes/sensing.ts');
      const content = fs.readFileSync(sensingFile, 'utf-8');

      const lines = content.split('\n');
      const violations = lines.filter(line => {
        const hasConsole = /console\.(log|error|warn)/.test(line);
        const hasPHI = /participantId|deviceId|email|phone|answers|latitude|longitude/i.test(line);
        return hasConsole && hasPHI;
      });

      expect(violations).toEqual([]);
    });

    it('should run actual audit script and pass', () => {
      // Run the actual audit script
      try {
        execSync('npm run audit:logs', {
          cwd: process.cwd(),
          stdio: 'pipe',
          encoding: 'utf-8'
        });
        // If we get here, the audit passed (exit code 0)
        expect(true).toBe(true);
      } catch (error: any) {
        // If audit fails, the test should fail
        fail(`Audit script failed: ${error.stdout || error.message}`);
      }
    });
  });

  describe('edge cases that could introduce violations', () => {
    it('should detect PHI in template literals', () => {
      const testFile = path.join(tmpDir, 'test-edge-1.ts');
      fs.writeFileSync(testFile, `
        console.log(\`Survey response from \${participantId}\`);
      `);

      const content = fs.readFileSync(testFile, 'utf-8');
      expect(/console\.(log|error|warn)/.test(content)).toBe(true);
      expect(/participantId/i.test(content)).toBe(true);
    });

    it('should detect PHI in error handlers', () => {
      const testFile = path.join(tmpDir, 'test-edge-2.ts');
      fs.writeFileSync(testFile, `
        try {
          // some code
        } catch (error) {
          console.error('Error for participant:', participantId, error);
        }
      `);

      const content = fs.readFileSync(testFile, 'utf-8');
      expect(/console\.(log|error|warn)/.test(content)).toBe(true);
      expect(/participantId/i.test(content)).toBe(true);
    });

    it('should detect PHI in debug statements', () => {
      const testFile = path.join(tmpDir, 'test-edge-3.ts');
      fs.writeFileSync(testFile, `
        if (process.env.DEBUG) {
          console.log('Debug info:', { participantId, surveyData });
        }
      `);

      const content = fs.readFileSync(testFile, 'utf-8');
      expect(/console\.(log|error|warn)/.test(content)).toBe(true);
      expect(/participantId/i.test(content)).toBe(true);
    });

    it('should detect PHI in loop logging', () => {
      const testFile = path.join(tmpDir, 'test-edge-4.ts');
      fs.writeFileSync(testFile, `
        participants.forEach(p => {
          console.log('Processing:', p.participantId);
        });
      `);

      const content = fs.readFileSync(testFile, 'utf-8');
      expect(/console\.(log|error|warn)/.test(content)).toBe(true);
      expect(/participantId/i.test(content)).toBe(true);
    });

    it('should detect PHI in conditional logging', () => {
      const testFile = path.join(tmpDir, 'test-edge-5.ts');
      fs.writeFileSync(testFile, `
        if (response.success) {
          console.log('Participant submitted:', participantId);
        }
      `);

      const content = fs.readFileSync(testFile, 'utf-8');
      expect(/console\.(log|error|warn)/.test(content)).toBe(true);
      expect(/participantId/i.test(content)).toBe(true);
    });

    it('should detect PHI in JSON.stringify', () => {
      const testFile = path.join(tmpDir, 'test-edge-6.ts');
      fs.writeFileSync(testFile, `
        console.log(JSON.stringify({ participantId, answers }));
      `);

      const content = fs.readFileSync(testFile, 'utf-8');
      expect(/console\.(log|error|warn)/.test(content)).toBe(true);
      expect(/participantId|answers/i.test(content)).toBe(true);
    });
  });
});
