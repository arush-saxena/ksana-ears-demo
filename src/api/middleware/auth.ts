import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../utils/logger';

const logger = new Logger('AuthMiddleware');

/**
 * Authentication middleware for HIPAA-protected routes.
 *
 * Validates the Bearer token from the Authorization header against
 * the configured auth provider (Azure AD B2C in production).
 *
 * NOTE: This is a simplified implementation for demo purposes.
 * Production should validate JWT claims, audience, issuer, and expiry.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Missing or malformed Authorization header', {
      path: req.path,
      method: req.method,
    });
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Bearer token required',
    });
    return;
  }

  const token = authHeader.substring(7);

  try {
    // TODO: Replace with real JWT verification using azure-ad-verify-token
    // or @azure/identity in production
    const decoded = validateToken(token);

    // Attach user info to request for downstream use
    (req as any).user = {
      sub: decoded.sub,
      roles: decoded.roles || [],
      studyId: decoded.studyId,
    };

    logger.info('Authenticated request', {
      path: req.path,
      roles: decoded.roles,
    });

    next();
  } catch (error) {
    logger.warn('Token validation failed', {
      path: req.path,
      error: (error as Error).message,
    });
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }
}

/**
 * Role-based access control middleware.
 * Use after authMiddleware to restrict routes to specific roles.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const hasRole = roles.some((role) => user.roles.includes(role));
    if (!hasRole) {
      logger.warn('Insufficient permissions', {
        path: req.path,
        requiredRoles: roles,
        userRoles: user.roles,
      });
      res.status(403).json({
        error: 'Forbidden',
        message: `Requires one of: ${roles.join(', ')}`,
      });
      return;
    }

    next();
  };
}

interface DecodedToken {
  sub: string;
  roles: string[];
  studyId?: string;
  exp: number;
  iss: string;
}

function validateToken(token: string): DecodedToken {
  // Stub: In production, verify JWT signature and claims
  // using a library like jose or azure-ad-verify-token
  if (!token || token.length < 10) {
    throw new Error('Token too short');
  }

  // Demo placeholder - returns a mock decoded token
  return {
    sub: 'demo-user-001',
    roles: ['researcher'],
    studyId: 'study-ears-001',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iss: 'https://login.microsoftonline.com/demo-tenant/v2.0',
  };
}
