import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AcademicService } from "./academic.service";
import {
  AssignStudentDto,
  CreateClassDto,
  CreateCourseDto,
  CreateLevelDto,
  CreateOptionDto,
  CreateSchoolYearDto,
  CreateStudentDto,
  CreateTeacherDto,
  UpdateClassDto,
  UpdateCourseDto,
  UpdateLevelDto,
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

  @Get("levels")
  listLevels(@Query("schoolId") schoolId?: string) {
    return this.academicService.listLevels(schoolId);
  }

  @Post("levels")
  createLevel(@Body() dto: CreateLevelDto) {
    return this.academicService.createLevel(dto);
  }

  @Patch("levels/:id")
  updateLevel(@Param("id") id: string, @Body() dto: UpdateLevelDto) {
    return this.academicService.updateLevel(id, dto);
  }

  @Delete("levels/:id")
  deleteLevel(@Param("id") id: string) {
    return this.academicService.deleteLevel(id);
  }

  @Get("options")
  listOptions(@Query("schoolId") schoolId?: string) {
    return this.academicService.listOptions(schoolId);
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
  listClasses(@Query("schoolId") schoolId?: string) {
    return this.academicService.listClasses(schoolId);
  }

  @Post("classes")
  createClass(@Body() dto: CreateClassDto) {
    return this.academicService.createClass(dto);
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
  listStudents(@Query("schoolId") schoolId?: string) {
    return this.academicService.listStudents(schoolId);
  }

  @Post("students")
  createStudent(@Body() dto: CreateStudentDto) {
    return this.academicService.createStudent(dto);
  }

  @Patch("students/:id")
  updateStudent(@Param("id") id: string, @Body() dto: UpdateStudentDto) {
    return this.academicService.updateStudent(id, dto);
  }

  @Delete("students/:id")
  deleteStudent(@Param("id") id: string) {
    return this.academicService.deleteStudent(id);
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
