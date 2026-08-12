import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AcademicService } from "../academic/academic.service";
import {
  CreateSchoolDto,
  ResetSchoolPasswordDto,
  UpdateSchoolDto,
  UpdateSchoolStatusDto,
} from "../academic/dto/academic.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PrimarySuperAdminGuard } from "../auth/primary-superadmin.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SchoolsService } from "./schools.service";

@Controller("schools")
export class SchoolsController {
  constructor(
    private readonly schoolsService: SchoolsService,
    private readonly academicService: AcademicService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("super_admin")
  findAll() {
    return this.schoolsService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, PrimarySuperAdminGuard)
  @Roles("super_admin")
  create(@Body() dto: CreateSchoolDto) {
    return this.academicService.createSchool(dto);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("super_admin")
  update(@Param("id") id: string, @Body() dto: UpdateSchoolDto) {
    return this.academicService.updateSchool(id, dto);
  }

  @Patch(":id/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("super_admin")
  updateStatus(@Param("id") id: string, @Body() dto: UpdateSchoolStatusDto) {
    return this.academicService.updateSchoolStatus(id, dto.isActive);
  }

  @Post(":id/reset-password")
  @UseGuards(JwtAuthGuard, RolesGuard, PrimarySuperAdminGuard)
  @Roles("super_admin")
  resetPassword(@Param("id") id: string, @Body() dto: ResetSchoolPasswordDto) {
    return this.academicService.resetSchoolPassword(id, dto.password);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard, PrimarySuperAdminGuard)
  @Roles("super_admin")
  remove(@Param("id") id: string) {
    return this.academicService.deleteSchool(id);
  }
}
