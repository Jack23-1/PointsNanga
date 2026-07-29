import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class LoginDto {
  @IsIn(["super_admin", "director", "teacher", "student"])
  role: "super_admin" | "director" | "teacher" | "student";

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  matricule?: string;

  @IsOptional()
  @IsString()
  schoolName?: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}
