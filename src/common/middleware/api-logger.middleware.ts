import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ApiLoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const timestamp = new Date();
    const { method, originalUrl, ip, headers } = req;
    const userAgent = headers['user-agent'] || 'Unknown';

    // Extract IP address (considering proxies)
    const clientIp = this.getClientIp(req);

    // Parse user agent for device info
    const deviceInfo = this.parseUserAgent(userAgent);

    // Get user info if available (from auth middleware)
    const userId = (req as any).user?.id || (req as any).user?._id;
    const userInfo = userId ? `User ID: ${userId}` : 'Guest/Unauthenticated';

    // Format timestamp
    const formattedTime = timestamp.toISOString();

    // Build colored log message
    const logMessage = [
      '\x1b[36m========================================\x1b[0m',
      `\x1b[33m⏰ Time:\x1b[0m ${formattedTime}`,
      `\x1b[32m👤 Caller:\x1b[0m ${userInfo}`,
      `\x1b[35m🌐 IP Address:\x1b[0m ${clientIp}`,
      `\x1b[34m📱 Device:\x1b[0m ${deviceInfo}`,
      `\x1b[36m📍 Request:\x1b[0m ${method} ${originalUrl}`,
      '\x1b[36m========================================\x1b[0m',
    ].join('\n');

    console.log('\n' + logMessage + '\n');

    next();
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];

    return (
      forwardedIp ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  private parseUserAgent(userAgent: string): string {
    if (!userAgent) return 'Unknown Device';

    // Simple user agent parsing for common patterns
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';

    // Detect browser
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    else if (userAgent.includes('Opera')) browser = 'Opera';
    else if (userAgent.includes('Postman')) browser = 'Postman';
    else if (userAgent.includes('curl')) browser = 'cURL';
    else if (userAgent.includes('insomnia')) browser = 'Insomnia';

    // Detect OS
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac OS')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

    return `${browser} on ${os}`;
  }
}
