import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, Req, Sse, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AcademicService } from "./academic.service";
import {
  AssignStudentDto,
  BulkCreateClassesDto,
  BulkCreateCoursesDto,
  BulkCreateTeachersDto,
  CreateClassDto,
  CreateCourseDto,
  CreateCourseAssignmentDto,
  CopyCourseAssignmentsDto,
  CreateHomeroomAssignmentDto,
  CreateOptionDto,
  CreateSchoolYearDto,
  CreateStudentDto,
  BulkToggleResultVisibilityDto,
  ImportStudentsDto,
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
  ToggleResultVisibilityDto,
  ReviewDeletionRequestDto,
  ResetHomeroomPasswordDto,
  ResetTeacherPasswordDto,
  ReplaceCourseTeacherDto,
  ReenrollStudentsDto,
  RejectGradeSubmissionDto,
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
  homeroomDashboard(@Req() request: { user?: { titularId?: string | number } }) {
    if (!request.user?.titularId) {
      throw new ForbiddenException("Session titulaire invalide.");
    }
    return this.academicService.getHomeroomDashboard(String(request.user.titularId));
  }

  @Get("grades/homeroom")
  @Roles("teacher")
  homeroomGradebook(
    @Req() request: { user?: { titularId?: string | number } },
    @Query("periodId") periodId?: string,
  ) {
    if (!request.user?.titularId) throw new ForbiddenException("Session titulaire invalide.");
    return this.academicService.getHomeroomGradebook(
      String(request.user.titularId),
      periodId,
    );
  }

  @Get("grades/teacher/assignments")
  @Roles("teacher")
  teacherGradeAssignments(
    @Req() request: { user?: { sub?: string | number } },
  ) {
    if (!request.user?.sub) throw new ForbiddenException("Session professeur invalide.");
    return this.academicService.getTeacherGradeAssignments(String(request.user.sub));
  }

  @Get("grades/teacher")
  @Roles("teacher")
  teacherGradebook(
    @Req() request: { user?: { sub?: string | number } },
    @Query("assignmentId") assignmentId?: string,
    @Query("periodId") periodId?: string,
  ) {
    if (!request.user?.sub) throw new ForbiddenException("Session professeur invalide.");
    return this.academicService.getTeacherGradebook(
      String(request.user.sub),
      assignmentId ?? "",
      periodId,
    );
  }

  @Patch("grades/teacher")
  @Roles("teacher")
  saveTeacherGrades(
    @Req() request: { user?: { sub?: string | number } },
    @Body() dto: SaveHomeroomGradesDto & { assignmentId?: string | number },
  ) {
    if (!request.user?.sub) throw new ForbiddenException("Session professeur invalide.");
    return this.academicService.saveTeacherGrades(
      String(request.user.sub),
      String(dto.assignmentId ?? ""),
      dto,
    );
  }

  @Patch("grades/teacher/acknowledge-titular-change")
  @Roles("teacher")
  acknowledgeTitularChange(
    @Req() request: { user?: { sub?: string | number } },
    @Body() dto: { assignmentId?: string | number; periodId?: string | number },
  ) {
    if (!request.user?.sub) throw new ForbiddenException("Session professeur invalide.");
    return this.academicService.acknowledgeTitularChange(
      String(request.user.sub),
      String(dto.assignmentId ?? ""),
      String(dto.periodId ?? ""),
    );
  }

  @Post("grades/teacher/submit")
  @Roles("teacher")
  submitTeacherGrades(
    @Req() request: { user?: { sub?: string | number } },
    @Body() dto: { assignmentId?: string | number; periodId?: string | number },
  ) {
    if (!request.user?.sub) throw new ForbiddenException("Session professeur invalide.");
    return this.academicService.submitTeacherGrades(
      String(request.user.sub),
      String(dto.assignmentId ?? ""),
      String(dto.periodId ?? ""),
    );
  }

  @Post("grades/homeroom/teacher-revisions/:assignmentId/periods/:periodId/accept")
  @Roles("teacher")
  acceptTeacherGradeRevision(
    @Req() request: { user?: { titularId?: string | number } },
    @Param("assignmentId") assignmentId: string,
    @Param("periodId") periodId: string,
  ) {
    if (!request.user?.titularId) throw new ForbiddenException("Session titulaire invalide.");
    return this.academicService.acceptTeacherGradeRevision(String(request.user.titularId), assignmentId, periodId);
  }

  @Get("grades/admin/summary")
  @Roles("super_admin")
  adminGradeSummary() {
    return this.academicService.getAdminGradeSummary();
  }

  @Get("grades/admin/students")
  @Roles("super_admin")
  adminGradeStudents() {
    return this.academicService.getAdminGradeStudents();
  }

  @Patch("grades/admin/students/:enrollmentId/periods/:periodId")
  @Roles("super_admin")
  setStudentResultVisibility(
    @Param("enrollmentId") enrollmentId: string,
    @Param("periodId") periodId: string,
    @Body() dto: ToggleResultVisibilityDto,
  ) {
    return this.academicService.setStudentResultVisibility(enrollmentId, periodId, dto.isVisible);
  }

  @Patch("grades/admin/periods/:periodId/visibility")
  @Roles("super_admin")
  setBulkResultVisibility(
    @Param("periodId") periodId: string,
    @Body() dto: BulkToggleResultVisibilityDto,
  ) {
    return this.academicService.setBulkResultVisibility(periodId, dto);
  }

  @Get("results/student")
  @Roles("student")
  studentResult(
    @Req()
    request: {
      user?: { sub?: string | number; schoolId?: string | number };
    },
    @Query("period") period?: string,
  ) {
    if (!request.user?.sub || !request.user.schoolId) {
      throw new ForbiddenException("Session élève invalide.");
    }
    return this.academicService.getStudentResult(
      String(request.user.sub),
      String(request.user.schoolId),
      period ?? "",
    );
  }

  @Patch("grades/homeroom")
  @Roles("teacher")
  saveHomeroomGrades(
    @Req() request: { user?: { titularId?: string | number } },
    @Body() dto: SaveHomeroomGradesDto,
  ) {
    if (!request.user?.titularId) throw new ForbiddenException("Session titulaire invalide.");
    return this.academicService.saveHomeroomGrades(String(request.user.titularId), dto);
  }

  @Post("grades/homeroom/submit")
  @Roles("teacher")
  submitHomeroomGrades(
    @Req() request: { user?: { titularId?: string | number } },
    @Body() dto: { periodId?: string | number },
  ) {
    if (!request.user?.titularId) throw new ForbiddenException("Session titulaire invalide.");
    return this.academicService.submitHomeroomGrades(String(request.user.titularId), String(dto.periodId ?? ""));
  }

  @Get("grade-submissions")
  @Roles("director")
  directorGradeSubmissions(
    @Req() request: { user?: { schoolId?: string | number } },
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.listGradeSubmissions(String(request.user.schoolId));
  }

  @Get("grade-submissions/:id/gradebook")
  @Roles("director")
  directorGradebook(
    @Req() request: { user?: { schoolId?: string | number } },
    @Param("id") id: string,
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.getDirectorGradebook(id, String(request.user.schoolId));
  }

  @Patch("grade-submissions/:id/gradebook")
  @Roles("director")
  saveDirectorGradebook(
    @Req() request: { user?: { schoolId?: string | number } },
    @Param("id") id: string,
    @Body() dto: SaveHomeroomGradesDto,
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.saveDirectorGradebook(id, String(request.user.schoolId), dto);
  }

  @Sse("grade-submissions/events")
  @Roles("director")
  gradeSubmissionEvents(
    @Req() request: { user?: { schoolId?: string | number } },
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.streamGradeSubmissionEvents(String(request.user.schoolId));
  }

  @Sse("grade-submissions/homeroom/events")
  @Roles("teacher")
  homeroomGradeSubmissionEvents(
    @Req() request: { user?: { titularId?: string | number } },
  ) {
    if (!request.user?.titularId) throw new ForbiddenException("Session titulaire invalide.");
    return this.academicService.streamHomeroomGradeSubmissionEvents(String(request.user.titularId));
  }

  @Sse("grades/teacher/events")
  @Roles("teacher")
  teacherGradeEvents(
    @Req() request: { user?: { sub?: string | number } },
  ) {
    if (!request.user?.sub) throw new ForbiddenException("Session professeur invalide.");
    return this.academicService.streamTeacherGradeEvents(String(request.user.sub));
  }

  @Patch("grade-submissions/:id/reopen")
  @Roles("director")
  reopenGradeSubmission(
    @Req() request: { user?: { schoolId?: string | number } },
    @Param("id") id: string,
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.reopenGradeSubmission(id, String(request.user.schoolId));
  }

  @Patch("grade-submissions/:id/approve")
  @Roles("director")
  approveGradeSubmission(
    @Req() request: { user?: { schoolId?: string | number } },
    @Param("id") id: string,
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.approveGradeSubmission(id, String(request.user.schoolId));
  }

  @Patch("grade-submissions/:id/reject")
  @Roles("director")
  rejectGradeSubmission(
    @Req() request: { user?: { schoolId?: string | number } },
    @Param("id") id: string,
    @Body() dto: RejectGradeSubmissionDto,
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.rejectGradeSubmission(
      id,
      String(request.user.schoolId),
      dto.comment,
    );
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
  createOption(
    @Req() request: { user?: { role?: string; schoolId?: string | number } },
    @Body() dto: CreateOptionDto,
  ) {
    const schoolId = request.user?.role === "director" ? request.user.schoolId : dto.schoolId;
    if (!schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.createOption({ ...dto, schoolId: Number(schoolId) });
  }

  @Patch("options/:id")
  updateOption(
    @Req() request: { user?: { role?: string; schoolId?: string | number } },
    @Param("id") id: string,
    @Body() dto: UpdateOptionDto,
  ) {
    const schoolId = request.user?.role === "director" ? request.user.schoolId : dto.schoolId;
    if (!schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.updateOption(id, { ...dto, schoolId: Number(schoolId) }, String(schoolId));
  }

  @Delete("options/:id")
  deleteOption(
    @Req() request: { user?: { role?: string; schoolId?: string | number } },
    @Param("id") id: string,
    @Query("schoolId") schoolId?: string,
  ) {
    const authorizedSchoolId = request.user?.role === "director" ? request.user.schoolId : schoolId;
    if (!authorizedSchoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.deleteOption(id, String(authorizedSchoolId));
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

  @Post("classes/bulk")
  createClasses(
    @Req() request: { user?: { role?: string; schoolId?: string | number } },
    @Body() dto: BulkCreateClassesDto,
  ) {
    const schoolId =
      request.user?.role === "director"
        ? request.user.schoolId
        : dto.classes?.[0]?.schoolId;
    if (!schoolId) {
      throw new ForbiddenException("École obligatoire.");
    }
    return this.academicService.createClasses(dto, String(schoolId));
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

  @Post("teachers/bulk")
  createTeachers(
    @Req() request: { user?: { role?: string; schoolId?: string | number } },
    @Body() dto: BulkCreateTeachersDto,
  ) {
    const schoolId = request.user?.role === "director" ? request.user.schoolId : dto.teachers?.[0]?.schoolId;
    if (!schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.createTeachers(dto, String(schoolId));
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

  @Post("teachers/:id/reset-password")
  @Roles("director")
  resetTeacherPassword(
    @Req() request: { user?: { schoolId?: string | number } },
    @Param("id") id: string,
    @Body() dto: ResetTeacherPasswordDto,
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.resetTeacherPassword(id, String(request.user.schoolId), dto.password);
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

  @Post("courses/bulk")
  createCourses(
    @Req() request: { user?: { role?: string; schoolId?: string | number } },
    @Body() dto: BulkCreateCoursesDto,
  ) {
    const schoolId = request.user?.role === "director" ? request.user.schoolId : dto.courses?.[0]?.schoolId;
    if (!schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.createCourses(dto, String(schoolId));
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

  @Get("course-assignments/copy-preview/:sourceYearId")
  @Roles("director")
  previewCourseAssignmentsCopy(
    @Req() request: { user?: { schoolId?: string | number } },
    @Param("sourceYearId") sourceYearId: string,
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.previewCourseAssignmentsCopy(sourceYearId, String(request.user.schoolId));
  }

  @Post("course-assignments/copy")
  @Roles("director")
  copyCourseAssignments(
    @Req() request: { user?: { schoolId?: string | number } },
    @Body() dto: CopyCourseAssignmentsDto,
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.copyCourseAssignments(dto, String(request.user.schoolId));
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

  @Delete("homeroom-assignments/:id/with-gradebook")
  deleteHomeroomAssignmentWithGradebook(
    @Req() request: { user?: { schoolId?: string | number } },
    @Param("id") id: string,
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.deleteHomeroomAssignmentWithGradebook(id, String(request.user.schoolId));
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

  @Post("students/import")
  @Roles("director")
  importStudents(
    @Req() request: { user?: { schoolId?: string | number } },
    @Body() dto: ImportStudentsDto,
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.importStudents(dto.students, String(request.user.schoolId));
  }

  @Get("students/reenrollment-preview/:sourceYearId")
  @Roles("director")
  previewStudentReenrollment(
    @Req() request: { user?: { schoolId?: string | number } },
    @Param("sourceYearId") sourceYearId: string,
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.previewStudentReenrollment(sourceYearId, String(request.user.schoolId));
  }

  @Post("students/reenroll")
  @Roles("director")
  reenrollStudents(
    @Req() request: { user?: { schoolId?: string | number } },
    @Body() dto: ReenrollStudentsDto,
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.reenrollStudents(dto, String(request.user.schoolId));
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

  @Patch("school-years/:id/archive")
  @Roles("director")
  archiveSchoolYear(
    @Req() request: { user?: { schoolId?: string | number } },
    @Param("id") id: string,
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.archiveSchoolYear(id, String(request.user.schoolId));
  }

  @Get("academic-library")
  @Roles("director")
  academicLibrary(
    @Req() request: { user?: { schoolId?: string | number } },
    @Query("yearId") yearId?: string,
    @Query("classId") classId?: string,
    @Query("periodId") periodId?: string,
    @Query("search") search?: string,
  ) {
    if (!request.user?.schoolId) throw new ForbiddenException("École obligatoire.");
    return this.academicService.getAcademicLibrary(
      String(request.user.schoolId),
      { yearId, classId, periodId, search },
    );
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
  assignStudent(
    @Req() request: { user?: { role?: string; schoolId?: string | number } },
    @Body() dto: AssignStudentDto,
  ) {
    if (request.user?.role === "director" && !request.user.schoolId) {
      throw new ForbiddenException("École obligatoire.");
    }
    return this.academicService.assignStudent(
      dto,
      request.user?.role === "director" ? String(request.user.schoolId) : undefined,
    );
  }
}
