import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserDeviceLogin, UserDeviceLoginDocument } from '../entities/user-device-login.entity';

export interface RefreshPayload {
  sub: string;
  device_id: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    @InjectModel(UserDeviceLogin.name)
    private userDeviceLoginModel: Model<UserDeviceLoginDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refresh_token'),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key-change-in-production',
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: RefreshPayload) {
    const refreshToken = req.body.refresh_token;

    const deviceLogin = await this.userDeviceLoginModel.findOne({
      user_id: payload.sub,
      device_id: payload.device_id,
      refresh_token: refreshToken,
      is_deleted: false,
    });

    if (!deviceLogin) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return {
      userId: payload.sub,
      deviceId: payload.device_id,
    };
  }
}
