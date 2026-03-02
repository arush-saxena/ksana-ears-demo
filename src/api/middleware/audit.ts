import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../utils/logger';

const logger = new Logger('AuditMiddleware');

/**
 * HIPAA §164.312(b) — Audit Controls
 *
 * Records all access to PHI-containing endpoints. Logs are structured
 * and PHI-scrubbed to be safe for aggregation in Azure Monitor / Log Analytics.
 *
 * Records:
 *  - Who (authenticated user subject ID)
 *  - What (HTTP method, path, status code)
 *  - When (ISO 8601 UTC timestamp)
 *  - Outcome (success/failure based on status code)
 */
export function auditMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();

  // Capture the original end method to intercept response completion
  const originalEnd = res.end;
  res.end = function (...args: any[]) {
    const duration = Date.now() - startTime;
    const user = (req as any).user;

    const auditEntry = {
      event: 'phi_access',
      userId: user?.sub || 'anonymous',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
      outcome: res.statusCode < 400 ? 'success' : 'failure',
      // Do NOT log request body, query params, or any PHI fields
      userAgent: req.headers['user-agent'],
    };

    // Use structured logger (PHI-scrubbing is automatic)
    logger.info('Audit trail entry', auditEntry);

    return originalEnd.apply(res, args);
  } as any;

  next();
}

/**
 * Creates a summary of audit events for compliance reporting.
 * Call this from a scheduled job or admin endpoint.
 */
export function generateAuditSummary(
  entries: AuditEntry[]
): AuditSummary {
  const totalRequests = entries.length;
  const failures = entries.filter((e) => e.outcome === 'failure').length;
  const uniqueUsers = new Set(entries.map((e) => e.userId)).size;
  const avgDuration =
    entries.reduce((sum, e) => sum + e.durationMs, 0) / totalRequests || 0;

  return {
    period: {
      start: entries[0]?.timestamp || new Date().toISOString(),
      end: entries[entries.length - 1]?.timestamp || new Date().toISOString(),
    },
    totalRequests,
    failedRequests: failures,
    successRate: ((totalRequests - failures) / totalRequests) * 100,
    uniqueUsers,
    averageDurationMs: Math.round(avgDuration),
  };
}

interface AuditEntry {
  timestamp: string;
  userId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  outcome: 'success' | 'failure';
}

interface AuditSummary {
  period: { start: string; end: string };
  totalRequests: number;
  failedRequests: number;
  successRate: number;
  uniqueUsers: number;
  averageDurationMs: number;
}
