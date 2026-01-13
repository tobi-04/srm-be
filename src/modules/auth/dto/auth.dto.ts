import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../user/entities/user.entity';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Password123!', minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: UserRole, default: UserRole.USER, required: false })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'device-uuid-12345', required: false })
  @IsString()
  @IsOptional()
  device_id?: string;

  @ApiProperty({ example: 'iPhone 13 Pro', required: false })
  @IsString()
  @IsOptional()
  device_name?: string;

  @ApiProperty({ example: 'mobile', required: false })
  @IsString()
  @IsOptional()
  device_type?: string;

  @ApiProperty({ example: 'fcm-token-xyz', required: false })
  @IsString()
  @IsOptional()
  device_token?: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPassword123!' })
  @IsString()
  @IsNotEmpty()
  old_password: string;

  @ApiProperty({ example: 'NewPassword123!', minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  new_password: string;
}

export class RefreshTokenDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'reset-token-123' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'NewPassword123!', minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  new_password: string;
}
