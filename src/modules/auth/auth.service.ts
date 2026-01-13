import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../user/user.repository';
import { User, UserDocument } from '../user/entities/user.entity';
import { UserDeviceLogin, UserDeviceLoginDocument } from './entities/user-device-login.entity';
import { RegisterDto, LoginDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { JwtPayload } from './strategies/jwt-access.strategy';
import { RefreshPayload } from './strategies/jwt-refresh.strategy';

@Injectable()
export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private jwtService: JwtService,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(UserDeviceLogin.name)
    private userDeviceLoginModel: Model<UserDeviceLoginDocument>,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.userRepository.findOne({ email: registerDto.email });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = await this.userRepository.create({
      email: registerDto.email,
      name: registerDto.name,
      password: hashedPassword,
      role: registerDto.role,
    });

    return {
      message: 'User registered successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findOne({ email: loginDto.email });

    if (!user || !user.is_active || user.is_deleted) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Use provided device_id or generate a default one
    const deviceId = loginDto.device_id || 'default-device';
    const tokens = await this.generateTokens(user, deviceId);

    // Handle device login if device info is provided
    if (loginDto.device_id) {
      await this.updateDeviceLogin(
        user._id.toString(),
        loginDto.device_id,
        loginDto.device_name || 'Unknown Device',
        loginDto.device_type || 'web',
        loginDto.device_token || '',
        tokens.refreshToken,
      );
    }

    return {
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      ...tokens,
    };
  }

  async refreshToken(userId: string, deviceId: string) {
    const user = await this.userRepository.findById(userId);

    if (!user || !user.is_active || user.is_deleted) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const tokens = await this.generateTokens(user, deviceId);

    // Update refresh token in device login
    await this.userDeviceLoginModel.updateOne(
      { user_id: userId, device_id: deviceId },
      { refresh_token: tokens.refreshToken, last_login_at: new Date() },
    );

    return {
      message: 'Token refreshed successfully',
      ...tokens,
    };
  }

  async logout(userId: string, deviceId?: string) {
    if (deviceId) {
      // Permanently delete the specific device login record
      await this.userDeviceLoginModel.deleteOne({
        user_id: userId,
        device_id: deviceId,
      });
    } else {
      // Permanently delete all device login records for this user
      await this.userDeviceLoginModel.deleteMany({
        user_id: userId,
      });
    }

    return {
      message: 'Logout successful',
    };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(changePasswordDto.old_password, user.password);

    if (!isPasswordValid) {
      throw new BadRequestException('Old password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(changePasswordDto.new_password, 10);

    await this.userModel.updateOne(
      { _id: userId },
      { password: hashedPassword, updated_at: new Date() },
    );

    // Invalidate all refresh tokens
    await this.userDeviceLoginModel.updateMany(
      { user_id: userId },
      { refresh_token: null },
    );

    return {
      message: 'Password changed successfully',
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.userRepository.findOne({ email: forgotPasswordDto.email });

    if (!user) {
      // For security, don't reveal if email exists
      return {
        message: 'If the email exists, a reset link has been sent',
      };
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = this.jwtService.sign(
      { sub: user._id.toString(), email: user.email },
      {
        secret: process.env.JWT_RESET_SECRET || 'reset-secret-key-change-in-production',
        expiresIn: '1h',
      },
    );

    // TODO: Send email with reset token
    // For now, return the token (in production, this should be sent via email)
    console.log('Reset token:', resetToken);

    return {
      message: 'If the email exists, a reset link has been sent',
      // Remove this in production
      resetToken: resetToken,
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    try {
      const payload = this.jwtService.verify(resetPasswordDto.token, {
        secret: process.env.JWT_RESET_SECRET || 'reset-secret-key-change-in-production',
      });

      const user = await this.userRepository.findById(payload.sub);

      if (!user) {
        throw new BadRequestException('Invalid reset token');
      }

      const hashedPassword = await bcrypt.hash(resetPasswordDto.new_password, 10);

      await this.userModel.updateOne(
        { _id: user._id },
        { password: hashedPassword, updated_at: new Date() },
      );

      // Invalidate all refresh tokens
      await this.userDeviceLoginModel.updateMany(
        { user_id: user._id },
        { refresh_token: null },
      );

      return {
        message: 'Password reset successfully',
      };
    } catch (error) {
      throw new BadRequestException('Invalid or expired reset token');
    }
  }

  private async generateTokens(user: any, deviceId: string) {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET || 'access-secret-key-change-in-production',
      expiresIn: '15m',
    });

    const refreshPayload: RefreshPayload = {
      sub: user._id.toString(),
      device_id: deviceId,
    };

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key-change-in-production',
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private async updateDeviceLogin(
    userId: string,
    deviceId: string,
    deviceName: string,
    deviceType: string,
    deviceToken: string,
    refreshToken: string,
  ) {
    await this.userDeviceLoginModel.updateOne(
      { user_id: userId, device_id: deviceId },
      {
        user_id: userId,
        device_id: deviceId,
        device_name: deviceName,
        device_type: deviceType,
        device_token: deviceToken,
        refresh_token: refreshToken,
        last_login_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      },
      { upsert: true },
    );
  }
}
