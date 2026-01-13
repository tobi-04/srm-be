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
}
