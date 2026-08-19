import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class LoginDto {
  @IsIn(["super_admin", "director", "teacher", "student"])
  role: "super_admin" | "director" | "teacher" | "student";

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9-]{3,50}$/)
  matricule?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  schoolName?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(72)
  password: string;
}

export class ResolveSchoolDto {
  @IsIn(["director", "teacher"])
  role: "director" | "teacher";

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9-]{3,100}$/)
  identifier: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  @MaxLength(254)
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-fA-F0-9]{64}$/)
  token: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}
