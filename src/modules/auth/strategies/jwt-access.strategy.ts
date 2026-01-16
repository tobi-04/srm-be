import { Injectable, UnauthorizedException } from "@nestjs/common";
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

    if (!user || !user.is_active || user.is_deleted) {
      throw new UnauthorizedException("User not found or inactive");
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      must_change_password: payload.must_change_password,
    };
  }
}
