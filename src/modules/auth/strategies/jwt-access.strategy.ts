import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { UserRepository } from "../../user/user.repository";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  must_change_password: boolean;
}

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(
  Strategy,
  "jwt-access"
) {
  constructor(private userRepository: UserRepository) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        process.env.JWT_ACCESS_SECRET ||
        "access-secret-key-change-in-production",
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userRepository.findById(payload.sub);

    if (!user || user.is_deleted) {
      throw new UnauthorizedException("User not found");
    }

    // Check if account is locked - return specific error code
    if (!user.is_active) {
      throw new ForbiddenException({
        statusCode: 403,
        error: "ACCOUNT_LOCKED",
        message:
          "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin để được hỗ trợ.",
      });
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      must_change_password: payload.must_change_password,
    };
  }
}
