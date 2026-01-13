import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt-access') {
  // Override handleRequest to make authentication optional
  handleRequest(err: any, user: any) {
    // If there's no user, just return null instead of throwing an error
    // This allows the request to proceed without authentication
    return user || null;
  }

  // Override canActivate to always return true
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // Try to authenticate, but don't fail if it doesn't work
      await super.canActivate(context);
    } catch (err) {
      // Ignore authentication errors
    }
    return true;
  }
}
