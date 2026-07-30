import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AcademicService } from "./academic.service";
import {
  AssignStudentDto,
  CreateClassDto,
  CreateCourseDto,
  CreateOptionDto,
  CreateSchoolYearDto,
  CreateStudentDto,
  CreateTeacherDto,
  DeleteStudentDto,
  UpdateClassDto,
  UpdateCourseDto,
  UpdateOptionDto,
  UpdateStudentDto,
  UpdateTeacherDto,
} from "./dto/academic.dto";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("director", "super_admin")
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  @Get("dashboard/director")
  @Roles("director")
  directorDashboard(
    @Req() request: { user?: { schoolId?: string | number } },
  ) {
    const schoolId = request.user?.schoolId;
    if (!schoolId) {
      throw new ForbiddenException(
        "Aucune école n'est associée à cette session.",
      );
    }

    return this.academicService.getDirectorDashboard(String(schoolId));
  }

  @Get("options")
  listOptions(
    @Req() request: { user?: { role?: string; schoolId?: string | number } },
    @Query("schoolId") schoolId?: string,
  ) {
    return this.academicService.listOptions(
      request.user?.role === "director"
        ? String(request.user.schoolId)
        : schoolId,
    );
  }

  @Post("options")
  createOption(@Body() dto: CreateOptionDto) {
    return this.academicService.createOption(dto);
  }

  @Patch("options/:id")
  updateOption(@Param("id") id: string, @Body() dto: UpdateOptionDto) {
    return this.academicService.updateOption(id, dto);
  }

  @Delete("options/:id")
  deleteOption(@Param("id") id: string) {
    return this.academicService.deleteOption(id);
  }

  @Get("classes")
  listClasses(
    @Req() request: { user?: { role?: string; schoolId?: string | number } },
    @Query("schoolId") schoolId?: string,
  ) {
    return this.academicService.listClasses(
      request.user?.role === "director"
        ? String(request.user.schoolId)
        : schoolId,
    );
  }

  @Post("classes")
  createClass(
    @Req() request: { user?: { role?: string; schoolId?: string | number } },
    @Body() dto: CreateClassDto,
  ) {
    const schoolId =
      request.user?.role === "director"
        ? request.user.schoolId
        : dto.schoolId;
    if (!schoolId) {
      throw new ForbiddenException("École obligatoire.");
    }
    return this.academicService.createClass(dto, String(schoolId));
  }

  @Patch("classes/:id")
  updateClass(@Param("id") id: string, @Body() dto: UpdateClassDto) {
    return this.academicService.updateClass(id, dto);
  }

  @Delete("classes/:id")
  deleteClass(@Param("id") id: string) {
    return this.academicService.deleteClass(id);
  }

  @Get("teachers")
  listTeachers(@Query("schoolId") schoolId?: string) {
    return this.academicService.listTeachers(schoolId);
  }

  @Post("teachers")
  createTeacher(@Body() dto: CreateTeacherDto) {
    return this.academicService.createTeacher(dto);
  }

  @Patch("teachers/:id")
  updateTeacher(@Param("id") id: string, @Body() dto: UpdateTeacherDto) {
    return this.academicService.updateTeacher(id, dto);
  }

  @Delete("teachers/:id")
  deleteTeacher(@Param("id") id: string) {
    return this.academicService.deleteTeacher(id);
  }

  @Get("courses")
  listCourses(@Query("schoolId") schoolId?: string) {
    return this.academicService.listCourses(schoolId);
  }

  @Post("courses")
  createCourse(@Body() dto: CreateCourseDto) {
    return this.academicService.createCourse(dto);
  }

  @Patch("courses/:id")
  updateCourse(@Param("id") id: string, @Body() dto: UpdateCourseDto) {
    return this.academicService.updateCourse(id, dto);
  }

  @Delete("courses/:id")
  deleteCourse(@Param("id") id: string) {
    return this.academicService.deleteCourse(id);
  }

  @Get("students")
  listStudents(
    @Req() request: { user?: { role?: string; schoolId?: string | number } },
    @Query("schoolId") schoolId?: string,
  ) {
    return this.academicService.listStudents(
      request.user?.role === "director"
        ? String(request.user.schoolId)
        : schoolId,
    );
  }

  @Post("students")
  createStudent(
    @Req() request: { user?: { role?: string; schoolId?: string | number } },
    @Body() dto: CreateStudentDto,
  ) {
    const schoolId =
      request.user?.role === "director"
        ? request.user.schoolId
        : dto.schoolId;
    if (!schoolId) {
      throw new ForbiddenException("École obligatoire.");
    }
    return this.academicService.createStudent(dto, String(schoolId));
  }

  @Patch("students/:id")
  updateStudent(
    @Req() request: { user?: { role?: string; schoolId?: string | number } },
    @Param("id") id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    const schoolId =
      request.user?.role === "director"
        ? request.user.schoolId
        : dto.schoolId;
    if (!schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.updateStudent(id, dto, String(schoolId));
  }

  @Delete("students/:id")
  deleteStudent(
    @Req() request: { user?: { sub?: string; role?: string; schoolId?: string | number } },
    @Param("id") id: string,
    @Query("schoolId") schoolId?: string,
    @Body() dto?: DeleteStudentDto,
  ) {
    const resolvedSchoolId =
      request.user?.role === "director"
        ? request.user.schoolId
        : schoolId;
    if (!resolvedSchoolId) throw new ForbiddenException("École obligatoire.");
    if (request.user?.role === "director" && (!request.user.sub || !dto?.password)) {
      throw new ForbiddenException("Mot de passe obligatoire.");
    }
    return this.academicService.deleteStudent(
      id,
      String(resolvedSchoolId),
      request.user?.role === "director"
        ? { directorId: request.user.sub!, password: dto!.password }
        : undefined,
    );
  }

  @Post("school-years")
  createSchoolYear(@Body() dto: CreateSchoolYearDto) {
    return this.academicService.createSchoolYear(dto);
  }

  @Post("enrollments")
  assignStudent(@Body() dto: AssignStudentDto) {
    return this.academicService.assignStudent(dto);
  }
}
