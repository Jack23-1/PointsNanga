import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

export class CreateSuperAdminDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
