/**
 * Audit script to detect PHI logging violations in the codebase.
 * Scans for console.log/error/warn statements that may expose PHI.
 *
 * Usage: npm run audit:logs
 *
 * Exit codes:
 *   0 - No violations found
 *   1 - PHI logging violations detected
 */

import * as fs from 'fs';
import * as path from 'path';

interface Violation {
  file: string;
  line: number;
  content: string;
}

// PHI field patterns to detect in console.log statements
const PHI_PATTERNS = [
  /participantId/i,
  /deviceId/i,
  /email/i,
  /phone/i,
  /ssn/i,
  /dateOfBirth/i,
  /address/i,
  /gpsCoordinates/i,
  /latitude/i,
  /longitude/i,
  /name/i,
  /answers/i,
  /surveyResponses/i,
];

// Files to exclude from scanning
const EXCLUDED_PATHS = [
  'node_modules',
  'dist',
  'coverage',
  '.git',
  'scripts/audit-log-phi-scan.ts', // Exclude this script itself
  'src/utils/logger.ts', // Logger utility is safe (operates on sanitized data)
];

function shouldExclude(filePath: string): boolean {
  return EXCLUDED_PATHS.some(excluded => filePath.includes(excluded));
}

function scanFile(filePath: string): Violation[] {
  const violations: Violation[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Check for direct console.log/error/warn usage
    if (/console\.(log|error|warn)/.test(line)) {
      // Check if line contains PHI field references
      const containsPHI = PHI_PATTERNS.some(pattern => pattern.test(line));

      if (containsPHI) {
        violations.push({
          file: filePath,
          line: index + 1,
          content: line.trim(),
        });
      }
    }
  });

  return violations;
}

function scanDirectory(dirPath: string): Violation[] {
  let violations: Violation[] = [];

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (shouldExclude(fullPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      violations = violations.concat(scanDirectory(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
      violations = violations.concat(scanFile(fullPath));
    }
  }

  return violations;
}

function main() {
  console.log('🔍 Scanning codebase for PHI logging violations...\n');

  const srcPath = path.join(process.cwd(), 'src');
  const violations = scanDirectory(srcPath);

  if (violations.length === 0) {
    console.log('✅ No PHI logging violations detected.');
    console.log('   All console.log statements are safe or use the Logger utility.\n');
    process.exit(0);
  } else {
    console.log(`❌ Found ${violations.length} PHI logging violation(s):\n`);

    violations.forEach(violation => {
      console.log(`  File: ${violation.file}:${violation.line}`);
      console.log(`  Code: ${violation.content}\n`);
    });

    console.log('⚠️  PHI fields must never be logged in plaintext.');
    console.log('   Use Logger from src/utils/logger.ts instead of console.log.\n');
    process.exit(1);
  }
}

main();
