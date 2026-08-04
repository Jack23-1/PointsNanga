import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AcademicService } from "./academic.service";
import {
  AssignStudentDto,
  CreateClassDto,
  CreateCourseDto,
  CreateCourseAssignmentDto,
  CreateHomeroomAssignmentDto,
  CreateOptionDto,
  CreateSchoolYearDto,
  CreateStudentDto,
  CreateTeacherDto,
  DeleteStudentDto,
  SaveHomeroomGradesDto,
  UpdateClassDto,
  UpdateCourseDto,
  UpdateOptionDto,
  UpdateSchoolYearDto,
  UpdateStudentDto,
  UpdateTeacherDto,
  ToggleSchoolPeriodDto,
  ReviewDeletionRequestDto,
  ResetHomeroomPasswordDto,
  ReplaceCourseTeacherDto,
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

  @Get("dashboard/homeroom")
  @Roles("teacher")
  homeroomDashboard(@Req() request: { user?: { sub?: string | number } }) {
    if (!request.user?.sub) {
      throw new ForbiddenException("Session titulaire invalide.");
    }
    return this.academicService.getHomeroomDashboard(String(request.user.sub));
  }

  @Get("grades/homeroom")
  @Roles("teacher")
  homeroomGradebook(
    @Req() request: { user?: { sub?: string | number } },
    @Query("periodId") periodId?: string,
  ) {
    if (!request.user?.sub) throw new ForbiddenException("Session titulaire invalide.");
    return this.academicService.getHomeroomGradebook(
      String(request.user.sub),
      periodId,
    );
  }

  @Patch("grades/homeroom")
  @Roles("teacher")
  saveHomeroomGrades(
    @Req() request: { user?: { sub?: string | number } },
    @Body() dto: SaveHomeroomGradesDto,
  ) {
    if (!request.user?.sub) throw new ForbiddenException("Session titulaire invalide.");
    return this.academicService.saveHomeroomGrades(String(request.user.sub), dto);
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
  updateClass(
    @Req() request: { user?: { schoolId?: string | number } },
    @Param("id") id: string,
    @Body() dto: UpdateClassDto,
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.updateClass(id, dto, String(request.user.schoolId));
  }

  @Delete("classes/:id")
  deleteClass(
    @Req() request: { user?: { sub?: string | number; schoolId?: string | number } },
    @Param("id") id: string,
  ) {
    if (!request.user?.schoolId || !request.user.sub) {
      throw new ForbiddenException("Session directeur invalide.");
    }
    return this.academicService.deleteClass(
      id,
      String(request.user.schoolId),
      String(request.user.sub),
    );
  }

  @Get("teachers")
  listTeachers(
    @Req() request: { user?: { role?: string; schoolId?: string | number } },
    @Query("schoolId") schoolId?: string,
  ) {
    return this.academicService.listTeachers(request.user?.role === "director" ? String(request.user.schoolId) : schoolId);
  }

  @Post("teachers")
  createTeacher(
    @Req() request: { user?: { role?: string; schoolId?: string | number } },
    @Body() dto: CreateTeacherDto,
  ) {
    const schoolId = request.user?.role === "director" ? request.user.schoolId : dto.schoolId;
    if (!schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.createTeacher(dto, String(schoolId));
  }

  @Patch("teachers/:id")
  updateTeacher(@Param("id") id: string, @Body() dto: UpdateTeacherDto) {
    return this.academicService.updateTeacher(id, dto);
  }

  @Delete("teachers/:id")
  deleteTeacher(
    @Req() request: { user?: { schoolId?: string | number } },
    @Param("id") id: string,
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.deleteTeacher(id, String(request.user.schoolId));
  }

  @Get("courses")
  listCourses(
    @Req() request: { user?: { role?: string; schoolId?: string | number } },
    @Query("schoolId") schoolId?: string,
  ) {
    return this.academicService.listCourses(request.user?.role === "director" ? String(request.user.schoolId) : schoolId);
  }

  @Post("courses")
  createCourse(
    @Req() request: { user?: { role?: string; schoolId?: string | number } },
    @Body() dto: CreateCourseDto,
  ) {
    const schoolId = request.user?.role === "director" ? request.user.schoolId : dto.schoolId;
    if (!schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.createCourse(dto, String(schoolId));
  }

  @Patch("courses/:id")
  updateCourse(
    @Req() request: { user?: { schoolId?: string | number } },
    @Param("id") id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.updateCourse(id, dto, String(request.user.schoolId));
  }

  @Delete("courses/:id")
  deleteCourse(
    @Req() request: { user?: { schoolId?: string | number } },
    @Param("id") id: string,
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.deleteCourse(id, String(request.user.schoolId));
  }

  @Get("course-assignments")
  listCourseAssignments(
    @Req() request: { user?: { schoolId?: string | number } },
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.listCourseAssignments(String(request.user.schoolId));
  }

  @Post("course-assignments")
  createCourseAssignment(
    @Req() request: { user?: { schoolId?: string | number } },
    @Body() dto: CreateCourseAssignmentDto,
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.createCourseAssignment(dto, String(request.user.schoolId));
  }

  @Get("course-assignments/history")
  courseAssignmentHistory(
    @Req() request: { user?: { schoolId?: string | number } },
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.listCourseAssignmentHistory(String(request.user.schoolId));
  }

  @Post("course-assignments/:id/replace")
  replaceCourseTeacher(
    @Req() request: { user?: { schoolId?: string | number } },
    @Param("id") id: string,
    @Body() dto: ReplaceCourseTeacherDto,
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.replaceCourseTeacher(id, dto, String(request.user.schoolId));
  }

  @Patch("course-assignments/:id")
  updateCourseAssignment(
    @Req() request: { user?: { schoolId?: string | number } },
    @Param("id") id: string,
    @Body() dto: CreateCourseAssignmentDto,
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.updateCourseAssignment(id, dto, String(request.user.schoolId));
  }

  @Get("homeroom-assignments")
  listHomeroomAssignments(
    @Req() request: { user?: { schoolId?: string | number } },
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.listHomeroomAssignments(String(request.user.schoolId));
  }

  @Post("homeroom-assignments")
  createHomeroomAssignment(
    @Req() request: { user?: { schoolId?: string | number } },
    @Body() dto: CreateHomeroomAssignmentDto,
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.createHomeroomAssignment(dto, String(request.user.schoolId));
  }

  @Patch("homeroom-assignments/:id")
  updateHomeroomAssignment(
    @Req() request: { user?: { schoolId?: string | number } },
    @Param("id") id: string,
    @Body() dto: CreateHomeroomAssignmentDto,
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.updateHomeroomAssignment(id, dto, String(request.user.schoolId));
  }

  @Post("homeroom-assignments/:id/reset-password")
  resetHomeroomPassword(
    @Req() request: { user?: { schoolId?: string | number } },
    @Param("id") id: string,
    @Body() dto: ResetHomeroomPasswordDto,
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.resetHomeroomPassword(id, String(request.user.schoolId), dto.password);
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

  @Get("school-years")
  listSchoolYears(
    @Req() request: { user?: { role?: string; schoolId?: string | number } },
    @Query("schoolId") schoolId?: string,
  ) {
    const resolvedSchoolId =
      request.user?.role === "director" ? request.user.schoolId : schoolId;
    if (!resolvedSchoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.listSchoolYears(String(resolvedSchoolId));
  }

  @Post("school-years")
  createSchoolYear(
    @Req() request: { user?: { role?: string; schoolId?: string | number } },
    @Body() dto: CreateSchoolYearDto,
  ) {
    const resolvedSchoolId =
      request.user?.role === "director" ? request.user.schoolId : dto.schoolId;
    if (!resolvedSchoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.createSchoolYear(dto, String(resolvedSchoolId));
  }

  @Patch("school-years/:id/activate")
  activateSchoolYear(
    @Req() request: { user?: { schoolId?: string | number } },
    @Param("id") id: string,
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.activateSchoolYear(id, String(request.user.schoolId));
  }

  @Patch("school-years/:id/close")
  closeSchoolYear(
    @Req() request: { user?: { schoolId?: string | number } },
    @Param("id") id: string,
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.closeSchoolYear(id, String(request.user.schoolId));
  }

  @Patch("school-years/:id")
  updateSchoolYear(
    @Req() request: { user?: { schoolId?: string | number } },
    @Param("id") id: string,
    @Body() dto: UpdateSchoolYearDto,
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.updateSchoolYear(id, String(request.user.schoolId), dto);
  }

  @Patch("school-years/:yearId/periods/:periodId")
  toggleSchoolPeriod(
    @Req() request: { user?: { schoolId?: string | number } },
    @Param("yearId") yearId: string,
    @Param("periodId") periodId: string,
    @Body() dto: ToggleSchoolPeriodDto,
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.toggleSchoolPeriod(
      yearId,
      periodId,
      String(request.user.schoolId),
      dto.isOpen,
    );
  }

  @Delete("school-years/:id")
  deleteSchoolYear(
    @Req() request: { user?: { sub?: string | number; schoolId?: string | number } },
    @Param("id") id: string,
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    if (!request.user.sub) throw new ForbiddenException("Session directeur invalide.");
    return this.academicService.deleteSchoolYear(
      id,
      String(request.user.schoolId),
      String(request.user.sub),
    );
  }

  @Get("deletion-requests")
  @Roles("super_admin")
  listDeletionRequests() {
    return this.academicService.listDeletionRequests();
  }

  @Patch("deletion-requests/:id/approve")
  @Roles("super_admin")
  approveDeletionRequest(
    @Req() request: { user?: { sub?: string | number } },
    @Param("id") id: string,
    @Body() dto: ReviewDeletionRequestDto,
  ) {
    if (!request.user?.sub) throw new ForbiddenException("Session invalide.");
    return this.academicService.reviewDeletionRequest(id, String(request.user.sub), true, dto.comment);
  }

  @Patch("deletion-requests/:id/reject")
  @Roles("super_admin")
  rejectDeletionRequest(
    @Req() request: { user?: { sub?: string | number } },
    @Param("id") id: string,
    @Body() dto: ReviewDeletionRequestDto,
  ) {
    if (!request.user?.sub) throw new ForbiddenException("Session invalide.");
    return this.academicService.reviewDeletionRequest(id, String(request.user.sub), false, dto.comment);
  }

  @Post("enrollments")
  assignStudent(@Body() dto: AssignStudentDto) {
    return this.academicService.assignStudent(dto);
  }
}
