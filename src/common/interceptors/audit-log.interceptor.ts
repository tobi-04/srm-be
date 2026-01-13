import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { Reflector } from '@nestjs/core';

/**
 * Decorator to mark methods/controllers for audit logging
 * @param entity - The entity name (e.g., 'User', 'Product')
 */
export const AuditLog = (entity: string) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata('audit:entity', entity, descriptor.value);
    } else {
      Reflect.defineMetadata('audit:entity', entity, target);
    }
  };
};

/**
 * Interceptor that automatically logs CRUD operations
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Get entity name from decorator
    const entity =
      this.reflector.get<string>('audit:entity', handler) ||
      this.reflector.get<string>('audit:entity', controller);

    if (!entity) {
      return next.handle();
    }

    // Determine action from HTTP method and route
    const method = request.method;
    const action = this.getActionFromMethod(method);

    // Get request metadata
    const ip_address = this.getClientIp(request);
    const user_agent = request.headers['user-agent'];
    const userId = request.user?.id || request.user?._id;
    const timestamp = new Date();

    // Log to terminal BEFORE processing the request
    this.logToTerminal({
      timestamp,
      method,
      path: request.url,
      action,
      entity,
      userId,
      ip_address,
      user_agent,
    });

    return next.handle().pipe(
      tap(async (response) => {
        try {
          // Extract entity ID from response or request
          const entityId = response?._id || response?.id || request.params?.id;

          // Log the action
          await this.auditLogService.log(
            action,
            entity,
            entityId,
            userId,
            undefined, // old_data - could be populated in a more advanced implementation
            method === 'POST' || method === 'PUT' || method === 'PATCH'
              ? request.body
              : undefined,
            {
              ip_address,
              user_agent,
              path: request.url,
              method: request.method,
            },
          );
        } catch (error) {
          // Log error but don't break the request
          console.error('Audit log error:', error);
        }
      }),
    );
  }

  private getActionFromMethod(method: string): string {
    const actionMap: Record<string, string> = {
      POST: 'CREATE',
      GET: 'READ',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
    };
    return actionMap[method] || 'UNKNOWN';
  }

  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }

  private logToTerminal(data: {
    timestamp: Date;
    method: string;
    path: string;
    action: string;
    entity: string;
    userId?: any;
    ip_address: string;
    user_agent: string;
  }): void {
    const { timestamp, method, path, action, entity, userId, ip_address, user_agent } = data;

    // Format timestamp
    const formattedTime = timestamp.toISOString();

    // Extract device info from user agent
    const deviceInfo = this.parseUserAgent(user_agent);

    // Format user info
    const userInfo = userId ? `User: ${userId}` : 'User: Guest/Unauthenticated';

    // Build log message with color codes for better readability
    const logMessage = [
      '\x1b[36m========================================\x1b[0m',
      `\x1b[33m⏰ Time:\x1b[0m ${formattedTime}`,
      `\x1b[32m👤 ${userInfo}\x1b[0m`,
      `\x1b[35m🌐 IP Address:\x1b[0m ${ip_address}`,
      `\x1b[34m📱 Device:\x1b[0m ${deviceInfo}`,
      `\x1b[36m📍 Endpoint:\x1b[0m ${method} ${path}`,
      `\x1b[31m🎯 Action:\x1b[0m ${action} on ${entity}`,
      '\x1b[36m========================================\x1b[0m',
    ].join('\n');

    console.log('\n' + logMessage + '\n');
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

    // Detect OS
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac OS')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

    return `${browser} on ${os}`;
  }
}
