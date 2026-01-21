import { IsString, IsOptional, IsEmail, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatar?: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(6)
  current_password: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  new_password: string;
}
