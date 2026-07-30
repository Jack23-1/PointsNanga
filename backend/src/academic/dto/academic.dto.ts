import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateSchoolDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  establishmentCode?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSchoolDto extends CreateSchoolDto {}

export class CreateOptionDto {
  @IsInt()
  @Min(1)
  schoolId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateOptionDto extends CreateOptionDto {}

export class CreateClassDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  schoolId?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  label: string;

}

export class UpdateClassDto extends CreateClassDto {}

export class CreateTeacherDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  schoolId?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsIn(["Fille", "Garçon", "F", "M"])
  gender: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000000)
  photo?: string;
}

export class UpdateTeacherDto extends CreateTeacherDto {}

export class CreateCourseDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  schoolId?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  label: string;

}

export class UpdateCourseDto extends CreateCourseDto {}

export class CreateStudentDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  schoolId?: number;

  @IsInt()
  @Min(1)
  classId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  postName?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsOptional()
  @IsIn(["Fille", "Garçon", "F", "M"])
  gender?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  birthPlace?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  guardianName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  guardianPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000000)
  photo?: string;
}

export class UpdateStudentDto extends CreateStudentDto {}

export class DeleteStudentDto {
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class CreateCourseAssignmentDto {
  @IsInt()
  @Min(1)
  classId: number;

  @IsInt()
  @Min(1)
  courseId: number;

  @IsInt()
  @Min(1)
  teacherId: number;

  @IsNumber()
  @Min(0.01)
  weight: number;
}

export class CreateSchoolYearDto {
  @IsInt()
  @Min(1)
  schoolId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  label: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AssignStudentDto {
  @IsInt()
  @Min(1)
  studentId: number;

  @IsInt()
  @Min(1)
  classId: number;

  @IsInt()
  @Min(1)
  schoolYearId: number;

  @IsOptional()
  @IsNumber()
  orderNumber?: number;
}
