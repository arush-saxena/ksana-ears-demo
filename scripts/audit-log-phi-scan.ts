import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, '..', 'src');
const ALLOWED_CONSOLE_FILES = [path.resolve(__dirname, '..', 'src/utils/logger.ts')];
const violations: string[] = [];

const PHI_INDICATORS = [
  'participantid',
  'deviceid',
  'gps',
  'latitude',
  'longitude',
  'answers',
  'surveyresponses',
];

const isConsoleAllowed = (filePath: string): boolean =>
  ALLOWED_CONSOLE_FILES.includes(filePath);

const collectSourceFiles = (dir: string): string[] => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectSourceFiles(fullPath);
    }
    if (entry.isFile() && fullPath.endsWith('.ts')) {
      return [fullPath];
    }
    return [];
  });
};

const scanFileForConsole = (filePath: string): void => {
  if (isConsoleAllowed(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (line.includes('console.log') || line.includes('console.error')) {
      const normalized = line.toLowerCase();
      const hasPhi = PHI_INDICATORS.some((indicator) => normalized.includes(indicator));
      const reason = hasPhi ? 'potential PHI detected' : 'console statements must use Logger';
      violations.push(`${filePath}:${index + 1} - ${reason}`);
    }
  });
};

const reportResults = (): void => {
  if (violations.length === 0) {
    console.log('No disallowed console logging detected.');
    return;
  }

  console.error('PHI logging audit failed:');
  violations.forEach((violation) => console.error(` - ${violation}`));
  process.exitCode = 1;
};

const main = (): void => {
  const files = collectSourceFiles(SRC_DIR);
  files.forEach(scanFileForConsole);
  reportResults();
};

main();
